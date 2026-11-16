<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\PendingCommand;

use function Pest\Laravel\artisan;
use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\assertDatabaseHas;

beforeEach(function (): void {
    config(['auth.first_admin' => ['name' => null, 'pin' => null]]);
});

it('creates an admin, asking for the PIN without echo, and audits it', function (): void {
    $command = artisan('user:create-admin', ['name' => 'Dono']);
    assert($command instanceof PendingCommand);
    $command->expectsQuestion('PIN (4 digits)', '4321')->assertSuccessful()->run();

    $user = EloquentUser::query()->sole();
    expect($user->name)->toBe('Dono')
        ->and($user->role)->toBe(Role::Admin)
        ->and($user->active)->toBeTrue()
        ->and(Hash::check('4321', $user->pin_hash))->toBeTrue();
    assertDatabaseHas('audit_log', ['user_id' => null, 'entity' => 'user', 'entity_id' => (string) $user->id, 'action' => 'seed_admin']);
});

it('has no PIN argument, so the PIN never lands in shell history', function (): void {
    expect(Artisan::call('help', ['command_name' => 'user:create-admin']))->toBe(0)
        ->and(Artisan::output())->not->toContain('pin');
});

it('falls back to ADMIN_NAME and ADMIN_PIN', function (): void {
    config(['auth.first_admin' => ['name' => 'Chefe', 'pin' => '9876']]);

    expect(Artisan::call('user:create-admin', ['--no-interaction' => true]))->toBe(0);

    expect(Hash::check('9876', EloquentUser::query()->where('name', 'Chefe')->sole()->pin_hash))->toBeTrue();
});

it('refuses a missing name, a missing or bad PIN, or a taken name', function (?string $name, ?string $pin): void {
    EloquentUser::factory()->create(['name' => 'Dono']);
    config(['auth.first_admin' => ['name' => $name, 'pin' => $pin]]);

    expect(Artisan::call('user:create-admin', ['--no-interaction' => true]))->toBe(1);
    assertDatabaseCount('users', 1);
    assertDatabaseCount('audit_log', 0);
})->with([
    'no name' => [null, '1234'],
    'no PIN, not interactive' => ['Novo', null],
    'short PIN' => ['Novo', '12'],
    'taken name' => ['dono', '1234'],
]);
