<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Domain\Calendar\AdminCalendarDay;
use App\Domain\Calendar\CalendarSlot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property AdminCalendarDay $resource
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
                'reservation_id' => $slot->reservationId,
            ], $this->resource->slots),
            'reservations' => ReservationResource::collection($this->resource->reservations),
        ];
    }
}
