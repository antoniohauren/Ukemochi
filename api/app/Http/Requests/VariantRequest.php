<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `available` only on create (POST); after that only the toggle changes it. */
final class VariantRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'price_cents' => ['required', 'integer', 'min:0'],
            'sort' => ['required', 'integer', 'min:0', 'max:100000'],
            ...($this->isMethod('POST') ? ['available' => ['required', 'boolean']] : []),
        ];
    }
}
