<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class SearchUsersRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['required', 'string', 'min:1', 'max:255'],
        ];
    }

    public function keyword(): string
    {
        return $this->string('search')->toString();
    }
}
