<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use App\Http\Requests\LoginRequest;
use App\Infrastructure\Auth\EloquentUser;
use Carbon\CarbonImmutable;
use Illuminate\Auth\SessionGuard;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

use function Pest\Laravel\assertAuthenticatedAs;
use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertGuest;
use function Pest\Laravel\get;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\travel;
use function Pest\Laravel\travelTo;
use function Pest\Laravel\withCookie;
use function Pest\Laravel\withHeader;
use function Pest\Laravel\withSession;

beforeEach(function (): void {
    // Requests from a SANCTUM_STATEFUL_DOMAINS origin get the session middleware, like the PWAs.
    withHeader('Origin', 'https://localhost');
});

function amanda(): EloquentUser
{
    return EloquentUser::factory()->create(['name' => 'Amanda', 'role' => Role::Waitress]);
}

it('hands out the XSRF-TOKEN cookie', function (): void {
    get('/sanctum/csrf-cookie')->assertNoContent()->assertCookie('XSRF-TOKEN');
});

it('logs in by name and PIN and returns the user', function (): void {
    $user = amanda();

    postJson('/api/login', ['name' => 'amanda', 'pin' => '1234'])
        ->assertOk()
        ->assertExactJson(['id' => $user->id, 'name' => 'Amanda', 'role' => 'waitress']);

    assertAuthenticatedAs($user, 'web');
    assertDatabaseHas('audit_log', ['user_id' => $user->id, 'entity' => 'user', 'entity_id' => (string) $user->id, 'action' => 'login']);
});

it('sets an httpOnly, secure, lax session cookie that lives 12 hours', function (): void {
    amanda();
    travelTo(CarbonImmutable::parse('2026-11-16 10:00:00'));

    $response = postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234']);

    $name = config('session.cookie');
    $cookie = collect($response->headers->getCookies())->first(fn ($c) => $c->getName() === $name);
    expect($cookie)->not->toBeNull()
        ->and($cookie?->isHttpOnly())->toBeTrue()
        ->and($cookie?->isSecure())->toBeTrue()
        ->and($cookie?->getSameSite())->toBe('lax')
        ->and($cookie?->getExpiresTime())->toBe(CarbonImmutable::parse('2026-11-16 22:00:00')->getTimestamp());
});

it('returns the session user from /me', function (): void {
    $user = amanda();
    postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234']);

    getJson('/api/me')->assertOk()->assertExactJson(['id' => $user->id, 'name' => 'Amanda', 'role' => 'waitress']);
});

it('answers 401 on /me without a session', function (): void {
    getJson('/api/me')->assertUnauthorized()->assertExactJson(['code' => 'unauthenticated', 'message' => 'Unauthenticated.']);
});

it('stops authenticating a session once the user is deactivated', function (): void {
    $user = EloquentUser::factory()->inactive()->create();

    withSession(['login_web_'.sha1(SessionGuard::class) => $user->id])->getJson('/api/me')->assertUnauthorized();
});

it('logs out, ends the session and audits it', function (): void {
    $user = amanda();
    postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234']);

    postJson('/api/logout')->assertNoContent();

    assertGuest('web');
    getJson('/api/me')->assertUnauthorized();
    assertDatabaseHas('audit_log', ['user_id' => $user->id, 'action' => 'logout']);
});

it('answers 401 on logout without a session', function (): void {
    postJson('/api/logout')->assertUnauthorized();
});

it('rejects a wrong PIN without saying whether the name exists', function (string $name, string $pin): void {
    $ids = ['Amanda' => amanda()->id, 'Bia' => EloquentUser::factory()->inactive()->create(['name' => 'Bia'])->id];

    postJson('/api/login', ['name' => $name, 'pin' => $pin])
        ->assertStatus(422)
        ->assertExactJson(['code' => 'auth.invalid_credentials', 'message' => 'Wrong name or PIN.']);

    assertGuest('web');
    assertDatabaseHas('audit_log', ['user_id' => null, 'entity' => 'auth', 'entity_id' => (string) ($ids[$name] ?? 'unknown'), 'action' => 'login_failed']);
    expect(DB::table('audit_log')->where('summary', 'like', "%{$name}%")->exists())->toBeFalse();
})->with([
    'wrong PIN' => ['Amanda', '0000'],
    'unknown name' => ['Nobody', '1234'],
    'inactive user' => ['Bia', '1234'],
]);

