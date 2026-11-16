<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\json;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

function actAs(Role $role): EloquentUser
{
    $user = EloquentUser::factory()->role($role)->create();
    actingAs($user, 'web');

    return $user;
}

/** @return array{category: int, item: int, variant: int} */
function seedMenu(): array
{
    actAs(Role::Admin);
    $category = createdId(postJson('/api/categories', ['name' => 'Uramaki', 'sort' => 1, 'active' => true])->assertCreated());
    $item = createdId(postJson('/api/items', ['category_id' => $category, 'name' => 'Philadelphia', 'note' => null, 'active' => true, 'price_cents' => 3200])
        ->assertCreated());
    $variant = DB::table('variants')->where('item_id', $item)->value('id');
    assert(is_int($variant));

    return compact('category', 'item', 'variant');
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

it('builds the menu tree with variants and add-ons for any role', function (): void {
    ['category' => $c, 'item' => $i, 'variant' => $v] = seedMenu();
    $half = createdId(postJson("/api/items/{$i}/variants", ['name' => 'Meio', 'price_cents' => 1700, 'available' => true, 'sort' => 1])->assertCreated());
    $gone = createdId(postJson("/api/items/{$i}/variants", ['name' => 'Velho', 'price_cents' => 100, 'available' => true, 'sort' => 2]));
    deleteJson("/api/variants/{$gone}")->assertNoContent();
    $onItem = createdId(postJson('/api/addons', ['item_id' => $i, 'name' => 'Cream cheese', 'price_cents' => 400, 'active' => true])->assertCreated());
    $onCategory = createdId(postJson('/api/addons', ['category_id' => $c, 'name' => 'Tarê', 'price_cents' => 0, 'active' => true]));

    actAs(Role::Waitress);

    getJson('/api/menu')->assertOk()->assertExactJson(['categories' => [[
        'id' => $c, 'name' => 'Uramaki', 'sort' => 1, 'active' => true,
        'addons' => [['id' => $onCategory, 'item_id' => null, 'category_id' => $c, 'name' => 'Tarê', 'price_cents' => 0, 'active' => true]],
        'items' => [[
            'id' => $i, 'category_id' => $c, 'name' => 'Philadelphia', 'note' => null, 'active' => true,
            'variants' => [
                ['id' => $v, 'item_id' => $i, 'name' => '', 'price_cents' => 3200, 'available' => true, 'sort' => 0],
                ['id' => $half, 'item_id' => $i, 'name' => 'Meio', 'price_cents' => 1700, 'available' => true, 'sort' => 1],
            ],
            'addons' => [['id' => $onItem, 'item_id' => $i, 'category_id' => null, 'name' => 'Cream cheese', 'price_cents' => 400, 'active' => true]],
        ]],
    ]]]);
});

it('requires a session to read the menu', function (): void {
    getJson('/api/menu')->assertUnauthorized();
});

it('returns each saved record in its exact shape', function (): void {
    ['category' => $c, 'item' => $i, 'variant' => $v] = seedMenu();

    putJson("/api/categories/{$c}", ['name' => 'Hot', 'sort' => 3, 'active' => false])->assertOk()
        ->assertExactJson(['id' => $c, 'name' => 'Hot', 'sort' => 3, 'active' => false]);
    putJson("/api/items/{$i}", ['category_id' => $c, 'name' => 'Hot Philadelphia', 'note' => 'empanado'])->assertOk()
        ->assertExactJson(['id' => $i, 'category_id' => $c, 'name' => 'Hot Philadelphia', 'note' => 'empanado', 'active' => true]);
    putJson("/api/variants/{$v}", ['name' => 'Inteiro 8un', 'price_cents' => 3500, 'sort' => 0])->assertOk()
        ->assertExactJson(['id' => $v, 'item_id' => $i, 'name' => 'Inteiro 8un', 'price_cents' => 3500, 'available' => true, 'sort' => 0]);
    $a = createdId(postJson('/api/addons', ['item_id' => $i, 'name' => 'Tarê', 'price_cents' => 0, 'active' => true]));
    putJson("/api/addons/{$a}", ['category_id' => $c, 'name' => 'Tarê extra', 'price_cents' => 200, 'active' => false])->assertOk()
        ->assertExactJson(['id' => $a, 'item_id' => null, 'category_id' => $c, 'name' => 'Tarê extra', 'price_cents' => 200, 'active' => false]);
});

it('audits every mutation as the acting user', function (): void {
    ['item' => $i] = seedMenu();
    $admin = actAs(Role::Admin);

    putJson("/api/items/{$i}/active", ['active' => false, 'note' => 'acabou salmão'])->assertOk();

    expect(lastAudit())->toMatchArray([
        'user_id' => $admin->id, 'entity' => 'item', 'entity_id' => (string) $i, 'action' => 'set_active', 'note' => 'acabou salmão',
        'summary' => ['category_id' => DB::table('items')->value('category_id'), 'name' => 'Philadelphia', 'note' => null, 'active' => false],
    ])->and(DB::table('audit_log')->pluck('action', 'entity')->all())->toMatchArray(['category' => 'create', 'variant' => 'create']);
});

it('lets kitchen toggle availability but not edit the menu', function (): void {
    ['category' => $c, 'item' => $i, 'variant' => $v] = seedMenu();
    actAs(Role::Kitchen);

    putJson("/api/items/{$i}/active", ['active' => false])->assertOk()->assertJsonPath('active', false);
    putJson("/api/variants/{$v}/available", ['available' => false])->assertOk()->assertJsonPath('available', false);
    putJson("/api/categories/{$c}", ['name' => 'X', 'sort' => 0, 'active' => true])->assertForbidden();
});

it('forbids waitresses from changing the menu', function (string $method, string $uri): void {
    ['item' => $i, 'variant' => $v] = seedMenu();
    actAs(Role::Waitress);
    $uri = str_replace(['{i}', '{v}'], [(string) $i, (string) $v], $uri);

    json($method, $uri)->assertForbidden()->assertJsonPath('code', 'forbidden');
})->with([
    ['POST', '/api/categories'],
    ['POST', '/api/items'],
    ['PUT', '/api/categories/1'],
    ['PUT', '/api/items/{i}'],
    ['PUT', '/api/items/{i}/active'],
    ['POST', '/api/items/{i}/variants'],
    ['PUT', '/api/variants/{v}'],
    ['PUT', '/api/variants/{v}/available'],
    ['DELETE', '/api/variants/{v}'],
    ['POST', '/api/addons'],
    ['PUT', '/api/addons/1'],
]);

it('ignores availability on edits so a kitchen toggle sticks', function (): void {
    ['category' => $c, 'item' => $i, 'variant' => $v] = seedMenu();
    actAs(Role::Kitchen);
    putJson("/api/items/{$i}/active", ['active' => false])->assertOk();
    putJson("/api/variants/{$v}/available", ['available' => false])->assertOk();
    actAs(Role::Admin);

    putJson("/api/items/{$i}", ['category_id' => $c, 'name' => 'Philadelphia', 'active' => true])->assertOk()->assertJsonPath('active', false);
    putJson("/api/variants/{$v}", ['name' => '', 'price_cents' => 3300, 'available' => true, 'sort' => 0])->assertOk()->assertJsonPath('available', false);
});

it('answers 404 for ids too large for the database', function (string $method, string $uri): void {
    actAs(Role::Admin);

    json($method, $uri, ['active' => true])->assertNotFound()->assertJsonPath('code', 'not_found');
})->with([
    ['PUT', '/api/variants/99999999999999999999'],
    ['PUT', '/api/items/99999999999999999999/active'],
    ['POST', '/api/items/99999999999999999999/variants'],
]);

it('soft deletes a variant with an audit note and keeps the last one', function (): void {
    ['item' => $i, 'variant' => $v] = seedMenu();
    $half = createdId(postJson("/api/items/{$i}/variants", ['name' => 'Meio', 'price_cents' => 1700, 'available' => true, 'sort' => 1]));

    deleteJson("/api/variants/{$half}?note=saiu")->assertNoContent();

    expect(DB::table('variants')->where('id', $half)->value('deleted_at'))->not->toBeNull()
        ->and(lastAudit())->toMatchArray(['entity' => 'variant', 'action' => 'delete', 'note' => 'saiu', 'summary' => ['name' => 'Meio']]);
    putJson("/api/variants/{$half}", ['name' => 'Meio', 'price_cents' => 1, 'sort' => 1])->assertNotFound();
    deleteJson("/api/variants/{$v}")->assertStatus(409)
        ->assertExactJson(['code' => 'menu.last_variant', 'message' => 'An item keeps at least one variant.']);
});

it('answers 404 with the missing entity', function (): void {
    actAs(Role::Admin);

    postJson('/api/items', ['category_id' => 999999, 'name' => 'X', 'active' => true, 'price_cents' => 0])->assertNotFound()
        ->assertExactJson(['code' => 'menu.not_found', 'message' => 'No category with id 999999.', 'entity' => 'category']);
});

it('rejects an add-on on both an item and a category', function (): void {
    ['category' => $c, 'item' => $i] = seedMenu();

    postJson('/api/addons', ['item_id' => $i, 'category_id' => $c, 'name' => 'X', 'price_cents' => 0, 'active' => true])
        ->assertUnprocessable()->assertJsonPath('code', 'menu.invalid_addon_target');
    expect(DB::table('addons')->count())->toBe(0);
});

it('validates prices and required fields', function (): void {
    ['item' => $i] = seedMenu();

    postJson("/api/items/{$i}/variants", ['name' => 'Meio', 'price_cents' => -1, 'available' => true, 'sort' => 0])
        ->assertUnprocessable()->assertJsonPath('code', 'validation')->assertJsonValidationErrors(['price_cents']);
    postJson('/api/items', ['name' => 'X'])->assertJsonValidationErrors(['category_id', 'active', 'price_cents']);
});

it('rolls back the item when its default variant cannot be stored', function (): void {
    ['category' => $c] = seedMenu();
    DB::statement('ALTER TABLE variants ADD CONSTRAINT test_block CHECK (price_cents <> 777)');

    postJson('/api/items', ['category_id' => $c, 'name' => 'Rollback', 'active' => true, 'price_cents' => 777])->assertStatus(500);

    expect(DB::table('items')->where('name', 'Rollback')->exists())->toBeFalse();
});
