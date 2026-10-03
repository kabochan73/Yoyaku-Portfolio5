<?php

declare(strict_types=1);

use App\Facility\ClosedDays;
use App\Models\Holiday;
use App\Models\RegularHoliday;
use App\Reservations\DayClosedReason;
use Carbon\CarbonImmutable;

beforeEach(function () {
    RegularHoliday::query()->create(['day_of_week' => 1]);
    Holiday::query()->create(['date' => '2026-10-14', 'reason' => '設備点検']);
});

it('B6: DB の定休日・臨時休業日を見て判定する', function (string $date, ?DayClosedReason $reason) {
    expect((new ClosedDays)->reasonFor(CarbonImmutable::parse($date)))->toBe($reason);
})->with([
    '定休日（月曜）' => ['2026-10-12', DayClosedReason::RegularHoliday],
    '臨時休業日' => ['2026-10-14', DayClosedReason::Holiday],
    '営業日' => ['2026-10-13', null],
]);

it('定休日の曜日を小さい順に返す', function () {
    RegularHoliday::query()->create(['day_of_week' => 3]);
    RegularHoliday::query()->create(['day_of_week' => 0]);

    expect(RegularHoliday::days())->toBe([0, 1, 3]);
});
