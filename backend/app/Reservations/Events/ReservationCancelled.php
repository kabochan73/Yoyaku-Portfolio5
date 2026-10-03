<?php

declare(strict_types=1);

namespace App\Reservations\Events;

use App\Models\Reservation;
use App\Reservations\CancellationReason;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class ReservationCancelled
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Reservation $reservation,
        public readonly CancellationReason $reason,
        public readonly ?string $note = null,
    ) {}
}
