<?php

declare(strict_types=1);

namespace App\Domain\Calendar;

use App\Domain\Reservations\DayClosedReason;
use Carbon\CarbonImmutable;

final readonly class CalendarDay
{
    /**
     * @param  list<CalendarSlot>  $slots
     */
    public function __construct(
        public CarbonImmutable $date,
        public ?DayClosedReason $closedReason,
        public array $slots,
    ) {}
}
