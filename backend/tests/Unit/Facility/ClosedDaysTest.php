<?php

declare(strict_types=1);

use App\Facility\ClosedDays;
use App\Reservations\DayClosedReason;
use Carbon\CarbonImmutable;

it('B6: 定休日・臨時休業日の判定', function (string $date, bool $isHoliday, ?DayClosedReason $reason) {
    expect(ClosedDays::reason(CarbonImmutable::parse($date), [1], $isHoliday))->toBe($reason);
})->with([
    '定休日（月曜）' => ['2026-10-12', false, DayClosedReason::RegularHoliday],
    '臨時休業日' => ['2026-10-13', true, DayClosedReason::Holiday],
    '定休日と臨時休業日が重なる → 定休日' => ['2026-10-12', true, DayClosedReason::RegularHoliday],
    '営業日' => ['2026-10-13', false, null],
]);

it('定休日が無ければ、どの曜日も営業日', function () {
    expect(ClosedDays::reason(CarbonImmutable::parse('2026-10-12'), [], false))->toBeNull();
});
