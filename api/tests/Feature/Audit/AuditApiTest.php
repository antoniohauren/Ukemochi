<?php

declare(strict_types=1);

use App\Application\Audit\AuditLog;
use App\Domain\Auth\Role;
use Carbon\CarbonImmutable;

use function Pest\Laravel\getJson;
use function Pest\Laravel\travelTo;

it('lists the change log newest first with who did it, in the exact shape', function (): void {
    travelTo(CarbonImmutable::parse('2026-11-16 12:00:00+00:00'));
    $admin = actAs(Role::Admin);
    $audit = app(AuditLog::class);
    $audit->record(null, 'backup', 'daily', 'run', ['files' => 1]);
    $audit->record($admin->id, 'order', 42, 'cancel', ['reason' => 'desistiu'], 'cliente ligou');

    $r = getJson('/api/audit')->assertOk();

    expect([$r->json('entries.0'), $r->json('entries.1')])->toBe([
        [
            'id' => $r->json('entries.0.id'), 'user_id' => $admin->id, 'user_name' => $admin->name, 'at' => '2026-11-16T12:00:00+00:00',
            'entity' => 'order', 'entity_id' => '42', 'action' => 'cancel', 'summary' => ['reason' => 'desistiu'], 'note' => 'cliente ligou',
        ],
        [
            'id' => $r->json('entries.1.id'), 'user_id' => null, 'user_name' => null, 'at' => '2026-11-16T12:00:00+00:00',
            'entity' => 'backup', 'entity_id' => 'daily', 'action' => 'run', 'summary' => ['files' => 1], 'note' => null,
        ],
    ]);
});

it('filters by record and pages with next_before', function (): void {
    actAs(Role::Admin);
    $audit = app(AuditLog::class);
    for ($i = 0; $i < 52; $i++) {
        $audit->record(null, 'order', 7, 'update', ['i' => $i]);
    }
    $audit->record(null, 'order', 8, 'update', []);

    $first = getJson('/api/audit?entity=order&entity_id=7')->assertOk();
    expect($first->json('entries'))->toHaveCount(50)
        ->and($first->json('entries.0.summary'))->toBe(['i' => 51]);
    $before = $first->json('next_before');
    assert(is_int($before));
    $second = getJson("/api/audit?entity=order&entity_id=7&before={$before}")->assertOk();
    expect($second->json('entries.*.summary.i'))->toBe([1, 0])
        ->and($second->json('next_before'))->toBeNull();
    getJson('/api/audit?before=0')->assertStatus(422)->assertJsonValidationErrors('before');
});

it('is admin only', function (): void {
    actAs(Role::Waitress);
    getJson('/api/audit')->assertForbidden();
});
