<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Application\Auth\CurrentUser;
use App\Domain\Auth\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** `role:admin,kitchen` — after auth:sanctum; anyone else gets 403 forbidden. */
final readonly class EnsureRole
{
    public function __construct(private CurrentUser $currentUser) {}

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $allowed = array_map(Role::from(...), $roles);

        if (! in_array($this->currentUser->execute()->role, $allowed, true)) {
            throw new AccessDeniedHttpException;
        }

        $response = $next($request);
        assert($response instanceof Response);

        return $response;
    }
}