it('validates name and a 4-digit PIN', function (array $body, array $fields): void {
    postJson('/api/login', $body)->assertStatus(422)->assertJsonPath('code', 'validation')->assertOnlyJsonValidationErrors($fields);
    assertDatabaseCount('audit_log', 0);
})->with([
    'missing both' => [[], ['name', 'pin']],
    'short PIN' => [['name' => 'Amanda', 'pin' => '123'], ['pin']],
    'long PIN' => [['name' => 'Amanda', 'pin' => '12345'], ['pin']],
    'letters' => [['name' => 'Amanda', 'pin' => '12a4'], ['pin']],
    'number not string' => [['name' => 'Amanda', 'pin' => 1234], ['pin']],
    'blank name' => [['name' => '   ', 'pin' => '1234'], ['name']],
]);

it('locks the name out with a growing delay after wrong PINs', function (): void {
    amanda();
    travelTo(CarbonImmutable::parse('2026-11-16 10:00:00'));

    foreach ([1, 2, 4, 8, 16, 30, 30] as $delay) {
        postJson('/api/login', ['name' => 'Amanda', 'pin' => '0000'])->assertStatus(422);
        // Even the right PIN is refused while locked.
        postJson('/api/login', ['name' => 'amanda', 'pin' => '1234'])
            ->assertStatus(429)
            ->assertExactJson(['code' => 'auth.throttled', 'message' => 'Too many wrong PINs. Try again shortly.', 'retry_after' => $delay]);
        travel($delay)->seconds();
    }

    postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234'])->assertOk();
});

it('resets the delay after a successful login', function (): void {
    amanda();
    travelTo(CarbonImmutable::parse('2026-11-16 10:00:00'));
    foreach ([1, 2, 4] as $delay) {
        postJson('/api/login', ['name' => 'Amanda', 'pin' => '0000']);
        travel($delay)->seconds();
    }
    postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234'])->assertOk();

    postJson('/api/login', ['name' => 'Amanda', 'pin' => '0000'])->assertStatus(422);
    postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234'])->assertStatus(429)->assertJsonPath('retry_after', 1);
});

it('locks out every spelling of the same name', function (string $variant): void {
    amanda();

    postJson('/api/login', ['name' => 'Amanda', 'pin' => '0000'])->assertStatus(422);

    postJson('/api/login', ['name' => $variant, 'pin' => '1234'])->assertStatus(429);
})->with(['AMANDA', '  amanda  ', 'aMaNdA']);

it('locks out every spelling of an unknown name', function (): void {
    postJson('/api/login', ['name' => 'Nobody', 'pin' => '0000'])->assertStatus(422);

    postJson('/api/login', ['name' => ' NOBODY ', 'pin' => '0000'])->assertStatus(429);
});

it('rejects a PIN with a trailing newline in the form request', function (): void {
    $validator = Validator::make(['name' => 'Amanda', 'pin' => "1234\n"], (new LoginRequest)->rules());

    expect($validator->errors()->keys())->toBe(['pin']);
});

it('gives the session a new id on login', function (): void {
    amanda();
    $cookie = config()->string('session.cookie');
    $planted = str_repeat('a', 40);
    // Control: a request carrying the planted id keeps it.
    expect(withCookie($cookie, $planted)->get('/sanctum/csrf-cookie')->getCookie($cookie)?->getValue())->toBe($planted);

    $after = withCookie($cookie, $planted)->postJson('/api/login', ['name' => 'Amanda', 'pin' => '1234'])->assertOk()->getCookie($cookie)?->getValue();

    expect($after)->toBeString()
        ->and($after === $planted)->toBeFalse();
});

it('throttles per name, not globally', function (): void {
    amanda();
    EloquentUser::factory()->create(['name' => 'Carla']);

    postJson('/api/login', ['name' => 'Amanda', 'pin' => '0000'])->assertStatus(422);

    postJson('/api/login', ['name' => 'Carla', 'pin' => '1234'])->assertOk();
});
