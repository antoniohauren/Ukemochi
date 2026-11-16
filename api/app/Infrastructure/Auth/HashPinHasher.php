<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Application\Auth\PinHasher;
use Illuminate\Contracts\Hashing\Hasher;

final readonly class HashPinHasher implements PinHasher
{
    public function __construct(private Hasher $hasher) {}

    public function hash(string $pin): string
    {
        return $this->hasher->make($pin);
    }

    public function verify(string $pin, string $hash): bool
    {
        return $this->hasher->check($pin, $hash);
    }
}
