<?php

declare(strict_types=1);

namespace App\Calendar;

/**
 * 1日分の、書き込みでしか変わらない事実。時間とともに変わる判定は入れない
 *
 * @phpstan-type ReservationFact array{id: int, start_hour: int, end_hour: int, booker_name: string, user_id: int|null, price: int}
 * @phpstan-type DayFactsArray array{reservations: list<ReservationFact>, is_holiday: bool, holiday_reason: string|null}
 */
final readonly class DayFacts
{
    /**
     * @param  list<ReservationFact>  $reservations
     */
    public function __construct(
        public array $reservations,
        public bool $isHoliday,
        public ?string $holidayReason,
    ) {}

    /**
     * @param  DayFactsArray  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            reservations: $data['reservations'],
            isHoliday: $data['is_holiday'],
            holidayReason: $data['holiday_reason'],
        );
    }

    /**
     * @return DayFactsArray
     */
    public function toArray(): array
    {
        return [
            'reservations' => $this->reservations,
            'is_holiday' => $this->isHoliday,
            'holiday_reason' => $this->holidayReason,
        ];
    }

    public function isBooked(int $hour): bool
    {
        return $this->reservationAt($hour) !== null;
    }

    /**
     * @return ReservationFact|null
     */
    public function reservationAt(int $hour): ?array
    {
        foreach ($this->reservations as $reservation) {
            if ($reservation['start_hour'] <= $hour && $hour < $reservation['end_hour']) {
                return $reservation;
            }
        }

        return null;
    }
}
