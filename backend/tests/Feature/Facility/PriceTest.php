<?php

declare(strict_types=1);

use App\Domain\Facility\PriceType;
use App\Models\Price;

it('DB の料金から料金表を作る', function () {
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4500]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5500]);

    $table = Price::table();

    expect($table->weekday)->toBe(4500)
        ->and($table->weekend)->toBe(5500);
});

it('料金の行が足りなければ止まる', function () {
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);

    expect(fn () => Price::table())->toThrow(RuntimeException::class);
});
