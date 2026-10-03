<?php

declare(strict_types=1);

namespace App\Reservations;

enum ReservationStatus: string
{
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
}
