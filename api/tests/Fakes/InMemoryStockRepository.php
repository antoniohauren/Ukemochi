<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Stock\StockRepository;
use App\Domain\Stock\MovementKind;
use App\Domain\Stock\StockLevel;

final class InMemoryStockRepository implements StockRepository
{
    /** @var array<int, array{name: string, track: bool, min: int|null}> variant id => settings */
    public array $variants = [];

    /** @var list<array{variantId: int, kind: MovementKind, delta: int, orderId: int|null, userId: int, note: string|null, at: \DateTimeImmutable}> */
    public array $movements = [];

    public function level(int $variantId, \DateTimeImmutable $since): ?StockLevel
    {
        $v = $this->variants[$variantId] ?? null;
        if ($v === null) {
            return null;
        }
        $qty = 0;
        $sold = 0;
        foreach ($this->movements as $m) {
            if ($m['variantId'] === $variantId) {
                $qty += $m['delta'];
                if ($m['kind'] === MovementKind::Sale && $m['at'] >= $since) {
                    $sold -= $m['delta'];
                }
            }
        }

        return new StockLevel($variantId, $v['name'], '', $v['track'], $v['min'], $qty, $sold);
    }

    public function levels(\DateTimeImmutable $since): array
    {
        return array_values(array_filter(array_map(fn (int $id) => $this->level($id, $since), array_keys($this->variants))));
    }

    public function tracked(array $variantIds): array
    {
        return array_values(array_filter($variantIds, fn (int $id) => $this->variants[$id]['track'] ?? false));
    }

    public function configure(int $variantId, bool $track, ?int $min): void
    {
        $this->variants[$variantId] = ['name' => $this->variants[$variantId]['name'] ?? '', 'track' => $track, 'min' => $min];
    }

    public function add(int $variantId, MovementKind $kind, int $delta, ?int $orderId, int $userId, ?string $note, \DateTimeImmutable $at): void
    {
        $this->movements[] = compact('variantId', 'kind', 'delta', 'orderId', 'userId', 'note', 'at');
    }
}
