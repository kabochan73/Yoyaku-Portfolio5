<?php

declare(strict_types=1);

namespace App\Domain\Reservations;

use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

final readonly class BookingRules
{
    public function __construct(
        public int $openHour,
        public int $closeHour,
        public int $minHours,
        public int $maxHours,
        public int $bookingWindowMonths,
    ) {}

    /**
     * @param  array{open_hour: int, close_hour: int, min_hours: int, max_hours: int, booking_window_months: int}  $rules
     */
    public static function fromConfig(array $rules): self
    {
        return new self(
            openHour: $rules['open_hour'],
            closeHour: $rules['close_hour'],
            minHours: $rules['min_hours'],
            maxHours: $rules['max_hours'],
            bookingWindowMonths: $rules['booking_window_months'],
        );
    }

    /**
     * @throws ValidationException
     */
    public function assertValidSlot(TimeSlot $slot, CarbonImmutable $now): void
    {
        $errors = [];

        if ($slot->startHour < $this->openHour || $slot->endHour > $this->closeHour) {
            $errors['start_hour'] = __('booking.outside_business_hours', [
                'open' => sprintf('%02d:00', $this->openHour),
                'close' => sprintf('%02d:00', $this->closeHour),
            ]);
        }

        if ($slot->hours() < $this->minHours || $slot->hours() > $this->maxHours) {
            $errors['end_hour'] = __('booking.invalid_length', [
                'min' => $this->minHours,
                'max' => $this->maxHours,
            ]);
        }

        $reason = $this->dateClosedReason($slot->date, $now);
        if ($reason === DayClosedReason::Past) {
            $errors['date'] = __('booking.past_date');
        } elseif ($reason === DayClosedReason::OutOfRange) {
            $errors['date'] = __('booking.out_of_range', [
                'date' => $this->bookableUntil($now)->format('n月j日'),
            ]);
        } elseif ($this->isPastSlot($slot->date, $slot->startHour, $now)) {
            $errors['start_hour'] ??= __('booking.already_started');
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    public function bookableUntil(CarbonImmutable $now): CarbonImmutable
    {
        return $now->startOfDay()->addMonthsNoOverflow($this->bookingWindowMonths);
    }

    public function dateClosedReason(CarbonImmutable $date, CarbonImmutable $now): ?DayClosedReason
    {
        $day = $date->startOfDay();

        if ($day->lt($now->startOfDay())) {
            return DayClosedReason::Past;
        }

        if ($day->gt($this->bookableUntil($now))) {
            return DayClosedReason::OutOfRange;
        }

        return null;
    }

    public function isPastSlot(CarbonImmutable $date, int $hour, CarbonImmutable $now): bool
    {
        return $date->startOfDay()->setTime($hour, 0)->lte($now);
    }
}
