<?php

declare(strict_types=1);

namespace App\Domain\Reservations;

use Carbon\CarbonImmutable;

final readonly class TimeSlot
{
    public CarbonImmutable $date;

    public function __construct(
        CarbonImmutable $date,
        public int $startHour,
        public int $endHour,
    ) {
        $this->date = $date->startOfDay();
    }

    public static function on(string $date, int $startHour, int $endHour): self
    {
        return new self(CarbonImmutable::parse($date), $startHour, $endHour);
    }

    public function hours(): int
    {
        return $this->endHour - $this->startHour;
    }

    public function startsAt(): CarbonImmutable
    {
        return $this->date->setTime($this->startHour, 0);
    }

    public function endsAt(): CarbonImmutable
    {
        return $this->date->setTime($this->endHour, 0);
    }

    public function isWeekend(): bool
    {
        return $this->date->isWeekend();
    }
}
