<?php

declare(strict_types=1);

namespace App\Application\Order;

use App\Domain\Order\Order;
use App\Domain\Order\OrderNotFound;
use App\Domain\Order\OrderStatus;

final readonly class ReadOrders
{
    /** shortcut: one status lists only its newest LIMIT orders, no paging; add paging with the admin order history. */
    public const int LIMIT = 100;

    public function __construct(private OrderRepository $orders) {}

    /**
     * Newest first. No status: the active orders (open, ready, out for delivery).
     *
     * @return list<Order>
     */
    public function list(?OrderStatus $status): array
    {
        return $status === null
            ? $this->orders->list([OrderStatus::Open, OrderStatus::Ready, OrderStatus::OutForDelivery], null)
            : $this->orders->list([$status], self::LIMIT);
    }

    public function get(int $id): Order
    {
        return $this->orders->find($id) ?? throw new OrderNotFound($id);
    }
}
