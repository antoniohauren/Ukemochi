<?php

declare(strict_types=1);

namespace App\Application\Payment;

use App\Domain\Payment\Payment;

interface PaymentRepository
{
    /** Inserts a new payment (id 0) and returns it with its id. */
    public function add(Payment $payment): Payment;

    public function find(int $id): ?Payment;

    /** Stores the voided flag. */
    public function save(Payment $payment): void;

    /** @return list<Payment> oldest first, voided ones included */
    public function forOrder(int $orderId): array;
}
