<?php

declare(strict_types=1);

use App\Application\Audit\AuditLog;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\travelTo;

it('records who did what and when', function (): void {
    travelTo(CarbonImmutable::parse('2026-03-04 12:30:15.123456+00:00'));

    app(AuditLog::class)->record(7, 'order', 42, 'created', ['total' => 1990, 'lines' => ['Temaki']], 'phone order');

    $row = DB::table('audit_log')->sole();
    expect($row)->toMatchArray([
        'user_id' => 7,
        'entity' => 'order',
        'entity_id' => '42',
        'action' => 'created',
        'note' => 'phone order',
    ])
        ->and(json_decode(is_string($row->summary) ? $row->summary : '', true))->toBe(['lines' => ['Temaki'], 'total' => 1990])
        ->and(CarbonImmutable::parse(is_string($row->at) ? $row->at : '')->equalTo(CarbonImmutable::parse('2026-03-04 12:30:15.123456+00:00')))->toBeTrue();
});

it('records system actions without a user or note', function (): void {
    app(AuditLog::class)->record(null, 'setting', 'delivery_fee', 'updated', []);

    expect(DB::table('audit_log')->sole())->toMatchArray([
        'user_id' => null,
        'entity_id' => 'delivery_fee',
        'note' => null,
        'summary' => '[]',
    ]);
});
