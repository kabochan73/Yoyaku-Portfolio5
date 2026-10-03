<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class ReservationConfirmedMail extends Mailable
{
    public function __construct(
        public readonly Reservation $reservation,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '【'.config('facility.name').'】ご予約を承りました',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.reservation-confirmed');
    }
}
