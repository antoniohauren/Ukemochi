<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Auth\PinHasher;

/** "hashed:<pin>"; counts calls and notes whether each verify ran under the throttle lock. */
final class PlainPinHasher implements PinHasher
{
    public int $hashed = 0;

    /** @var list<bool> */
    public array $verifiedUnderLock = [];

    public function __construct(private readonly ?InMemoryLoginThrottle $throttle = null) {}

    public function hash(string $pin): string
    {
        $this->hashed++;
        if ($this->throttle !== null) {
            $this->verifiedUnderLock[] = $this->throttle->held;
        }

        return "hashed:{$pin}";
    }

    public function verify(string $pin, string $hash): bool
    {
        if ($this->throttle !== null) {
            $this->verifiedUnderLock[] = $this->throttle->held;
        }

        return $hash === "hashed:{$pin}";
    }
}
