<?php

declare(strict_types=1);

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use function Pest\Laravel\get;
use function Pest\Laravel\withServerVariables;

beforeEach(function (): void {
    Route::get('/_test/ip', fn (Request $request): ?string => $request->ip());
});

it('takes the client ip from nginx on the docker network', function (): void {
    withServerVariables(['REMOTE_ADDR' => '172.18.0.5', 'HTTP_X_FORWARDED_FOR' => '192.168.0.42']);

    get('/_test/ip')->assertSeeText('192.168.0.42');
});

it('ignores forwarded headers from an untrusted address', function (): void {
    withServerVariables(['REMOTE_ADDR' => '203.0.113.9', 'HTTP_X_FORWARDED_FOR' => '192.168.0.42']);

    get('/_test/ip')->assertSeeText('203.0.113.9');
});
