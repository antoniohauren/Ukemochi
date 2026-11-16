<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Order\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** The domain refuses moves that are not allowed (back to open, to cancelled...). */
final class OrderStatusRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::enum(OrderStatus::class)],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function status(): OrderStatus
    {
        return $this->enum('status', OrderStatus::class) ?? throw new \LogicException('validated');
    }
}
