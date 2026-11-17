<?php

declare(strict_types=1);

namespace App\Application\Payment;

use App\Domain\Order\Order;
use App\Domain\Payment\Payment;

final readonly class OrderPayments
{
    /** @param  list<Payment>  $payments  oldest first, voided ones included */
    public function __construct(public Order $order, public array $payments) {}
}
