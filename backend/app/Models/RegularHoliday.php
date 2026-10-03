<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['day_of_week'])]
final class RegularHoliday extends Model
{
    /**
     * @return list<int>
     */
    public static function days(): array
    {
        return self::query()
            ->orderBy('day_of_week')
            ->pluck('day_of_week')
            ->map(fn (mixed $day): int => (int) $day)
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
        ];
    }
}
