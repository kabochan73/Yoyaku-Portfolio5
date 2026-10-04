<?php

declare(strict_types=1);

namespace App\Domain\Reservations\Listeners;

use App\Domain\Reservations\Events\ReservationCreated;
use App\Mail\ReservationConfirmedMail;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Support\Facades\Mail;

final class SendReservationConfirmedMail implements ShouldQueueAfterCommit
{
    public function handle(ReservationCreated $event): void
    {
        $user = $event->reservation->user;

        if ($user === null) {
            return;
        }

        Mail::to($user)->send(new ReservationConfirmedMail($event->reservation));
    }
}
