<?php

declare(strict_types=1);

namespace App\Reservations;

use App\Exceptions\ConflictException;
use App\Models\Reservation;
use App\Reservations\Events\ReservationCancelled;
use Illuminate\Support\Facades\DB;

final readonly class CancelReservation
{
    public function handle(Reservation $reservation, CancellationReason $reason, ?string $note = null): Reservation
    {
        return DB::transaction(function () use ($reservation, $reason, $note): Reservation {
            $locked = Reservation::query()->lockForUpdate()->findOrFail($reservation->id);
            $now = now()->toImmutable();

            if (! $locked->isCancellable($now)) {
                throw ConflictException::reservationNotCancellable();
            }

            $locked->cancel($now);

            ReservationCancelled::dispatch($locked, $reason, $note);

            return $locked;
        });
    }
}
