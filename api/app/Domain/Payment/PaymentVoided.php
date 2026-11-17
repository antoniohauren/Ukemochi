<?php

declare(strict_types=1);

namespace App\Domain\Payment;

use App\Domain\DomainException;

final class PaymentVoided extends DomainException
{
    public function __construct()
    {
        parent::__construct('payment.voided', 'This payment is already voided.');
    }
}
