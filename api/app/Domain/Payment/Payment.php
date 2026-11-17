<?php

declare(strict_types=1);

namespace App\Domain\Payment;

use App\Domain\Split\Pick;

/**
 * Money applied to an order, linked to the shift open when it was taken. Stored at the amount applied;
 * `tenderedCents` (cash only) is what the customer handed over, so change = tendered − amount.
 * `allocations` record which line units a split by units or by goods paid for.
 */
final class Payment
{
    /** @param  list<Pick>  $allocations */
    public function __construct(
        public readonly int $id,
        public readonly int $orderId,
        public readonly int $shiftId,
        public readonly PaymentMethod $method,
        public readonly int $amountCents,
        public readonly ?int $tenderedCents,
        public readonly ?string $payerLabel,
        public readonly ?string $note,
        public readonly int $createdBy,
        public readonly \DateTimeImmutable $createdAt,
        public private(set) bool $voided = false,
        public readonly array $allocations = [],
    ) {}

    /** @param  list<Pick>  $allocations */
    public static function take(
        int $orderId, int $shiftId, PaymentMethod $method, int $amountCents, ?int $tenderedCents,
        ?string $payerLabel, ?string $note, int $by, \DateTimeImmutable $at, array $allocations = [],
    ): self {
        if ($amountCents <= 0 || ($tenderedCents !== null && ($method !== PaymentMethod::Cash || $tenderedCents < $amountCents))) {
            throw new InvalidPayment;
        }
        $label = trim($payerLabel ?? '');

        return new self(0, $orderId, $shiftId, $method, $amountCents, $tenderedCents, $label === '' ? null : $label, $note, $by, $at, false, $allocations);
    }

    public function changeCents(): ?int
    {
        return $this->tenderedCents === null ? null : $this->tenderedCents - $this->amountCents;
    }

    public function void(): void
    {
        if ($this->voided) {
            throw new PaymentVoided;
        }
        $this->voided = true;
    }
}
