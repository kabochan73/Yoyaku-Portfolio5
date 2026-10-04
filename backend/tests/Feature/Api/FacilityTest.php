<?php

declare(strict_types=1);

use App\Domain\Facility\PriceType;
use App\Models\Price;
use App\Models\RegularHoliday;

beforeEach(function () {
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
    RegularHoliday::query()->create(['day_of_week' => 3]);
    RegularHoliday::query()->create(['day_of_week' => 1]);
});

it('ログインしていなくても施設情報を返す', function () {
    $this->getJson('/api/facility')
        ->assertOk()
        ->assertExactJson([
            'data' => [
                'name' => 'FUTSAL PARK',
                'phone' => config('facility.phone'),
                'address' => config('facility.address'),
                'email' => config('facility.email'),
                'rules' => [
                    'open_hour' => 10,
                    'close_hour' => 22,
                    'min_hours' => 2,
                    'max_hours' => 4,
                    'booking_window_months' => 1,
                ],
                'prices' => ['weekday' => 4000, 'weekend' => 5000],
                'regular_holidays' => [1, 3],
            ],
        ]);
});

it('ルールは config/facility.php の値を返す', function () {
    config(['facility.rules.open_hour' => 9, 'facility.rules.max_hours' => 3]);

    $this->getJson('/api/facility')
        ->assertJsonPath('data.rules.open_hour', 9)
        ->assertJsonPath('data.rules.max_hours', 3);
});

it('料金と定休日は DB の今の値を返す', function () {
    Price::query()->where('type', PriceType::Weekday)->update(['amount_per_hour' => 4500]);
    RegularHoliday::query()->delete();

    $this->getJson('/api/facility')
        ->assertJsonPath('data.prices.weekday', 4500)
        ->assertJsonPath('data.regular_holidays', []);
});
