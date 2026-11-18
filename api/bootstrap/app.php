<?php

declare(strict_types=1);

use App\Domain\Auth\LastAdmin;
use App\Domain\Auth\LoginThrottled;
use App\Domain\Auth\NameTaken;
use App\Domain\Auth\NotAuthenticated;
use App\Domain\Auth\UserNotFound;
use App\Domain\Cash\NoOpenShift;
use App\Domain\Cash\ShiftAlreadyOpen;
use App\Domain\Cash\ShiftClosed;
use App\Domain\Cash\ShiftNotFound;
use App\Domain\Customer\CustomerNotFound;
use App\Domain\Customer\PhoneTaken;
use App\Domain\DomainException;
use App\Domain\Menu\LastVariant;
use App\Domain\Menu\MenuNotFound;
use App\Domain\Order\LineNotFound;
use App\Domain\Order\OrderNotFound;
use App\Domain\Payment\PaymentNotFound;
use App\Domain\Payment\PaymentShiftClosed;
use App\Domain\Payment\PaymentVoided;
use App\Domain\Realtime\RealtimeUnavailable;
use App\Http\Middleware\EnsureRole;
use App\Http\RenderApiException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // Echo authorizes private channels at /api/broadcasting/auth with the Sanctum session cookie.
    ->withBroadcasting(__DIR__.'/../routes/channels.php', ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum']])
    ->withMiddleware(function (Middleware $middleware): void {
        // nginx reaches php-fpm over the private Docker network and overwrites X-Forwarded-For.
        $middleware->trustProxies(at: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);
        // Sanctum SPA: requests from SANCTUM_STATEFUL_DOMAINS get session cookies + CSRF.
        $middleware->statefulApi();
        $middleware->alias(['role' => EnsureRole::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(new RenderApiException([
            NotAuthenticated::class => 401,
            NameTaken::class => 409,
            LoginThrottled::class => 429,
            MenuNotFound::class => 404,
            LastVariant::class => 409,
            UserNotFound::class => 404,
            LastAdmin::class => 409,
            OrderNotFound::class => 404,
            LineNotFound::class => 404,
            RealtimeUnavailable::class => 503,
            ShiftNotFound::class => 404,
            ShiftAlreadyOpen::class => 409,
            NoOpenShift::class => 409,
            ShiftClosed::class => 409,
            PaymentNotFound::class => 404,
            CustomerNotFound::class => 404,
            PhoneTaken::class => 409,
            PaymentVoided::class => 409,
            PaymentShiftClosed::class => 409,
        ]));
        // Business rule violations are expected outcomes, not errors to log.
        $exceptions->dontReport(DomainException::class);
    })->create();
