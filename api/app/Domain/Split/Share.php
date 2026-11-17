<?php

declare(strict_types=1);

namespace App\Domain\Split;

/** What one payer owes; `picks` only for splits by units or by goods. */
final readonly class Share
{
    /** @param  list<Pick>  $picks */
    public function __construct(public ?string $payerLabel, public int $amountCents, public array $picks = []) {}
}
