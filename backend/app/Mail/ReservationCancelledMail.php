<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Reservation;
use App\Reservations\CancellationReason;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class ReservationCancelledMail extends Mailable
{
    public function __construct(
        public readonly Reservation $reservation,
        public readonly CancellationReason $reason,
        public readonly ?string $note = null,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->reason === CancellationReason::ByHoliday
            ? '施設都合によりご予約をキャンセルいたしました'
            : 'ご予約をキャンセルしました';

        return new Envelope(
            subject: '【'.config('facility.name').'】'.$subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: $this->reason === CancellationReason::ByHoliday
                ? 'mail.reservation-cancelled-by-holiday'
                : 'mail.reservation-cancelled',
        );
    }
}
