<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Facility\FacilitySettings;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property FacilitySettings $resource
 */
final class FacilityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => config('facility.name'),
            'phone' => config('facility.phone'),
            'address' => config('facility.address'),
            'email' => config('facility.email'),
            'rules' => [
                'open_hour' => config('facility.rules.open_hour'),
                'close_hour' => config('facility.rules.close_hour'),
                'min_hours' => config('facility.rules.min_hours'),
                'max_hours' => config('facility.rules.max_hours'),
                'booking_window_months' => config('facility.rules.booking_window_months'),
            ],
            'prices' => [
                'weekday' => $this->resource->prices->weekday,
                'weekend' => $this->resource->prices->weekend,
            ],
            'regular_holidays' => $this->resource->regularHolidays,
        ];
    }
}
