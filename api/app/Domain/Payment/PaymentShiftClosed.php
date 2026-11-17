<?php

declare(strict_types=1);

namespace App\Domain\Payment;

use App\Domain\DomainException;

final class PaymentShiftClosed extends DomainException
{
    public function __construct()
    {
        parent::__construct('payment.shift_closed', 'This payment belongs to a closed shift and cannot be voided.');
    }
}
