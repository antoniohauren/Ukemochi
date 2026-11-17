<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Order\OrderRepository;
use App\Domain\Order\Order;
use App\Domain\Order\OrderLine;

final class InMemoryOrderRepository implements OrderRepository
{
    public int $counter = 0;

    /** @var array<int, Order> */
    public array $orders = [];

    /** @var list<int> */
    public array $locked = [];

    private int $lineId = 0;

    public function nextNumber(): int
    {
        return ++$this->counter;
    }

    public function find(int $id): ?Order
    {
        // A copy, like a fresh read: changes stick only through save().
        return isset($this->orders[$id]) ? clone $this->orders[$id] : null;
    }

    public function list(array $statuses, ?int $limit): array
    {
        $found = array_filter($this->orders, fn (Order $o) => in_array($o->status, $statuses, true));
        krsort($found);

        return array_slice(array_map(fn (Order $o) => clone $o, array_values($found)), 0, $limit);
    }

    public function lock(int $id): ?Order
    {
        $this->locked[] = $id;

        return $this->find($id);
    }

    public function save(Order $order): Order
    {
        $lines = array_map(fn (OrderLine $l) => $l->id !== 0 ? $l : new OrderLine(
            ++$this->lineId, $l->variantId, $l->itemName, $l->variantName, $l->unitPriceCents, $l->qty, $l->note, $l->addons, $l->categoryName, $l->printName,
        ), $order->lines);
        $this->orders[$order->id] = new Order(
            $order->id, $order->details, $order->status, $lines, $order->createdBy, $order->createdAt,
            $order->closedAt, $order->cancelReason, $order->printedVersion, $order->version,
        );

        return clone $this->orders[$order->id];
    }
}
