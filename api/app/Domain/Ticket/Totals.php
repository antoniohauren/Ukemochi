<?php

declare(strict_types=1);

namespace App\Domain\Ticket;

use App\Domain\Money\Money;
use App\Domain\Order\Order;
use App\Domain\Payment\PaymentMethod;

/**
 * Ticket footer, the same on the kitchen ticket and the bill. `changeCents` is the change to take on
 * a cash delivery: "troco para" − total, null without "troco para" or when it does not cover the total.
 */
final readonly class Totals
{
    public function __construct(
        public int $subtotalCents,
        public int $deliveryFeeCents,
        public int $totalCents,
        public bool $payOnDelivery,
        public ?PaymentMethod $payMethod,
        public ?int $changeForCents,
        public ?int $changeCents,
    ) {}

    public static function of(Order $order): self
    {
        $d = $order->details;
        $total = $order->totalCents();
        $change = $d->changeForCents !== null && $d->changeForCents >= $total
            ? Money::fromCents($d->changeForCents)->subtract(Money::fromCents($total))->cents
            : null;

        return new self($order->subtotalCents(), $d->deliveryFeeCents, $total, $d->payOnDelivery, $d->payMethod, $d->changeForCents, $change);
    }
}
