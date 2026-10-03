<?php

declare(strict_types=1);

use App\Facility\PriceTable;
use App\Facility\PriceType;
use App\Reservations\TimeSlot;

it('B9: 料金はその日の単価 × 時間数', function (string $date, int $start, int $end, int $price) {
    $table = new PriceTable(weekday: 4000, weekend: 5000);

    expect($table->priceFor(TimeSlot::on($date, $start, $end)))->toBe($price);
})->with([
    '平日 2時間' => ['2026-10-09', 10, 12, 8000],
    '土曜 4時間' => ['2026-10-10', 10, 14, 20000],
    '日曜 3時間' => ['2026-10-11', 18, 21, 15000],
]);

it('土日は Weekend、それ以外は Weekday', function (string $date, PriceType $type) {
    $table = new PriceTable(weekday: 4000, weekend: 5000);

    expect($table->typeFor(TimeSlot::on($date, 10, 12)))->toBe($type);
})->with([
    '金曜' => ['2026-10-09', PriceType::Weekday],
    '土曜' => ['2026-10-10', PriceType::Weekend],
    '日曜' => ['2026-10-11', PriceType::Weekend],
    '月曜' => ['2026-10-12', PriceType::Weekday],
]);
