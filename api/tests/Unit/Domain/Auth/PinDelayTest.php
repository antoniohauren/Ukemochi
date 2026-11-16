<?php

declare(strict_types=1);

use App\Domain\Auth\PinDelay;

it('doubles the delay per wrong PIN up to 30 seconds', function (int $failures, int $seconds): void {
    expect(PinDelay::seconds($failures))->toBe($seconds);
})->with([[0, 0], [1, 1], [2, 2], [3, 4], [4, 8], [5, 16], [6, 30], [7, 30], [1000, 30]]);
