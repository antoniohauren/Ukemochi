<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Payment\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `tendered_cents` is the cash handed over (cash only); the payment is stored at `amount_cents`. */
final class PaymentRequest extends FormRequest
{
    private const string CENTS = 'max:100000000';

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'method' => ['required', 'string', Rule::enum(PaymentMethod::class)],
            'amount_cents' => ['required', 'integer', 'min:1', self::CENTS],
            'tendered_cents' => ['nullable', 'integer', 'min:1', self::CENTS, 'prohibited_unless:method,cash', 'gte:amount_cents'],
            'payer_label' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function payMethod(): PaymentMethod
    {
        return $this->enum('method', PaymentMethod::class) ?? throw new \LogicException('validated');
    }

    public function tendered(): ?int
    {
        return $this->filled('tendered_cents') ? $this->integer('tendered_cents') : null;
    }

    public function payerLabel(): ?string
    {
        return $this->filled('payer_label') ? $this->string('payer_label')->toString() : null;
    }
}
