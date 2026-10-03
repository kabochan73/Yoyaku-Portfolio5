<?php

declare(strict_types=1);

namespace App\Calendar;

final readonly class CalendarSlot
{
    public function __construct(
        public int $hour,
        public SlotStatus $status,
        public ?int $reservationId = null,
    ) {}
}
