<?php

declare(strict_types=1);

namespace App\Infrastructure\Order;

use App\Application\Order\OrderEvents;
use Illuminate\Contracts\Events\Dispatcher;

final readonly class BroadcastOrderEvents implements OrderEvents
{
    public function __construct(private Dispatcher $events) {}

    public function updated(int $id, int $version): void
    {
        try {
            $this->events->dispatch(new OrderUpdated($id, $version));
        } catch (\Throwable $e) {
            // The change is already committed: Reverb being down must not fail it. Screens catch up on their next fetch.
            report($e);
        }
    }
}
