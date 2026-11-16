<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Order\OrderEvents;

final class InMemoryOrderEvents implements OrderEvents
{
    /** @var list<array{id: int, version: int}> */
    public array $updated = [];

    public function updated(int $id, int $version): void
    {
        $this->updated[] = ['id' => $id, 'version' => $version];
    }
}
