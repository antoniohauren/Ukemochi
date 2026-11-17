<?php

declare(strict_types=1);

namespace App\Domain\Payment;

use App\Domain\DomainException;

final class PaymentNotFound extends DomainException
{
    public function __construct(int $id)
    {
        parent::__construct('payment.not_found', "No payment with id {$id}.");
    }
}
