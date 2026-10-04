<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class CalendarRequest extends FormRequest
{
    private const MAX_DAYS = 14;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if ($this->from()->diffInDays($this->to()) >= self::MAX_DAYS) {
                    $validator->errors()->add('to', __('validation.custom.to.max_range', ['days' => self::MAX_DAYS]));
                }
            },
        ];
    }

    public function from(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->string('from')->toString());
    }

    public function to(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->string('to')->toString());
    }
}
