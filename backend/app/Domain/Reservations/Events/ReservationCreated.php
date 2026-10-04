<?php

declare(strict_types=1);

namespace App\Domain\Reservations\Events;

use App\Models\Reservation;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class ReservationCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Reservation $reservation,
    ) {}
}
