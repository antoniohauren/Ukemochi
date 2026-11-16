<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Support\Facades\Route;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

beforeEach(function (): void {
    Route::middleware(['auth:sanctum', 'role:admin,kitchen'])->get('api/_test/kitchen', fn () => ['ok' => true]);
});

it('lets listed roles through', function (Role $role): void {
    actingAs(EloquentUser::factory()->role($role)->create(), 'web');

    getJson('/api/_test/kitchen')->assertOk()->assertExactJson(['ok' => true]);
})->with([Role::Admin, Role::Kitchen]);

it('forbids other roles', function (): void {
    actingAs(EloquentUser::factory()->role(Role::Waitress)->create(), 'web');

    getJson('/api/_test/kitchen')->assertForbidden()->assertExactJson(['code' => 'forbidden', 'message' => 'Forbidden']);
});

it('answers 401 before the role check without a session', function (): void {
    getJson('/api/_test/kitchen')->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
});
