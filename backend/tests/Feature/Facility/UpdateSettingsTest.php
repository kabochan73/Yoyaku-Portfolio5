<?php

declare(strict_types=1);

use App\Facility\Events\FacilityChanged;
use App\Facility\PriceType;
use App\Facility\UpdatePrices;
use App\Facility\UpdateRegularHolidays;
use App\Models\Price;
use App\Models\RegularHoliday;
use App\Models\Reservation;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    Event::fake([FacilityChanged::class]);
});

describe('料金の更新', function () {
    it('平日・土日の単価を変えて、FacilityChanged を発行する', function () {
        Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
        Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);

        app(UpdatePrices::class)->handle(weekday: 4500, weekend: 5500);

        expect(Price::table())
            ->weekday->toBe(4500)
            ->weekend->toBe(5500);
        Event::assertDispatched(FacilityChanged::class);
    });

    it('料金の行が無ければ作る', function () {
        app(UpdatePrices::class)->handle(weekday: 4500, weekend: 5500);

        expect(Price::query()->count())->toBe(2);
    });

    it('B9: すでにある予約の金額は変えない', function () {
        $reservation = Reservation::factory()->create(['price' => 8000]);

        app(UpdatePrices::class)->handle(weekday: 9000, weekend: 9000);

        expect($reservation->fresh()->price)->toBe(8000);
    });
});

describe('定休日の更新', function () {
    it('定休日を入れ替えて、FacilityChanged を発行する', function () {
        RegularHoliday::query()->create(['day_of_week' => 1]);

        app(UpdateRegularHolidays::class)->handle([3, 0]);

        expect(RegularHoliday::days())->toBe([0, 3]);
        Event::assertDispatched(FacilityChanged::class);
    });

    it('空にすると定休日なし', function () {
        RegularHoliday::query()->create(['day_of_week' => 1]);

        app(UpdateRegularHolidays::class)->handle([]);

        expect(RegularHoliday::days())->toBe([]);
    });

    it('同じ曜日が重なっても1行にする', function () {
        app(UpdateRegularHolidays::class)->handle([3, 3]);

        expect(RegularHoliday::days())->toBe([3]);
    });

    it('定休日にした曜日の予約は残す', function () {
        $reservation = Reservation::factory()->phone()->on('2026-10-14', 10, 12)->create();

        app(UpdateRegularHolidays::class)->handle([3]);

        expect($reservation->fresh())->not->toBeNull();
    });
});
