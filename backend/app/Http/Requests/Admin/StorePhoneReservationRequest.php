<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Http\Requests\StoreReservationRequest;

final class StorePhoneReservationRequest extends StoreReservationRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'booker_name' => ['required', 'string', 'max:255'],
        ];
    }

    public function bookerName(): string
    {
        return $this->string('booker_name')->toString();
    }
}
