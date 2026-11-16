<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Order\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** No `status`: the active orders. */
final class ListOrdersRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::enum(OrderStatus::class)],
        ];
    }

    public function status(): ?OrderStatus
    {
        return $this->enum('status', OrderStatus::class);
    }
}
