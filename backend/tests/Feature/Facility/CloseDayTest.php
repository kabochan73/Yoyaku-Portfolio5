<?php

declare(strict_types=1);

use App\Domain\ConflictException;
use App\Domain\Facility\CloseDay;
use App\Domain\Facility\Events\HolidayChanged;
use App\Domain\Reservations\CancellationReason;
use App\Domain\Reservations\Events\ReservationCancelled;
use App\Domain\Reservations\ReservationStatus;
use App\Models\Holiday;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));
});

function closeDay(string $date, bool $cancelReservations = false): Holiday
{
    return app(CloseDay::class)->handle(CarbonImmutable::parse($date), '設備点検', $cancelReservations);
}

it('予約が無い日を臨時休業日にする', function () {
    Event::fake([HolidayChanged::class]);

    $holiday = closeDay('2026-10-09');

    expect($holiday->fresh())
        ->date->toDateString()->toBe('2026-10-09')
        ->reason->toBe('設備点検');
    Event::assertDispatched(HolidayChanged::class, fn ($event) => $event->date->toDateString() === '2026-10-09');
});

it('予約があり、確認が無ければ件数を返して何も変えない', function () {
    Reservation::factory()->count(2)->sequence(['start_hour' => 10, 'end_hour' => 12], ['start_hour' => 14, 'end_hour' => 16])
        ->phone()->create(['date' => '2026-10-09']);

    expect(fn () => closeDay('2026-10-09'))
        ->toThrow(function (ConflictException $e) {
            expect($e->errorCode)->toBe('holiday_has_reservations')
                ->and($e->extra)->toBe(['reservation_count' => 2]);
        });

    expect(Holiday::query()->count())->toBe(0)
        ->and(Reservation::query()->confirmed()->count())->toBe(2);
});

it('確認があれば、予約をすべて臨時休業日の理由でキャンセルして休業日にする', function () {
    Event::fake([HolidayChanged::class, ReservationCancelled::class]);
    Reservation::factory()->count(2)->sequence(['start_hour' => 10, 'end_hour' => 12], ['start_hour' => 14, 'end_hour' => 16])
        ->phone()->create(['date' => '2026-10-09']);

    closeDay('2026-10-09', cancelReservations: true);

    expect(Holiday::query()->count())->toBe(1)
        ->and(Reservation::query()->confirmed()->count())->toBe(0);
    Event::assertDispatchedTimes(ReservationCancelled::class, 2);
    Event::assertDispatched(
        ReservationCancelled::class,
        fn ($event) => $event->reason === CancellationReason::ByHoliday && $event->note === '設備点検',
    );
});

it('当日を休業日にするとき、開始済みの予約は残す', function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 14:00'));
    $started = Reservation::factory()->phone()->on('2026-10-06', 10, 12)->create();
    $upcoming = Reservation::factory()->phone()->on('2026-10-06', 16, 18)->create();

    expect(fn () => closeDay('2026-10-06'))
        ->toThrow(fn (ConflictException $e) => expect($e->extra)->toBe(['reservation_count' => 1]));

    closeDay('2026-10-06', cancelReservations: true);

    expect($started->fresh()->status)->toBe(ReservationStatus::Confirmed)
        ->and($upcoming->fresh()->status)->toBe(ReservationStatus::Cancelled);
});

it('同じ日はもう一度登録できない', function () {
    closeDay('2026-10-09');

    expect(fn () => closeDay('2026-10-09'))
        ->toThrow(fn (ConflictException $e) => expect($e->errorCode)->toBe('holiday_already_exists'));
});

it('途中で失敗したら、予約も休業日も元のまま', function () {
    Reservation::factory()->count(2)->sequence(['start_hour' => 10, 'end_hour' => 12], ['start_hour' => 14, 'end_hour' => 16])
        ->phone()->create(['date' => '2026-10-09']);
    $calls = 0;
    Event::listen(ReservationCancelled::class, function () use (&$calls) {
        if (++$calls === 2) {
            throw new RuntimeException('2件目で失敗');
        }
    });

    expect(fn () => closeDay('2026-10-09', cancelReservations: true))->toThrow(RuntimeException::class, '2件目で失敗');

    expect(Holiday::query()->count())->toBe(0)
        ->and(Reservation::query()->confirmed()->count())->toBe(2);
});

it('登録のときに日付のロックを取る', function () {
    DB::enableQueryLog();

    closeDay('2026-10-09');

    expect(array_column(DB::getQueryLog(), 'query'))->toContain('SELECT pg_advisory_xact_lock(?)');
});
