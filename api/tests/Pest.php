<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

use function Pest\Laravel\actingAs;

pest()->extend(TestCase::class)->use(RefreshDatabase::class)->in('Feature');

// Feature test helpers.

function actAs(Role $role): EloquentUser
{
    $user = EloquentUser::factory()->role($role)->create();
    actingAs($user, 'web');

    return $user;
}

/** @param  TestResponse<JsonResponse>  $response */
function createdId(TestResponse $response): int
{
    $id = $response->json('id');
    assert(is_int($id));

    return $id;
}

/** @return array<string, mixed> */
function lastAudit(): array
{
    /** @var array<string, mixed> $row */
    $row = (array) DB::table('audit_log')->orderByDesc('id')->first();
    $row['summary'] = json_decode(is_string($row['summary']) ? $row['summary'] : '', true);

    return $row;
}
