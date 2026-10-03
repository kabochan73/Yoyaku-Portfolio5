<?php

declare(strict_types=1);

namespace App\Facility;

use App\Facility\Events\FacilityChanged;
use App\Models\RegularHoliday;
use Illuminate\Support\Facades\DB;

final readonly class UpdateRegularHolidays
{
    /**
     * @param  list<int>  $days  0（日）〜 6（土）
     */
    public function handle(array $days): void
    {
        DB::transaction(function () use ($days) {
            RegularHoliday::query()->delete();

            foreach (array_unique($days) as $day) {
                RegularHoliday::query()->create(['day_of_week' => $day]);
            }

            FacilityChanged::dispatch();
        });
    }
}
