<?php

declare(strict_types=1);

namespace App\Models;

use App\Domain\Facility\PriceTable;
use App\Domain\Facility\PriceType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

#[Fillable(['type', 'amount_per_hour'])]
final class Price extends Model
{
    public static function table(): PriceTable
    {
        $amounts = self::query()->pluck('amount_per_hour', 'type');

        $weekday = $amounts[PriceType::Weekday->value] ?? null;
        $weekend = $amounts[PriceType::Weekend->value] ?? null;

        if (! is_int($weekday) || ! is_int($weekend)) {
            throw new RuntimeException('Both weekday and weekend prices must exist.');
        }

        return new PriceTable(weekday: $weekday, weekend: $weekend);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => PriceType::class,
            'amount_per_hour' => 'integer',
        ];
    }
}
