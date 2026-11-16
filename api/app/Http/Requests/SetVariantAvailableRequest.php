<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SetVariantAvailableRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'available' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
