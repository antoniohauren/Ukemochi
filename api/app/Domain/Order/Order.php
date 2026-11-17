<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\Money\Money;
use App\Domain\Ticket\TicketKind;

/**
 * Order aggregate. `id` is the order number. `version` grows on every change to what the
 * tickets show (lines, details, cancel, reopen), so "changed since print" is `version > printedVersion`.
 * A cancelled order is final: it cannot be edited, moved or reopened.
 */
final class Order
{
    /** @param  list<OrderLine>  $lines */
    public function __construct(
        public readonly int $id,
        public private(set) OrderDetails $details,
        public private(set) OrderStatus $status,
        public private(set) array $lines,
        public readonly int $createdBy,
        public readonly \DateTimeImmutable $createdAt,
        public private(set) ?\DateTimeImmutable $closedAt = null,
        public private(set) ?string $cancelReason = null,
        public private(set) int $printedVersion = 0,
        public private(set) int $version = 1,
    ) {
        if ($lines === []) {
            throw new NoLines;
        }
    }

    /** @param  list<OrderLine>  $lines */
    public static function place(int $number, OrderDetails $details, array $lines, int $createdBy, \DateTimeImmutable $at): self
    {
        return new self($number, $details, OrderStatus::Open, $lines, $createdBy, $at);
    }

    public function subtotalCents(): int
    {
        return array_reduce($this->lines, fn (Money $sum, OrderLine $line) => $sum->add(Money::fromCents($line->totalCents())), Money::zero())->cents;
    }

    /** Σ(qty × (unit + add-ons)) + delivery fee. */
    public function totalCents(): int
    {
        return Money::fromCents($this->subtotalCents())->add(Money::fromCents($this->details->deliveryFeeCents))->cents;
    }

    /**
     * Replaces details and lines. Editing a closed order reopens it.
     *
     * @param  list<OrderLine>  $lines
     */
    public function edit(OrderDetails $details, array $lines): void
    {
        $this->refuseIfCancelled();
        if ($lines === []) {
            throw new NoLines;
        }
        $this->details = $details;
        $this->lines = $lines;
        if ($this->status === OrderStatus::Closed) {
            $this->status = OrderStatus::Open;
            $this->closedAt = null;
        }
        // Only delivery orders go out for delivery.
        if ($this->status === OrderStatus::OutForDelivery && $details->type !== OrderType::Delivery) {
            $this->status = OrderStatus::Ready;
        }
        $this->version++;
    }

    /** Forward moves only; see OrderStatus. */
    public function moveTo(OrderStatus $to, \DateTimeImmutable $at): void
    {
        $this->refuseIfCancelled();
        if (! $this->status->canMoveTo($to, $this->details->type)) {
            throw new InvalidTransition($this->status, $to);
        }
        $this->status = $to;
        if ($to === OrderStatus::Closed) {
            $this->closedAt = $at;
        }
    }

    public function reopen(): void
    {
        $this->refuseIfCancelled();
        if ($this->status !== OrderStatus::Closed) {
            throw new InvalidTransition($this->status, OrderStatus::Open);
        }
        $this->status = OrderStatus::Open;
        $this->closedAt = null;
        $this->version++;
    }

    public function cancel(string $reason): void
    {
        $this->refuseIfCancelled();
        if (trim($reason) === '') {
            throw new CancelReasonRequired;
        }
        $this->status = OrderStatus::Cancelled;
        $this->cancelReason = trim($reason);
        $this->version++;
    }

    /**
     * Records a print of the version the ticket showed. Only the kitchen ticket counts for
     * "changed since print"; an older print arriving late never moves it back.
     */
    public function markPrinted(TicketKind $kind, int $version): void
    {
        if ($version < 1 || $version > $this->version) {
            throw new InvalidPrintVersion;
        }
        if ($kind === TicketKind::Kitchen) {
            $this->printedVersion = max($this->printedVersion, $version);
        }
    }

    /** Null when the kitchen has what it needs; a cancel matters only if the kitchen saw the order. */
    public function printStatus(): ?PrintStatus
    {
        $behind = $this->version > $this->printedVersion;

        return match (true) {
            $this->status === OrderStatus::Cancelled => $this->printedVersion > 0 && $behind ? PrintStatus::CancelNotPrinted : null,
            $this->printedVersion === 0 => PrintStatus::NotPrinted,
            $behind => PrintStatus::Changed,
            default => null,
        };
    }

    private function refuseIfCancelled(): void
    {
        if ($this->status === OrderStatus::Cancelled) {
            throw new OrderCancelled;
        }
    }
}
