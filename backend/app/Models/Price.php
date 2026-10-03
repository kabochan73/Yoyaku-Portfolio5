<?php

declare(strict_types=1);

namespace App\Models;

use App\Facility\PriceType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['type', 'amount_per_hour'])]
final class Price extends Model
{
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
