<?php

declare(strict_types=1);

namespace App\Providers;

use App\Application\Audit\AuditLog;
use App\Application\Clock;
use App\Application\Health\DatabaseProbe;
use App\Infrastructure\Audit\DatabaseAuditLog;
use App\Infrastructure\Health\ConnectionDatabaseProbe;
use App\Infrastructure\SystemClock;
use Illuminate\Support\ServiceProvider;

/** Composition root: binds application ports to infrastructure. */
class AppServiceProvider extends ServiceProvider
{
    /** @var array<class-string, class-string> */
    public array $bindings = [
        AuditLog::class => DatabaseAuditLog::class,
        Clock::class => SystemClock::class,
        DatabaseProbe::class => ConnectionDatabaseProbe::class,
    ];
}
