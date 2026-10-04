<?php

declare(strict_types=1);

namespace App\Domain\Reservations;

enum DayClosedReason: string
{
    case Past = 'past';
    case OutOfRange = 'out_of_range';
    case RegularHoliday = 'regular_holiday';
    case Holiday = 'holiday';
}
