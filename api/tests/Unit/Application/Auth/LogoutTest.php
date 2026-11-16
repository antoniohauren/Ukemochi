<?php

declare(strict_types=1);

use App\Application\Auth\Logout;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemorySessionAuth;

it('ends the session and audits who logged out', function (): void {
    $session = new InMemorySessionAuth;
    $session->userId = 7;
    $audit = new InMemoryAuditLog;

    (new Logout($session, $audit))->execute();

    expect($session->userId)->toBeNull()
        ->and($audit->entries)->toBe([
            ['userId' => 7, 'entity' => 'user', 'entityId' => 7, 'action' => 'logout', 'summary' => [], 'note' => null],
        ]);
});

it('writes no audit row without a session', function (): void {
    $audit = new InMemoryAuditLog;

    (new Logout(new InMemorySessionAuth, $audit))->execute();

    expect($audit->entries)->toBe([]);
});
