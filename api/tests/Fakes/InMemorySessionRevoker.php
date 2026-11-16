<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Auth\SessionRevoker;

final class InMemorySessionRevoker implements SessionRevoker
{
    /** @var list<array{int, ?string}> */
    public array $revoked = [];

    public function revokeFor(int $userId, ?string $keepSessionId): void
    {
        $this->revoked[] = [$userId, $keepSessionId];
    }
}
