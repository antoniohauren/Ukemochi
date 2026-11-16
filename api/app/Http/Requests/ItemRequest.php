<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Create (POST) also takes `active` and the default variant's `price_cents`; after that only the toggle changes `active`. */
final class ItemRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
            ...($this->isMethod('POST') ? ['active' => ['required', 'boolean'], 'price_cents' => ['required', 'integer', 'min:0']] : []),
        ];
    }
}
