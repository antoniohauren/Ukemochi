<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Application\Order\LineInput;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderType;
use App\Domain\Payment\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create (POST) and edit (PUT) take the whole order. On edit, a line sent with `id` is kept, lines left out
 * are removed, and `edit_note` explains the edit in the audit log. `note` is the order's own note.
 */
final class OrderRequest extends FormRequest
{
    private const string ID = 'max:999999999999999999';

    /** Caps keep qty × price inside a bigint. */
    private const string CENTS = 'max:100000000';

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $edit = $this->isMethod('PUT');

        return [
            'type' => ['required', 'string', Rule::enum(OrderType::class)],
            'customer_name' => ['required', 'string', 'max:255'],
            'address_text' => ['nullable', 'string', 'max:1000'],
            'delivery_fee_cents' => ['sometimes', 'integer', 'min:0', self::CENTS],
            'pay_on_delivery' => ['sometimes', 'boolean'],
            'pay_method' => ['nullable', 'string', Rule::enum(PaymentMethod::class)],
            'change_for_cents' => ['nullable', 'integer', 'min:0', self::CENTS],
            'note' => ['nullable', 'string', 'max:1000'],
            'lines' => ['required', 'list', 'min:1', 'max:200'],
            'lines.*' => ['required', 'array:id,variant_id,qty,note,addon_ids'],
            'lines.*.id' => $edit ? ['nullable', 'integer', 'min:1', self::ID] : ['prohibited'],
            'lines.*.variant_id' => ['required', 'integer', 'min:1', self::ID],
            'lines.*.qty' => ['required', 'integer', 'min:1', 'max:999'],
            'lines.*.note' => ['nullable', 'string', 'max:1000'],
            'lines.*.addon_ids' => ['sometimes', 'list', 'max:50'],
            'lines.*.addon_ids.*' => ['required', 'integer', 'min:1', self::ID],
            ...($edit ? ['edit_note' => ['nullable', 'string', 'max:1000']] : ['edit_note' => ['prohibited']]),
        ];
    }

    public function details(): OrderDetails
    {
        return new OrderDetails(
            $this->enum('type', OrderType::class) ?? throw new \LogicException('validated'),
            $this->string('customer_name')->toString(),
            null,
            $this->filled('address_text') ? $this->string('address_text')->toString() : null,
            $this->integer('delivery_fee_cents'),
            $this->boolean('pay_on_delivery'),
            $this->filled('change_for_cents') ? $this->integer('change_for_cents') : null,
            $this->filled('note') ? $this->string('note')->toString() : null,
            $this->enum('pay_method', PaymentMethod::class),
        );
    }

    /** @return list<LineInput> */
    public function lines(): array
    {
        /** @var list<array{id?: int|string|null, variant_id: int|string, qty: int|string, note?: ?string, addon_ids?: list<int|string>}> $lines */
        $lines = $this->validated('lines');

        return array_map(fn (array $l) => new LineInput(
            (int) $l['variant_id'],
            (int) $l['qty'],
            $l['note'] ?? null,
            array_map(intval(...), $l['addon_ids'] ?? []),
            isset($l['id']) ? (int) $l['id'] : null,
        ), $lines);
    }

    public function editNote(): ?string
    {
        return $this->filled('edit_note') ? $this->string('edit_note')->toString() : null;
    }
}
