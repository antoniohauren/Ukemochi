<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Payment\PaymentRepository;
use App\Domain\Payment\Payment;

final class InMemoryPaymentRepository implements PaymentRepository
{
    /** @var array<int, Payment> */
    public array $payments = [];

    public function add(Payment $p): Payment
    {
        $id = count($this->payments) + 1;
        $this->payments[$id] = new Payment($id, $p->orderId, $p->shiftId, $p->method, $p->amountCents, $p->tenderedCents, $p->payerLabel, $p->note, $p->createdBy, $p->createdAt, false, $p->allocations);

        return clone $this->payments[$id];
    }

    public function find(int $id): ?Payment
    {
        return isset($this->payments[$id]) ? clone $this->payments[$id] : null;
    }

    public function save(Payment $payment): void
    {
        $this->payments[$payment->id] = clone $payment;
    }

    public function forOrder(int $orderId): array
    {
        return array_values(array_filter($this->payments, fn (Payment $p) => $p->orderId === $orderId));
    }
}
