<?php

declare(strict_types=1);

namespace App\Domain\Facility;

use App\Models\Price;
use App\Models\RegularHoliday;

final readonly class FacilitySettings
{
    /**
     * @param  list<int>  $regularHolidays
     */
    public function __construct(
        public PriceTable $prices,
        public array $regularHolidays,
    ) {}

    public static function current(): self
    {
        return new self(Price::table(), RegularHoliday::days());
    }
}
