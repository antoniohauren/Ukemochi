<?php

declare(strict_types=1);

namespace App\Providers;

use App\Application\Audit\AuditLog;
use App\Application\Auth\LoginThrottle;
use App\Application\Auth\PinHasher;
use App\Application\Auth\SessionAuth;
use App\Application\Auth\UserRepository;
use App\Application\Clock;
use App\Application\Health\DatabaseProbe;
use App\Application\Menu\MenuRepository;
use App\Application\Transaction;
use App\Infrastructure\Audit\DatabaseAuditLog;
use App\Infrastructure\Auth\CacheLoginThrottle;
use App\Infrastructure\Auth\EloquentUserRepository;
use App\Infrastructure\Auth\GuardSessionAuth;
use App\Infrastructure\Auth\HashPinHasher;
use App\Infrastructure\DatabaseTransaction;
use App\Infrastructure\Health\ConnectionDatabaseProbe;
use App\Infrastructure\Menu\EloquentMenuRepository;
use App\Infrastructure\SystemClock;
use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

/** Composition root: binds application ports to infrastructure. */
class AppServiceProvider extends ServiceProvider
{
    /** @var array<class-string, class-string> */
    public array $bindings = [
        AuditLog::class => DatabaseAuditLog::class,
        Clock::class => SystemClock::class,
        DatabaseProbe::class => ConnectionDatabaseProbe::class,
        LoginThrottle::class => CacheLoginThrottle::class,
        MenuRepository::class => EloquentMenuRepository::class,
        PinHasher::class => HashPinHasher::class,
        SessionAuth::class => GuardSessionAuth::class,
        Transaction::class => DatabaseTransaction::class,
        UserRepository::class => EloquentUserRepository::class,
    ];

    public function boot(): void
    {
        // A deactivated user's open sessions stop authenticating on their next request.
        Auth::provider('active-users', function (Application $app, array $config): EloquentUserProvider {
            /** @var array{model: class-string<Model>} $config */
            return (new EloquentUserProvider($app->make(Hasher::class), $config['model']))
                ->withQuery(fn (Builder $query) => $query->where('active', true));
        });
    }
}
