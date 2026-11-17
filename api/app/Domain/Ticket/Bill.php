<?php

declare(strict_types=1);

namespace App\Domain\Ticket;

use App\Domain\Order\Order;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use App\Domain\Payment\Payment;

/** Customer bill (non-fiscal): lines with prices, the totals footer, then payments (voided ones left out) and the balance. */
final readonly class Bill
{
    /**
     * @param  list<OrderLine>  $lines
     * @param  list<Payment>  $payments  non-voided
     */
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
        public Totals $totals,
        public array $payments,
        public int $paidCents,
        public int $balanceCents,
    ) {}

    /** @param  list<Payment>  $payments  all of the order's payments */
    public static function of(Order $order, array $payments = []): self
    {
        $d = $order->details;

        return new self(
            $order->id, $d->type, $d->customerName, $d->addressText, $order->createdAt, $order->version,
            $order->status === OrderStatus::Cancelled, $d->note, $order->lines, Totals::of($order),
            array_values(array_filter($payments, fn (Payment $p) => ! $p->voided)), $order->paidCents, $order->balanceCents(),
        );
    }
}
