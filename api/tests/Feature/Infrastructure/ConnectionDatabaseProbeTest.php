<?php

declare(strict_types=1);

use App\Infrastructure\Health\ConnectionDatabaseProbe;
use Illuminate\Support\Facades\DB;

it('is up when the database answers', function (): void {
    expect((new ConnectionDatabaseProbe(DB::connection()))->isUp())->toBeTrue();
});

it('is down when the database cannot be reached', function (): void {
    config(['database.connections.unreachable' => [...(array) config('database.connections.pgsql'), 'port' => 1]]);

    expect((new ConnectionDatabaseProbe(DB::connection('unreachable')))->isUp())->toBeFalse();
});

it('gives up after the connect timeout when the database never answers', function (): void {
    // Listens but never replies, so only the connect timeout ends the attempt.
    $silent = stream_socket_server('tcp://127.0.0.1:0');
    assert(is_resource($silent));
    $port = (int) parse_url('tcp://'.stream_socket_get_name($silent, false), PHP_URL_PORT);
    config(['database.connections.silent' => [...(array) config('database.connections.pgsql'), 'host' => '127.0.0.1', 'port' => $port]]);

    $start = microtime(true);
    expect((new ConnectionDatabaseProbe(DB::connection('silent')))->isUp())->toBeFalse()
        ->and(microtime(true) - $start)->toBeLessThan(5.0);
});
