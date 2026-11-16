<?php

declare(strict_types=1);

namespace App\Domain\Order;

/**
 * `open → ready → out_for_delivery (delivery only) → closed`. Any active order can close
 * (paid in full or closed by hand). Back to `open` only through reopen/edit; `cancelled` only through cancel.
 */
enum OrderStatus: string
{
    case Open = 'open';
    case Ready = 'ready';
    case OutForDelivery = 'out_for_delivery';
    case Closed = 'closed';
    case Cancelled = 'cancelled';

    public function canMoveTo(self $to, OrderType $type): bool
    {
        return match ($this) {
            self::Open => $to === self::Ready || $to === self::Closed,
            self::Ready => $to === self::Closed || ($to === self::OutForDelivery && $type === OrderType::Delivery),
            self::OutForDelivery => $to === self::Closed,
            self::Closed, self::Cancelled => false,
        };
    }
}
