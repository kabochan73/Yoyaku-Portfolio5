<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Http\Resources\ReservationResource as MemberReservationResource;
use Illuminate\Http\Request;

final class ReservationResource extends MemberReservationResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'user_id' => $this->resource->user_id,
            'is_phone' => $this->resource->user_id === null,
        ];
    }
}
