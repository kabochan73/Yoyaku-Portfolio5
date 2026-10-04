<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Reservations\TimeSlot;
use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d'],
            'start_hour' => ['required', 'integer', 'between:0,24'],
            'end_hour' => ['required', 'integer', 'between:0,24'],
        ];
    }

    public function timeSlot(): TimeSlot
    {
        return TimeSlot::on(
            $this->string('date')->toString(),
            $this->integer('start_hour'),
            $this->integer('end_hour'),
        );
    }
}
