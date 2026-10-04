<?php

declare(strict_types=1);

namespace App\Domain\Reservations;

enum ReservationStatus: string
{
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
}
