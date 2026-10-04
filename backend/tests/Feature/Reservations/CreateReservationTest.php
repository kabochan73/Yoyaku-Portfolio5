<?php

declare(strict_types=1);

use App\Domain\Calendar\CalendarCache;
use App\Domain\ConflictException;
use App\Domain\Facility\PriceType;
use App\Domain\Reservations\CreateReservation;
use App\Domain\Reservations\Events\ReservationCreated;
use App\Domain\Reservations\TimeSlot;
use App\Models\Holiday;
use App\Models\Price;
use App\Models\RegularHoliday;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
    RegularHoliday::query()->create(['day_of_week' => 1]);
});

function createReservation(): CreateReservation
{
    return app(CreateReservation::class);
}

/**
 * @return array<string, list<string>>
 */
function validationErrorsOf(Closure $callback): array
{
    try {
        $callback();
    } catch (ValidationException $e) {
        return $e->errors();
    }

    return [];
}

describe('会員の予約', function () {
    it('B9・B10: 料金と予約者名を入れて作り、ReservationCreated を発行する', function (string $date, int $price) {
        Event::fake([ReservationCreated::class]);
        $user = User::factory()->create(['name' => '山田太郎']);

        $reservation = createReservation()->forMember($user, TimeSlot::on($date, 10, 12));

        expect($reservation->fresh())
            ->user_id->toBe($user->id)
            ->booker_name->toBe('山田太郎')
            ->price->toBe($price);
        Event::assertDispatched(ReservationCreated::class, fn ($event) => $event->reservation->is($reservation));
    })->with([
        '平日' => ['2026-10-09', 8000],
        '土曜' => ['2026-10-10', 10000],
    ]);

    it('B3: 営業時間外は作れない', function () {
        $errors = validationErrorsOf(fn () => createReservation()->forMember(User::factory()->create(), TimeSlot::on('2026-10-09', 9, 11)));

        expect($errors)->toHaveKey('start_hour')
            ->and(Reservation::query()->count())->toBe(0);
    });

    it('B5: 過ぎた時刻は作れない', function () {
        $this->travelTo(new DateTimeImmutable('2026-10-06 15:00'));

        $errors = validationErrorsOf(fn () => createReservation()->forMember(User::factory()->create(), TimeSlot::on('2026-10-06', 14, 16)));

        expect($errors)->toBe(['start_hour' => ['開始時刻を過ぎています。']]);
    });

    it('B6: 定休日・臨時休業日は作れない', function (string $date, string $message) {
        Holiday::query()->create(['date' => '2026-10-08']);

        $errors = validationErrorsOf(fn () => createReservation()->forMember(User::factory()->create(), TimeSlot::on($date, 10, 12)));

        expect($errors)->toBe(['date' => [$message]]);
    })->with([
        '定休日' => ['2026-10-12', '定休日のため予約できません。'],
        '臨時休業日' => ['2026-10-08', '臨時休業日のため予約できません。'],
    ]);

    it('B6: 予約のときはキャッシュではなく DB の休業日を見る', function () {
        app(CalendarCache::class)->days(CarbonImmutable::parse('2026-10-09'), CarbonImmutable::parse('2026-10-09'));
        Holiday::query()->create(['date' => '2026-10-09']);

        $errors = validationErrorsOf(fn () => createReservation()->forMember(User::factory()->create(), TimeSlot::on('2026-10-09', 10, 12)));

        expect($errors)->toHaveKey('date');
    });

    it('B7: 重なる時間帯は slot_taken になり、その日のキャッシュを消す', function () {
        Reservation::factory()->phone()->on('2026-10-09', 10, 12)->create();
        app(CalendarCache::class)->days(CarbonImmutable::parse('2026-10-09'), CarbonImmutable::parse('2026-10-10'));

        expect(fn () => createReservation()->forMember(User::factory()->create(), TimeSlot::on('2026-10-09', 11, 13)))
            ->toThrow(fn (ConflictException $e) => expect($e->errorCode)->toBe('slot_taken'));

        expect(Cache::has('calendar:day:2026-10-09'))->toBeFalse()
            ->and(Cache::has('calendar:day:2026-10-10'))->toBeTrue();
    });

    it('B8: 同じ日の2件目は already_booked_that_day', function () {
        $user = User::factory()->create();
        createReservation()->forMember($user, TimeSlot::on('2026-10-09', 10, 12));

        expect(fn () => createReservation()->forMember($user, TimeSlot::on('2026-10-09', 14, 16)))
            ->toThrow(fn (ConflictException $e) => expect($e->errorCode)->toBe('already_booked_that_day'));
    });

    it('日本時間で判定する（UTC では前日の朝8時に、その日の枠を予約できる）', function () {
        $this->travelTo(new DateTimeImmutable('2026-10-06 08:00', new DateTimeZone('Asia/Tokyo')));

        $reservation = createReservation()->forMember(User::factory()->create(), TimeSlot::on('2026-10-06', 10, 12));

        expect($reservation->exists)->toBeTrue();
    });

    it('予約のときに日付のロックを取る', function () {
        DB::enableQueryLog();

        createReservation()->forMember(User::factory()->create(), TimeSlot::on('2026-10-09', 10, 12));

        $queries = array_column(DB::getQueryLog(), 'query');
        expect($queries)->toContain('SELECT pg_advisory_xact_lock(?)');
    });
});

describe('電話予約', function () {
    it('予約者名を入れ、会員と紐づけずに作る', function () {
        $reservation = createReservation()->forPhone('佐藤（電話）', TimeSlot::on('2026-10-09', 10, 12));

        expect($reservation->fresh())
            ->user_id->toBeNull()
            ->booker_name->toBe('佐藤（電話）')
            ->price->toBe(8000);
    });

    it('会員と同じルールで弾く', function (string $date) {
        $errors = validationErrorsOf(fn () => createReservation()->forPhone('佐藤（電話）', TimeSlot::on($date, 10, 12)));

        expect($errors)->toHaveKey('date');
    })->with([
        'B4: 1か月より先' => ['2026-11-07'],
        'B6: 定休日' => ['2026-10-12'],
    ]);

    it('B8 は当てない: 同じ日に2件作れる', function () {
        createReservation()->forPhone('佐藤（電話）', TimeSlot::on('2026-10-09', 10, 12));
        createReservation()->forPhone('佐藤（電話）', TimeSlot::on('2026-10-09', 14, 16));

        expect(Reservation::query()->count())->toBe(2);
    });
});
