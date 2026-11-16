<?php

declare(strict_types=1);

namespace App\Application\Order;

/** A line as staff send it. `lineId` names an existing line to keep its price snapshot; null adds a new line. */
final readonly class LineInput
{
    /** @param  list<int>  $addonIds */
    public function __construct(
        public int $variantId,
        public int $qty,
        public ?string $note = null,
        public array $addonIds = [],
        public ?int $lineId = null,
    ) {}
}
