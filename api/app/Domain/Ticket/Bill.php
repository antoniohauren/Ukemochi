<?php

declare(strict_types=1);

namespace App\Domain\Ticket;

use App\Domain\Money\Money;
use App\Domain\Order\Order;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use App\Domain\Payment\PaymentMethod;

/**
 * Customer bill (non-fiscal). `changeCents` is the change to take on a cash delivery:
 * "troco para" − total, null when there is no "troco para" or it does not cover the total.
 * shortcut: no payments or balance yet; add them with payments (PLAN step 15).
 */
final readonly class Bill
{
    /** @param  list<OrderLine>  $lines */
    public function __construct(
        public int $number,
        public OrderType $type,
        public string $customerName,
        public ?string $addressText,
        public \DateTimeImmutable $createdAt,
        public int $version,
        public bool $cancelled,
        public ?string $note,
        public array $lines,
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

        return new self(
            $order->id, $d->type, $d->customerName, $d->addressText, $order->createdAt, $order->version,
            $order->status === OrderStatus::Cancelled, $d->note, $order->lines,
            $order->subtotalCents(), $d->deliveryFeeCents, $total, $d->payOnDelivery, $d->payMethod, $d->changeForCents, $change,
        );
    }
}
