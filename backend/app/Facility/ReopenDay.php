<?php

declare(strict_types=1);

namespace App\Facility;

use App\Facility\Events\HolidayChanged;
use App\Models\Holiday;

final readonly class ReopenDay
{
    public function handle(Holiday $holiday): void
    {
        $holiday->delete();

        HolidayChanged::dispatch($holiday->date);
    }
}
