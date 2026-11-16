<?php

declare(strict_types=1);

use function Pest\Laravel\get;

it('answers the health check', function (): void {
    get('/up')->assertOk();
});
