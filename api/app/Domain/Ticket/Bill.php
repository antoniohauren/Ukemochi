<?php

declare(strict_types=1);

namespace App\Domain\Ticket;

use App\Domain\Order\Order;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;

/** Customer bill (non-fiscal): lines with prices, then the totals footer. */
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
        public Totals $totals,
    ) {}

    public static function of(Order $order): self
    {
        $d = $order->details;

        return new self(
            $order->id, $d->type, $d->customerName, $d->addressText, $order->createdAt, $order->version,
            $order->status === OrderStatus::Cancelled, $d->note, $order->lines, Totals::of($order),
        );
    }
}
