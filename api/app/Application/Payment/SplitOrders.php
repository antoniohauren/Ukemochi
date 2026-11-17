<?php

declare(strict_types=1);

namespace App\Application\Payment;

use App\Application\Order\OrderRepository;
use App\Domain\Order\Order;
use App\Domain\Order\OrderNotFound;
use App\Domain\Split\Pick;
use App\Domain\Split\Split;
use App\Domain\Split\SplitResult;

/** Split previews over the order's balance due. Nothing is stored; the UI records each share as a payment. */
final readonly class SplitOrders
{
    public function __construct(private OrderRepository $orders) {}

    public function equal(int $orderId, int $n): SplitResult
    {
        return Split::equal($this->order($orderId)->balanceCents(), $n);
    }

    /** @param  list<int>  $amounts */
    public function byAmount(int $orderId, array $amounts): SplitResult
    {
        return Split::byAmount($this->order($orderId)->balanceCents(), $amounts);
    }

    /** @param  list<array{?string, list<Pick>}>  $payers */
    public function byUnits(int $orderId, array $payers): SplitResult
    {
        $order = $this->order($orderId);

        return Split::byUnits($order->balanceCents(), $order->lines, $payers);
    }

    /** @param  list<array{?string, list<int>}>  $payers */
    public function byGoods(int $orderId, array $payers): SplitResult
    {
        $order = $this->order($orderId);

        return Split::byGoods($order->balanceCents(), $order->lines, $payers);
    }

    private function order(int $id): Order
    {
        return $this->orders->find($id) ?? throw new OrderNotFound($id);
    }
}
