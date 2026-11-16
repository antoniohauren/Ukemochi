<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Application\Auth\SessionRevoker;
use Illuminate\Database\ConnectionInterface;

/** Deletes rows from the `sessions` table (SESSION_DRIVER=database). Another driver would need its own revoker. */
final readonly class DatabaseSessionRevoker implements SessionRevoker
{
    public function __construct(private ConnectionInterface $db) {}

    public function revokeFor(int $userId, ?string $keepSessionId): void
    {
        $this->db->table('sessions')->where('user_id', $userId)
            ->when($keepSessionId !== null, fn ($q) => $q->where('id', '!=', $keepSessionId))
            ->delete();
    }
}
