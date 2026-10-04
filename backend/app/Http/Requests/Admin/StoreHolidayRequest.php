<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

final class StoreHolidayRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'reason' => ['nullable', 'string', 'max:255'],
            'cancel_reservations' => ['sometimes', 'boolean'],
        ];
    }

    public function holidayDate(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->string('date')->toString());
    }

    public function reason(): ?string
    {
        return $this->filled('reason') ? $this->string('reason')->toString() : null;
    }

    public function cancelReservations(): bool
    {
        return $this->boolean('cancel_reservations');
    }
}
