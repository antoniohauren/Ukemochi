<?php

declare(strict_types=1);

namespace App\Application\Auth;

/** The current request's login session. */
interface SessionAuth
{
    /** Starts a session for the user with a fresh session id. */
    public function login(int $userId): void;

    /** Ends the session and invalidates its id and CSRF token. */
    public function logout(): void;

    public function userId(): ?int;
}
