<?php

declare(strict_types=1);

namespace App\Calendar\Listeners;

use App\Calendar\CalendarCache;
use App\Facility\Events\FacilityChanged;
use App\Facility\Events\HolidayChanged;
use App\Reservations\Events\ReservationCancelled;
use App\Reservations\Events\ReservationCreated;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

final readonly class ForgetCalendarCache implements ShouldHandleEventsAfterCommit
{
    public function __construct(
        private CalendarCache $cache,
    ) {}

    public function handleReservationCreated(ReservationCreated $event): void
    {
        $this->cache->forgetDay($event->reservation->date);
    }

    public function handleReservationCancelled(ReservationCancelled $event): void
    {
        $this->cache->forgetDay($event->reservation->date);
    }

    public function handleHolidayChanged(HolidayChanged $event): void
    {
        $this->cache->forgetDay($event->date);
    }

    public function handleFacilityChanged(FacilityChanged $event): void
    {
        $this->cache->forgetRegularHolidays();
    }
}
