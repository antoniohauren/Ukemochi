<?php

declare(strict_types=1);

namespace App\Domain\Payment;

use App\Domain\DomainException;

final class InvalidPayment extends DomainException
{
    public function __construct()
    {
        parent::__construct('payment.invalid', 'A payment needs an amount above zero; tendered cash cannot be less than the amount, and only cash takes tendered.');
    }
}
