<?php

declare(strict_types=1);

use App\Domain\Calendar\CalendarCache;
use App\Domain\Calendar\Listeners\ForgetCalendarCache;
use App\Domain\Facility\CloseDay;
use App\Domain\Facility\Events\FacilityChanged;
use App\Domain\Facility\Events\HolidayChanged;
use App\Domain\Facility\PriceType;
use App\Domain\Facility\ReopenDay;
use App\Domain\Facility\UpdateRegularHolidays;
use App\Domain\Reservations\CancellationReason;
use App\Domain\Reservations\CancelReservation;
use App\Domain\Reservations\CreateReservation;
use App\Domain\Reservations\Events\ReservationCancelled;
use App\Domain\Reservations\Events\ReservationCreated;
use App\Domain\Reservations\TimeSlot;
use App\Models\Holiday;
use App\Models\Price;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));
    app(CalendarCache::class)->days(CarbonImmutable::parse('2026-10-09'), CarbonImmutable::parse('2026-10-10'));
    app(CalendarCache::class)->regularHolidays();
});

it('4つのイベントに登録されている', function (string $event, string $method) {
    Event::fake();

    Event::assertListening($event, ForgetCalendarCache::class.'@'.$method);
})->with([
    [ReservationCreated::class, 'handleReservationCreated'],
    [ReservationCancelled::class, 'handleReservationCancelled'],
    [HolidayChanged::class, 'handleHolidayChanged'],
    [FacilityChanged::class, 'handleFacilityChanged'],
]);

it('予約を作ると、その日のキャッシュだけを消す', function () {
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);

    app(CreateReservation::class)->forPhone('佐藤（電話）', TimeSlot::on('2026-10-09', 10, 12));

    expect(Cache::has('calendar:day:2026-10-09'))->toBeFalse()
        ->and(Cache::has('calendar:day:2026-10-10'))->toBeTrue();
});

it('予約をキャンセルすると、その日のキャッシュを消す', function () {
    $reservation = Reservation::factory()->phone()->on('2026-10-09', 10, 12)->create();

    app(CancelReservation::class)->handle($reservation, CancellationReason::ByAdmin);

    expect(Cache::has('calendar:day:2026-10-09'))->toBeFalse();
});

it('臨時休業日を登録・削除すると、その日のキャッシュを消す', function () {
    app(CloseDay::class)->handle(CarbonImmutable::parse('2026-10-09'), null, false);
    expect(Cache::has('calendar:day:2026-10-09'))->toBeFalse();

    app(CalendarCache::class)->days(CarbonImmutable::parse('2026-10-09'), CarbonImmutable::parse('2026-10-09'));
    app(ReopenDay::class)->handle(Holiday::query()->sole());
    expect(Cache::has('calendar:day:2026-10-09'))->toBeFalse();
});

it('定休日を変えると、定休日の一覧のキャッシュを消す', function () {
    app(UpdateRegularHolidays::class)->handle([3]);

    expect(Cache::has('calendar:regular_holidays'))->toBeFalse();
});

it('ロールバックしたときは消さない', function () {
    Reservation::factory()->count(2)->sequence(['start_hour' => 10, 'end_hour' => 12], ['start_hour' => 14, 'end_hour' => 16])
        ->phone()->create(['date' => '2026-10-09']);
    $calls = 0;
    Event::listen(ReservationCancelled::class, function () use (&$calls) {
        if (++$calls === 2) {
            throw new RuntimeException('2件目で失敗');
        }
    });

    expect(fn () => app(CloseDay::class)->handle(CarbonImmutable::parse('2026-10-09'), null, true))
        ->toThrow(RuntimeException::class);

    expect(Cache::has('calendar:day:2026-10-09'))->toBeTrue();
});
