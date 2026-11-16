<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Application\Auth\SessionAuth;
use Illuminate\Auth\SessionGuard;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Contracts\Session\Session;

/** The `web` session guard that Sanctum's SPA authentication reads. */
final readonly class GuardSessionAuth implements SessionAuth
{
    public function __construct(private AuthFactory $auth, private Session $session) {}

    public function login(int $userId): void
    {
        // loginUsingId migrates the session to a new id (no session fixation).
        $this->guard()->loginUsingId($userId);
    }

    public function logout(): void
    {
        $this->guard()->logout();
        $this->session->invalidate();
        $this->session->regenerateToken();
    }

    public function userId(): ?int
    {
        $id = $this->guard()->id();

        return is_int($id) ? $id : null;
    }

    private function guard(): SessionGuard
    {
        $guard = $this->auth->guard('web');
        assert($guard instanceof SessionGuard);

        return $guard;
    }
}
