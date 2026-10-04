<?php

declare(strict_types=1);

namespace App\Domain\Calendar;

enum SlotStatus: string
{
    case Available = 'available';
    case Booked = 'booked';
    case Past = 'past';
    case Closed = 'closed';
}
