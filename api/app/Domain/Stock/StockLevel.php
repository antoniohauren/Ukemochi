<?php

declare(strict_types=1);

namespace App\Domain\Stock;

/** Expected quantity of one variant: the sum of its movements. May be negative; sales are never blocked. */
final readonly class StockLevel
{
    public function __construct(
        public int $variantId,
        public string $itemName,
        public string $variantName,
        public bool $tracked,
        public ?int $min,
        public int $qty,
        public int $soldToday,
    ) {}

    /** Out at zero or below; low at or below the minimum when one is set. */
    public function status(): StockStatus
    {
        return match (true) {
            $this->qty <= 0 => StockStatus::Out,
            $this->min !== null && $this->qty <= $this->min => StockStatus::Low,
            default => StockStatus::Ok,
        };
    }

    /** Signed movement that brings the expected quantity to what was counted. */
    public function adjustTo(int $counted): int
    {
        if ($counted < 0) {
            throw new InvalidStockQty;
        }

        return $counted - $this->qty;
    }
}
