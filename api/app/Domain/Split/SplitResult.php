<?php

declare(strict_types=1);

namespace App\Domain\Split;

/** Suggested shares; `remainderCents` = amount to split − Σ shares, what nobody covers yet. */
final readonly class SplitResult
{
    /** @param  list<Share>  $shares */
    public function __construct(public array $shares, public int $remainderCents) {}
}
