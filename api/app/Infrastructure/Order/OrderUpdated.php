<?php

declare(strict_types=1);

namespace App\Infrastructure\Order;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/** `order.updated {id, version}` on the private `orders` channel; screens refetch the order. */
final readonly class OrderUpdated implements ShouldBroadcastNow
{
    public function __construct(public int $id, public int $version) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('orders');
    }

    public function broadcastAs(): string
    {
        return 'order.updated';
    }

    /** @return array{id: int, version: int} */
    public function broadcastWith(): array
    {
        return ['id' => $this->id, 'version' => $this->version];
    }
}
