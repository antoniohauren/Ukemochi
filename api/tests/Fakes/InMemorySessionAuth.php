<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Auth\SessionAuth;

final class InMemorySessionAuth implements SessionAuth
{
    public ?int $userId = null;

    public function login(int $userId): void
    {
        $this->userId = $userId;
    }

    public function logout(): void
    {
        $this->userId = null;
    }

    public function userId(): ?int
    {
        return $this->userId;
    }
}
