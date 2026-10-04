<?php

declare(strict_types=1);

namespace App\Domain\Calendar;

use App\Domain\Facility\ClosedDays;
use App\Domain\Reservations\BookingRules;
use App\Domain\Reservations\DayClosedReason;
use App\Domain\Reservations\ReservationStatus;
use App\Models\Reservation;
use Carbon\CarbonImmutable;

/**
 * @phpstan-import-type ReservationFact from DayFacts
 */
final readonly class CalendarQuery
{
    public function __construct(
        private CalendarCache $cache,
        private BookingRules $rules,
    ) {}

    /**
     * @return list<CalendarDay>
     */
    public function forPublic(CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $now): array
    {
        $regularHolidays = $this->cache->regularHolidays();

        $days = [];
        foreach ($this->cache->days($from, $to) as $date => $facts) {
            $date = CarbonImmutable::parse($date);
            $closedReason = $this->closedReason($date, $facts, $regularHolidays, $now);

            $days[] = new CalendarDay(
                date: $date,
                closedReason: $closedReason,
                slots: $closedReason === null ? $this->publicSlots($date, $facts, $now) : [],
            );
        }

        return $days;
    }

    /**
     * @return list<AdminCalendarDay>
     */
    public function forAdmin(CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $now): array
    {
        $regularHolidays = $this->cache->regularHolidays();
        $oldestKept = $now->startOfDay()->subMonthsNoOverflow((int) config('facility.rules.admin_lookback_months'));

        $days = [];
        foreach ($this->cache->days($from, $to) as $date => $facts) {
            $date = CarbonImmutable::parse($date);
            $closedReason = $this->closedReason($date, $facts, $regularHolidays, $now);

            if ($date->lt($oldestKept)) {
                $days[] = new AdminCalendarDay($date, $closedReason, slots: [], reservations: []);

                continue;
            }

            $days[] = new AdminCalendarDay(
                date: $date,
                closedReason: $closedReason,
                slots: $this->adminSlots($date, $facts, $closedReason, $now),
                reservations: array_map(
                    fn (array $fact): Reservation => $this->toReservation($date, $fact),
                    $facts->reservations,
                ),
            );
        }

        return $days;
    }

    /**
     * @param  list<int>  $regularHolidays
     */
    private function closedReason(CarbonImmutable $date, DayFacts $facts, array $regularHolidays, CarbonImmutable $now): ?DayClosedReason
    {
        return $this->rules->dateClosedReason($date, $now)
            ?? ClosedDays::reason($date, $regularHolidays, $facts->isHoliday);
    }

    /**
     * @return list<CalendarSlot>
     */
    private function publicSlots(CarbonImmutable $date, DayFacts $facts, CarbonImmutable $now): array
    {
        $slots = [];
        for ($hour = $this->rules->openHour; $hour < $this->rules->closeHour; $hour++) {
            $status = match (true) {
                $facts->isBooked($hour) => SlotStatus::Booked,
                $this->rules->isPastSlot($date, $hour, $now) => SlotStatus::Past,
                default => SlotStatus::Available,
            };
            $slots[] = new CalendarSlot($hour, $status);
        }

        return $slots;
    }

    /**
     * @return list<CalendarSlot>
     */
    private function adminSlots(CarbonImmutable $date, DayFacts $facts, ?DayClosedReason $closedReason, CarbonImmutable $now): array
    {
        $slots = [];
        for ($hour = $this->rules->openHour; $hour < $this->rules->closeHour; $hour++) {
            $reservation = $facts->reservationAt($hour);
            $status = match (true) {
                $reservation !== null => SlotStatus::Booked,
                $closedReason !== null => SlotStatus::Closed,
                $this->rules->isPastSlot($date, $hour, $now) => SlotStatus::Past,
                default => SlotStatus::Available,
            };
            $slots[] = new CalendarSlot($hour, $status, $reservation['id'] ?? null);
        }

        return $slots;
    }

    /**
     * @param  ReservationFact  $fact
     */
    private function toReservation(CarbonImmutable $date, array $fact): Reservation
    {
        $reservation = new Reservation;
        $reservation->forceFill([
            ...$fact,
            'date' => $date->toDateString(),
            'status' => ReservationStatus::Confirmed,
        ]);
        $reservation->exists = true;

        return $reservation;
    }
}
