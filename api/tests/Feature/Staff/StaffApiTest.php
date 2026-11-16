<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;

use function Pest\Laravel\getJson;
use function Pest\Laravel\json;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\withHeader;
use function Pest\Laravel\withSession;

it('lists users by name without their PIN hash', function (): void {
    $admin = actAs(Role::Admin);
    $admin->forceFill(['name' => 'Zé'])->save();
    $bia = EloquentUser::factory()->role(Role::Kitchen)->inactive()->create(['name' => 'bia']);
    $amanda = EloquentUser::factory()->create(['name' => 'Amanda']);

    getJson('/api/users')->assertOk()->assertExactJson(['users' => [
        ['id' => $amanda->id, 'name' => 'Amanda', 'role' => 'waitress', 'active' => true],
        ['id' => $bia->id, 'name' => 'bia', 'role' => 'kitchen', 'active' => false],
        ['id' => $admin->id, 'name' => 'Zé', 'role' => 'admin', 'active' => true],
    ]]);
});

it('creates a user who can then log in, and audits it without the PIN', function (): void {
    $admin = actAs(Role::Admin);
    $id = createdId(postJson('/api/users', ['name' => 'Amanda', 'role' => 'waitress', 'pin' => '1234', 'active' => true])
        ->assertCreated());

    getJson('/api/users')->assertJsonFragment(['id' => $id, 'name' => 'Amanda', 'role' => 'waitress', 'active' => true]);
    expect(lastAudit())->toMatchArray([
        'user_id' => $admin->id, 'entity' => 'user', 'entity_id' => (string) $id, 'action' => 'create',
        'summary' => ['name' => 'Amanda', 'role' => 'waitress', 'active' => true],
    ]);

    auth('web')->logout();
    postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234'])->assertOk();
});

it('answers the created user in the exact shape', function (): void {
    actAs(Role::Admin);
    $response = postJson('/api/users', ['name' => 'Bia', 'role' => 'kitchen', 'pin' => '1234', 'active' => false])->assertCreated();

    $response->assertExactJson(['id' => createdId($response), 'name' => 'Bia', 'role' => 'kitchen', 'active' => false]);
});

it('updates name, role and active', function (): void {
    actAs(Role::Admin);
    $user = EloquentUser::factory()->create(['name' => 'Amanda']);

    putJson("/api/users/{$user->id}", ['name' => 'Amanda S', 'role' => 'kitchen', 'active' => false])
        ->assertOk()->assertExactJson(['id' => $user->id, 'name' => 'Amanda S', 'role' => 'kitchen', 'active' => false]);
    expect(lastAudit())->toMatchArray(['action' => 'update', 'summary' => ['name' => 'Amanda S', 'role' => 'kitchen', 'active' => false]]);
});

it('resets the PIN and audits it without the PIN', function (): void {
    $admin = actAs(Role::Admin);
    $user = EloquentUser::factory()->create();

    putJson("/api/users/{$user->id}/pin", ['pin' => '4321'])->assertNoContent();

    expect(Hash::check('4321', $user->fresh()->pin_hash ?? ''))->toBeTrue()
        ->and(lastAudit())->toMatchArray([
            'user_id' => $admin->id, 'entity' => 'user', 'entity_id' => (string) $user->id, 'action' => 'reset_pin', 'summary' => [],
        ]);
});

it('rejects a taken name ignoring case', function (): void {
    actAs(Role::Admin);
    EloquentUser::factory()->create(['name' => 'Amanda']);
    $other = EloquentUser::factory()->create(['name' => 'Bia']);

    postJson('/api/users', ['name' => 'AMANDA', 'role' => 'waitress', 'pin' => '1234', 'active' => true])
        ->assertStatus(409)->assertExactJson(['code' => 'user.name_taken', 'message' => 'A user with this name already exists.']);
    putJson("/api/users/{$other->id}", ['name' => 'amanda', 'role' => 'waitress', 'active' => true])
        ->assertStatus(409)->assertJsonPath('code', 'user.name_taken');
});

it('keeps the last active admin', function (array $body): void {
    $admin = actAs(Role::Admin);

    putJson("/api/users/{$admin->id}", ['name' => $admin->name, ...$body])->assertStatus(409)->assertExactJson([
        'code' => 'user.last_admin', 'message' => 'The last active admin cannot be deactivated or demoted.',
    ]);
    expect($admin->fresh()?->active)->toBeTrue()->and($admin->fresh()?->role)->toBe(Role::Admin);
})->with([
    'demote' => [['role' => 'waitress', 'active' => true]],
    'deactivate' => [['role' => 'admin', 'active' => false]],
]);

it('lets an admin step down while another active admin is left', function (): void {
    $admin = actAs(Role::Admin);
    EloquentUser::factory()->role(Role::Admin)->create();

    putJson("/api/users/{$admin->id}", ['name' => $admin->name, 'role' => 'waitress', 'active' => true])->assertOk();
});

it('ends a deactivated user\'s open session', function (): void {
    $user = EloquentUser::factory()->create();
    $session = ['login_web_'.sha1(SessionGuard::class) => $user->id];
    withSession($session)->getJson('/api/me')->assertOk();

    actAs(Role::Admin);
    putJson("/api/users/{$user->id}", ['name' => $user->name, 'role' => 'waitress', 'active' => false])->assertOk();

    auth()->forgetGuards();
    withSession($session)->getJson('/api/me')->assertUnauthorized();
});

it('answers 404 for an unknown user', function (): void {
    actAs(Role::Admin);

    putJson('/api/users/999999', ['name' => 'X', 'role' => 'kitchen', 'active' => true])
        ->assertNotFound()->assertJsonPath('code', 'user.not_found');
    putJson('/api/users/999999/pin', ['pin' => '1234'])->assertNotFound()->assertJsonPath('code', 'user.not_found');
});

