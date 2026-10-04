<?php

declare(strict_types=1);

namespace App\Domain\Facility\Events;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Events\Dispatchable;

final class HolidayChanged
{
    use Dispatchable;

    public function __construct(
        public readonly CarbonImmutable $date,
    ) {}
}
