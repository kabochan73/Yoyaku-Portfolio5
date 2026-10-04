<?php

declare(strict_types=1);

namespace App\Domain\Reservations;

use App\Domain\Calendar\CalendarCache;
use App\Domain\ConflictException;
use App\Domain\Facility\ClosedDays;
use App\Domain\Reservations\Events\ReservationCreated;
use App\Models\Price;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class CreateReservation
{
    public function __construct(
        private BookingRules $rules,
        private ClosedDays $closedDays,
        private CalendarCache $calendarCache,
    ) {}

    public function forMember(User $user, TimeSlot $slot): Reservation
    {
        return $this->create($slot, $user->name, $user);
    }

    public function forPhone(string $bookerName, TimeSlot $slot): Reservation
    {
        return $this->create($slot, $bookerName, null);
    }

    private function create(TimeSlot $slot, string $bookerName, ?User $user): Reservation
    {
        try {
            return DB::transaction(function () use ($slot, $bookerName, $user): Reservation {
                Reservation::lockDate($slot->date);

                $this->rules->assertValidSlot($slot, now()->toImmutable());
                $this->assertOpen($slot);

                $reservation = $this->insert($slot, $bookerName, $user);

                ReservationCreated::dispatch($reservation);

                return $reservation;
            });
        } catch (ConflictException $e) {
            if ($e->errorCode === 'slot_taken') {
                $this->calendarCache->forgetDay($slot->date);
            }

            throw $e;
        }
    }

    private function assertOpen(TimeSlot $slot): void
    {
        $reason = $this->closedDays->reasonFor($slot->date);

        if ($reason !== null) {
            throw ValidationException::withMessages([
                'date' => __("booking.{$reason->value}"),
            ]);
        }
    }

    private function insert(TimeSlot $slot, string $bookerName, ?User $user): Reservation
    {
        try {
            return Reservation::query()->create([
                'user_id' => $user?->id,
                'date' => $slot->date->toDateString(),
                'start_hour' => $slot->startHour,
                'end_hour' => $slot->endHour,
                'status' => ReservationStatus::Confirmed,
                'booker_name' => $bookerName,
                'price' => Price::table()->priceFor($slot),
            ]);
        } catch (QueryException $e) {
            throw $this->toConflict($e);
        }
    }

    private function toConflict(QueryException $e): QueryException|ConflictException
    {
        $message = $e->getMessage();

        if ($e->getCode() === '23P01' && str_contains($message, 'reservations_no_overlap')) {
            return ConflictException::slotTaken();
        }

        if ($e->getCode() === '23505' && str_contains($message, 'reservations_user_date_confirmed_unique')) {
            return ConflictException::alreadyBookedThatDay();
        }

        return $e;
    }
}
