<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Calendar\CalendarDay;
use App\Domain\Calendar\CalendarSlot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property CalendarDay $resource
 */
final class CalendarDayResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'date' => $this->resource->date->toDateString(),
            'closed_reason' => $this->resource->closedReason?->value,
            'slots' => array_map(fn (CalendarSlot $slot): array => [
                'hour' => $slot->hour,
                'status' => $slot->status->value,
            ], $this->resource->slots),
        ];
    }
}
