<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePricesRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'weekday' => ['required', 'integer', 'min:0'],
            'weekend' => ['required', 'integer', 'min:0'],
        ];
    }
}
