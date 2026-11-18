<?php

declare(strict_types=1);

namespace App\Application\Stock;

use App\Domain\Stock\MovementKind;
use App\Domain\Stock\StockLevel;

interface StockRepository
{
    /** `soldToday` counts sale movements since `$since`. Null when the variant does not exist. */
    public function level(int $variantId, \DateTimeImmutable $since): ?StockLevel;

    /**
     * Every variant in menu order.
     *
     * @return list<StockLevel>
     */
    public function levels(\DateTimeImmutable $since): array;

    /**
     * @param  list<int>  $variantIds
     * @return list<int> the ones with stock tracking on
     */
    public function tracked(array $variantIds): array;

    public function configure(int $variantId, bool $track, ?int $min): void;

    /** `$delta` is signed: negative takes units out. */
    public function add(int $variantId, MovementKind $kind, int $delta, ?int $orderId, int $userId, ?string $note, \DateTimeImmutable $at): void;
}
