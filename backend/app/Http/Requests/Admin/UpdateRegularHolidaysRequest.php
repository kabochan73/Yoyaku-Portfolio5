<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateRegularHolidaysRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'days' => ['present', 'array'],
            'days.*' => ['integer', 'between:0,6', 'distinct'],
        ];
    }

    /**
     * @return list<int>
     */
    public function days(): array
    {
        return array_values(array_map('intval', (array) $this->input('days', [])));
    }
}
