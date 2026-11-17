<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\Money\Money;

/** Category, item, variant and print names and prices are snapshotted at the time of sale. `id` is 0 until stored. */
final readonly class OrderLine
{
    /** @param  list<LineAddon>  $addons */
    public function __construct(
        public int $id,
        public int $variantId,
        public string $itemName,
        public string $variantName,
        public int $unitPriceCents,
        public int $qty,
        public ?string $note,
        public array $addons = [],
        public string $categoryName = '',
        public ?string $printName = null,
    ) {
        if ($unitPriceCents < 0) {
            throw new InvalidAmount;
        }
        if ($qty < 1) {
            throw new InvalidQty;
        }
    }

    /** qty × (unit + add-ons). */
    public function totalCents(): int
    {
        $each = Money::fromCents($this->unitPriceCents);
        foreach ($this->addons as $addon) {
            $each = $each->add(Money::fromCents($addon->priceCents));
        }

        return $each->times($this->qty)->cents;
    }
}
