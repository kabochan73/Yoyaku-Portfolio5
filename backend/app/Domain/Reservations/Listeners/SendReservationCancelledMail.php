<?php

declare(strict_types=1);

namespace App\Domain\Reservations\Listeners;

use App\Domain\Reservations\Events\ReservationCancelled;
use App\Mail\ReservationCancelledMail;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Support\Facades\Mail;

final class SendReservationCancelledMail implements ShouldQueueAfterCommit
{
    public function handle(ReservationCancelled $event): void
    {
        $user = $event->reservation->user;

        if ($user === null) {
            return;
        }

        Mail::to($user)->send(new ReservationCancelledMail($event->reservation, $event->reason, $event->note));
    }
}
