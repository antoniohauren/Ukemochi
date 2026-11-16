<?php

declare(strict_types=1);

namespace App\Application\Order;

use App\Domain\Order\Order;
use App\Domain\Order\OrderStatus;

interface OrderRepository
{
    /**
     * Next order number from the counter row, which stays locked until the transaction ends.
     * Call inside the transaction that stores the order, so a rollback leaves no gap.
     */
    public function nextNumber(): int;

    public function find(int $id): ?Order;

    /**
     * Orders in any of the statuses, newest first; at most `$limit` when given.
     *
     * @param  list<OrderStatus>  $statuses
     * @return list<Order>
     */
    public function list(array $statuses, ?int $limit): array;

    /** Row lock on the order until the transaction ends; null when it does not exist. */
    public function lock(int $id): ?Order;

    /** Inserts or updates the order and syncs its lines (new lines have id 0); returns the stored order. */
    public function save(Order $order): Order;
}
