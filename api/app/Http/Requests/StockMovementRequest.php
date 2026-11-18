<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `qty` is the units bought for a purchase, or the units counted for an adjustment. A purchase of 0 is refused by the domain. */
final class StockMovementRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'qty' => ['required', 'integer', 'min:0', 'max:1000000'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
