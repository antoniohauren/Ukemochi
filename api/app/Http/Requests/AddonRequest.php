<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddonRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'item_id' => ['nullable', 'integer', 'min:1'],
            'category_id' => ['nullable', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:255'],
            'price_cents' => ['required', 'integer', 'min:0'],
            'active' => ['required', 'boolean'],
        ];
    }
}
