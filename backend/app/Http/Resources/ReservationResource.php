<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Reservation $resource
 */
class ReservationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $reservation = $this->resource;
        $now = now()->toImmutable();

        return [
            'id' => $reservation->id,
            'date' => $reservation->date->toDateString(),
            'start_hour' => $reservation->start_hour,
            'end_hour' => $reservation->end_hour,
            'hours' => $reservation->timeSlot()->hours(),
            'price' => $reservation->price,
            'status' => $reservation->status->value,
            'phase' => $reservation->phase($now)->value,
            'is_cancellable' => $reservation->isCancellable($now),
            'booker_name' => $reservation->booker_name,
        ];
    }
}
