<?php

declare(strict_types=1);

namespace App\Domain;

use RuntimeException;

final class ConflictException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $extra  レスポンスに足す場面ごとの情報
     */
    private function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly array $extra = [],
    ) {
        parent::__construct($message);
    }

    public static function slotTaken(): self
    {
        return new self('slot_taken', (string) __('conflict.slot_taken'));
    }

    public static function alreadyBookedThatDay(): self
    {
        return new self('already_booked_that_day', (string) __('conflict.already_booked_that_day'));
    }

    public static function reservationNotCancellable(): self
    {
        return new self('reservation_not_cancellable', (string) __('conflict.reservation_not_cancellable'));
    }

    public static function holidayHasReservations(int $count): self
    {
        return new self(
            'holiday_has_reservations',
            (string) __('conflict.holiday_has_reservations', ['count' => $count]),
            ['reservation_count' => $count],
        );
    }

    public static function holidayAlreadyExists(): self
    {
        return new self('holiday_already_exists', (string) __('conflict.holiday_already_exists'));
    }
}
