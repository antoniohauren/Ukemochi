<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Cash\MovementKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `staff_name` is required for a staff meal and ignored otherwise. */
final class CashMovementRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'kind' => ['required', 'string', Rule::enum(MovementKind::class)],
            'amount_cents' => ['required', 'integer', 'min:1', 'max:100000000'],
            'staff_name' => ['nullable', 'required_if:kind,staff_meal', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function kind(): MovementKind
    {
        return $this->enum('kind', MovementKind::class) ?? throw new \LogicException('validated');
    }
}
