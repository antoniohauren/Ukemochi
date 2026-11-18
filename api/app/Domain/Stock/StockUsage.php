<?php

declare(strict_types=1);

namespace App\Domain\Stock;

use App\Domain\Order\Order;
use App\Domain\Order\OrderStatus;

/** Units an order takes from stock, per variant. A cancelled order takes none. */
final class StockUsage
{
    /** @return array<int, int> variant id => units */
    public static function of(?Order $order): array
    {
        $usage = [];
        if ($order === null || $order->status === OrderStatus::Cancelled) {
            return $usage;
        }
        foreach ($order->lines as $line) {
            $usage[$line->variantId] = ($usage[$line->variantId] ?? 0) + $line->qty;
        }

        return $usage;
    }

    /**
     * Stock movement per variant going from one usage to another: negative takes units out,
     * positive gives them back. Unchanged variants are left out.
     *
     * @param  array<int, int>  $before
     * @param  array<int, int>  $after
     * @return array<int, int>
     */
    public static function change(array $before, array $after): array
    {
        $deltas = [];
        foreach (array_keys($before + $after) as $variantId) {
            $delta = ($before[$variantId] ?? 0) - ($after[$variantId] ?? 0);
            if ($delta !== 0) {
                $deltas[$variantId] = $delta;
            }
        }
        ksort($deltas);

        return $deltas;
    }
}
