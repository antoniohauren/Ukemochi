<?php

declare(strict_types=1);

namespace App\Domain\Order;

/** What the kitchen ticket still needs; see Order::printStatus(). */
enum PrintStatus: string
{
    case NotPrinted = 'not_printed';
    case Changed = 'changed';
    case CancelNotPrinted = 'cancel_not_printed';
}
