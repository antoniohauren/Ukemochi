<?php

declare(strict_types=1);

namespace App\Application\Auth;

interface PinHasher
{
    public function hash(string $pin): string;

    public function verify(string $pin, string $hash): bool;
}
