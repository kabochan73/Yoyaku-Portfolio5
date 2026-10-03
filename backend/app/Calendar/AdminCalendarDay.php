<?php

declare(strict_types=1);

namespace App\Calendar;

use App\Models\Reservation;
use App\Reservations\DayClosedReason;
use Carbon\CarbonImmutable;

final readonly class AdminCalendarDay
{
    /**
     * @param  list<CalendarSlot>  $slots
     * @param  list<Reservation>  $reservations
     */
    public function __construct(
        public CarbonImmutable $date,
        public ?DayClosedReason $closedReason,
        public array $slots,
        public array $reservations,
    ) {}
}