it('validates the bodies', function (string $method, string $path, array $body, array $fields): void {
    $admin = actAs(Role::Admin);

    json($method, str_replace('{id}', (string) $admin->id, $path), $body)
        ->assertUnprocessable()->assertJsonPath('code', 'validation')->assertJsonValidationErrors($fields);
})->with([
    'create empty' => ['POST', '/api/users', [], ['name', 'role', 'pin', 'active']],
    'create bad role and pin' => ['POST', '/api/users', ['name' => 'A', 'role' => 'owner', 'pin' => '12a4', 'active' => true], ['role', 'pin']],
    'update empty' => ['PUT', '/api/users/{id}', [], ['name', 'role', 'active']],
    'pin too long' => ['PUT', '/api/users/{id}/pin', ['pin' => '12345'], ['pin']],
]);

it('is for admins only', function (Role $role): void {
    actAs($role);
    $id = EloquentUser::factory()->create()->id;

    getJson('/api/users')->assertForbidden();
    postJson('/api/users', ['name' => 'A', 'role' => 'admin', 'pin' => '1234', 'active' => true])->assertForbidden();
    putJson("/api/users/{$id}", ['name' => 'A', 'role' => 'admin', 'active' => true])->assertForbidden();
    putJson("/api/users/{$id}/pin", ['pin' => '1234'])->assertForbidden();
})->with([Role::Waitress, Role::Kitchen]);

it('answers 401 without a session', function (): void {
    getJson('/api/users')->assertUnauthorized();
});

/** A fresh request, like a new PHP process: no user or session state left from the last one. */
function freshRequest(): void
{
    // The next request's StartSession reloads the attributes from the sessions table.
    session()->flush();
    auth()->forgetGuards();
    // The session handler takes the row's user_id from `auth.driver`, a singleton guard;
    // auth:sanctum also switched the default guard.
    auth()->shouldUse('web');
    app()->forgetInstance('auth.driver');
}

/** Logs in over HTTP with the database session driver and returns the session id. */
function sessionFor(string $name, string $pin): string
{
    freshRequest();
    $id = withHeader('Origin', 'https://localhost')->postJson('/api/login', ['name' => $name, 'pin' => $pin])
        ->assertOk()->getCookie(config()->string('session.cookie'))?->getValue();
    assert(is_string($id));

    return $id;
}

/**
 * @param  array<string, mixed>  $body
 * @return TestResponse<JsonResponse>
 */
function withSessionId(string $id, string $method, string $uri, array $body = []): TestResponse
{
    freshRequest();

    return withHeader('Origin', 'https://localhost')->withCredentials()->withCookie(config()->string('session.cookie'), $id)->json($method, $uri, $body);
}

function userId(string $name): int
{
    $id = EloquentUser::query()->where('name', $name)->value('id');
    assert(is_int($id));

    return $id;
}

describe('session revocation', function (): void {
    beforeEach(function (): void {
        config(['session.driver' => 'database']);
        EloquentUser::factory()->role(Role::Admin)->create(['name' => 'Boss', 'pin_hash' => Hash::make('0000')]);
        EloquentUser::factory()->create(['name' => 'Amanda', 'pin_hash' => Hash::make('1234')]);
    });

    it('ends the user\'s open sessions on a PIN reset', function (): void {
        $admin = sessionFor('Boss', '0000');
        $amanda = sessionFor('Amanda', '1234');
        withSessionId($amanda, 'GET', '/api/me')->assertOk();
        $id = userId('Amanda');

        withSessionId($admin, 'PUT', "/api/users/{$id}/pin", ['pin' => '4321'])->assertNoContent();

        withSessionId($amanda, 'GET', '/api/me')->assertUnauthorized();
        withSessionId($admin, 'GET', '/api/me')->assertOk();
    });

    it('keeps the caller logged in on a self-reset but ends their other sessions', function (): void {
        $here = sessionFor('Boss', '0000');
        $elsewhere = sessionFor('Boss', '0000');
        $id = userId('Boss');

        $renewed = withSessionId($here, 'PUT', "/api/users/{$id}/pin", ['pin' => '4321'])->assertNoContent()
            ->getCookie(config()->string('session.cookie'))?->getValue();
        assert(is_string($renewed));

        withSessionId($renewed, 'GET', '/api/me')->assertOk();
        withSessionId($here, 'GET', '/api/me')->assertUnauthorized();
        withSessionId($elsewhere, 'GET', '/api/me')->assertUnauthorized();
    });

    it('does not revive a session when a deactivated user is reactivated', function (): void {
        $admin = sessionFor('Boss', '0000');
        $amanda = sessionFor('Amanda', '1234');
        $id = userId('Amanda');

        withSessionId($admin, 'PUT', "/api/users/{$id}", ['name' => 'Amanda', 'role' => 'waitress', 'active' => false])->assertOk();
        withSessionId($admin, 'PUT', "/api/users/{$id}", ['name' => 'Amanda', 'role' => 'waitress', 'active' => true])->assertOk();

        withSessionId($amanda, 'GET', '/api/me')->assertUnauthorized();
    });

    it('lifts the wrong-PIN delay on a PIN reset', function (): void {
        $admin = sessionFor('Boss', '0000');
        freshRequest();
        withHeader('Origin', 'https://localhost')->postJson('/api/login', ['name' => 'Amanda', 'pin' => '0000'])->assertStatus(422);
        withHeader('Origin', 'https://localhost')->postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234'])->assertStatus(429);
        $id = userId('Amanda');

        withSessionId($admin, 'PUT', "/api/users/{$id}/pin", ['pin' => '4321'])->assertNoContent();

        sessionFor('Amanda', '4321');
    });
});
