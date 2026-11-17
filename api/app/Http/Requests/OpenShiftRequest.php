<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class OpenShiftRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'opening_float_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
