<?php

declare(strict_types=1);

namespace App\Domain\Ticket;

use App\Domain\Order\Order;
use App\Domain\Order\OrderLine;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;

/**
 * What the kitchen reads: the same content as the bill, plus the UPDATED/CANCEL flags. `updatedVersion` is set when the kitchen already holds
 * an older print ("UPDATED vN"); a cancelled order prints as a CANCEL ticket.
 */
final readonly class KitchenTicket
{
    /** @param  list<OrderLine>  $lines */
    public function __construct(
        public int $number,
        public OrderType $type,
        public string $customerName,
        public ?string $addressText,
        public \DateTimeImmutable $createdAt,
        public int $version,
        public ?int $updatedVersion,
        public bool $cancelled,
        public ?string $cancelReason,
        public ?string $note,
        public array $lines,
        public Totals $totals,
    ) {}

    public static function of(Order $order): self
    {
        $updated = $order->printedVersion > 0 && $order->version > $order->printedVersion;

        return new self(
            $order->id, $order->details->type, $order->details->customerName, $order->details->addressText, $order->createdAt, $order->version,
            $updated ? $order->version : null, $order->status === OrderStatus::Cancelled, $order->cancelReason,
            $order->details->note, $order->lines, Totals::of($order),
        );
    }
}
