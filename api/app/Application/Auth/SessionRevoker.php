<?php

declare(strict_types=1);

namespace App\Application\Auth;

/** Ends a user's stored sessions, e.g. after a PIN reset or deactivation. */
interface SessionRevoker
{
    /** Revokes every session of the user except `$keepSessionId` (the caller's own, on a self-reset). */
    public function revokeFor(int $userId, ?string $keepSessionId): void;
}
