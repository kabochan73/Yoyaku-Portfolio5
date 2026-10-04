<?php

declare(strict_types=1);

namespace App\Domain\Facility;

use App\Domain\Facility\Events\FacilityChanged;
use App\Models\Price;
use Illuminate\Support\Facades\DB;

final readonly class UpdatePrices
{
    public function handle(int $weekday, int $weekend): void
    {
        DB::transaction(function () use ($weekday, $weekend) {
            Price::query()->updateOrCreate(['type' => PriceType::Weekday], ['amount_per_hour' => $weekday]);
            Price::query()->updateOrCreate(['type' => PriceType::Weekend], ['amount_per_hour' => $weekend]);

            FacilityChanged::dispatch();
        });
    }
}
