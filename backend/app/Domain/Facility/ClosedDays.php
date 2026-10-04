<?php

declare(strict_types=1);

namespace App\Domain\Facility;

use App\Domain\Reservations\DayClosedReason;
use App\Models\Holiday;
use App\Models\RegularHoliday;
use Carbon\CarbonImmutable;

final class ClosedDays
{
    /**
     * @param  list<int>  $regularHolidays  定休日の曜日（0 = 日曜 … 6 = 土曜）
     */
    public static function reason(CarbonImmutable $date, array $regularHolidays, bool $isHoliday): ?DayClosedReason
    {
        if (in_array($date->dayOfWeek, $regularHolidays, true)) {
            return DayClosedReason::RegularHoliday;
        }

        if ($isHoliday) {
            return DayClosedReason::Holiday;
        }

        return null;
    }

    public function reasonFor(CarbonImmutable $date): ?DayClosedReason
    {
        $isHoliday = Holiday::query()->where('date', $date->toDateString())->exists();

        return self::reason($date, RegularHoliday::days(), $isHoliday);
    }
}
