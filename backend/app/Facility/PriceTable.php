<?php

declare(strict_types=1);

namespace App\Facility;

use App\Reservations\TimeSlot;

final readonly class PriceTable
{
    public function __construct(
        public int $weekday,
        public int $weekend,
    ) {}

    public function priceFor(TimeSlot $slot): int
    {
        return $this->unitPrice($this->typeFor($slot)) * $slot->hours();
    }

    public function typeFor(TimeSlot $slot): PriceType
    {
        return $slot->isWeekend() ? PriceType::Weekend : PriceType::Weekday;
    }

    public function unitPrice(PriceType $type): int
    {
        return match ($type) {
            PriceType::Weekday => $this->weekday,
            PriceType::Weekend => $this->weekend,
        };
    }
}
