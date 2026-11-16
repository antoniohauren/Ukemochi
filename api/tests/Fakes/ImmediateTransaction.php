<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Transaction;

/** Runs the work directly; unit tests have nothing to roll back. */
final class ImmediateTransaction implements Transaction
{
    public function run(\Closure $work): mixed
    {
        return $work();
    }
}
