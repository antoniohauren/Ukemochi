<?php

declare(strict_types=1);

namespace App\Domain\Order;

enum OrderType: string
{
    case DineIn = 'dine_in';
    case Pickup = 'pickup';
    case Delivery = 'delivery';
}
