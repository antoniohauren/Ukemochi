<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StockConfigRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'track_stock' => ['required', 'boolean'],
            'stock_min' => ['present', 'nullable', 'integer', 'min:0', 'max:1000000'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
