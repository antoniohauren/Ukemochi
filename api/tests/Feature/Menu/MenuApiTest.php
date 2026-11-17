<?php

declare(strict_types=1);

use App\Domain\Auth\Role;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\json;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

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
            'id' => $i, 'category_id' => $c, 'name' => 'Philadelphia', 'note' => null, 'active' => true, 'sort' => 0,
            'variants' => [
                ['id' => $v, 'item_id' => $i, 'name' => '', 'price_cents' => 3200, 'available' => true, 'sort' => 0, 'print_name' => null],
                ['id' => $half, 'item_id' => $i, 'name' => 'Meio', 'price_cents' => 1700, 'available' => true, 'sort' => 1, 'print_name' => null],
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
        ->assertExactJson(['id' => $i, 'category_id' => $c, 'name' => 'Hot Philadelphia', 'note' => 'empanado', 'active' => true, 'sort' => 0]);
    putJson("/api/variants/{$v}", ['name' => 'Inteiro 8un', 'price_cents' => 3500, 'sort' => 0, 'print_name' => 'Phila 8un'])->assertOk()
        ->assertExactJson(['id' => $v, 'item_id' => $i, 'name' => 'Inteiro 8un', 'price_cents' => 3500, 'available' => true, 'sort' => 0, 'print_name' => 'Phila 8un']);
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
        'summary' => ['category_id' => DB::table('items')->value('category_id'), 'name' => 'Philadelphia', 'note' => null, 'active' => false, 'sort' => 0],
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
    ['PUT', '/api/categories/order'],
    ['PUT', '/api/items/{i}/variants/order'],
    ['PUT', '/api/categories/1/items/order'],
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
    ['PUT', '/api/items/99999999999999999999/variants/order'],
    ['PUT', '/api/categories/99999999999999999999/items/order'],
]);

it('reorders categories, audits once and keeps sort on later edits', function (): void {
    ['category' => $a] = seedMenu();
    $b = createdId(postJson('/api/categories', ['name' => 'Bebidas', 'sort' => 2, 'active' => true]));
    $audits = DB::table('audit_log')->count();

    putJson('/api/categories/order', ['ids' => [$b, $a]])->assertNoContent();

    expect(getJson('/api/menu')->json('categories.*.id'))->toBe([$b, $a])
        ->and(DB::table('categories')->orderBy('id')->pluck('sort', 'id')->all())->toBe([$a => 1, $b => 0])
        ->and(DB::table('audit_log')->count())->toBe($audits + 1)
        ->and(lastAudit())->toMatchArray(['entity' => 'category', 'entity_id' => 'all', 'action' => 'reorder', 'summary' => ['ids' => [$b, $a]]]);
});

it('reorders an item variants, leaving deleted ones out', function (): void {
    ['item' => $i, 'variant' => $v] = seedMenu();
    $half = createdId(postJson("/api/items/{$i}/variants", ['name' => 'Meio', 'price_cents' => 1700, 'available' => true, 'sort' => 1]));
    $gone = createdId(postJson("/api/items/{$i}/variants", ['name' => 'Velho', 'price_cents' => 100, 'available' => true, 'sort' => 2]));
    deleteJson("/api/variants/{$gone}")->assertNoContent();

    putJson("/api/items/{$i}/variants/order", ['ids' => [$half, $v]])->assertNoContent();

    expect(getJson('/api/menu')->json('categories.0.items.0.variants.*.id'))->toBe([$half, $v])
        ->and(lastAudit())->toMatchArray(['entity' => 'item', 'entity_id' => (string) $i, 'action' => 'reorder', 'summary' => ['ids' => [$half, $v]]]);
    putJson("/api/items/{$i}/variants/order", ['ids' => [$half, $v, $gone]])->assertStatus(422)
        ->assertExactJson(['code' => 'menu.invalid_order', 'message' => 'The order must list every row exactly once.']);
});

it('puts new items last in their category and keeps their place on edits', function (): void {
    ['category' => $c, 'item' => $a] = seedMenu();
    $b = createdId(postJson('/api/items', ['category_id' => $c, 'name' => 'Atum', 'active' => true, 'price_cents' => 2000])->assertCreated()
        ->assertJsonPath('sort', 1));

    putJson("/api/items/{$a}", ['category_id' => $c, 'name' => 'Zebra'])->assertOk()->assertJsonPath('sort', 0);

    expect(getJson('/api/menu')->json('categories.0.items.*.id'))->toBe([$a, $b]);
});

it('puts an item last when it moves to another category', function (): void {
    ['category' => $c, 'item' => $a] = seedMenu();
    $other = createdId(postJson('/api/categories', ['name' => 'Hots', 'sort' => 2, 'active' => true]));
    createdId(postJson('/api/items', ['category_id' => $other, 'name' => 'Hot roll', 'active' => true, 'price_cents' => 2000]));

    putJson("/api/items/{$a}", ['category_id' => $other, 'name' => 'Philadelphia'])->assertOk()->assertJsonPath('sort', 1);
});

it('reorders a category items and audits once', function (): void {
    ['category' => $c, 'item' => $a] = seedMenu();
    $b = createdId(postJson('/api/items', ['category_id' => $c, 'name' => 'Atum', 'active' => true, 'price_cents' => 2000]));
    $audits = DB::table('audit_log')->count();

    putJson("/api/categories/{$c}/items/order", ['ids' => [$b, $a]])->assertNoContent();

    expect(getJson('/api/menu')->json('categories.0.items.*.id'))->toBe([$b, $a])
        ->and(DB::table('audit_log')->count())->toBe($audits + 1)
        ->and(lastAudit())->toMatchArray(['entity' => 'category', 'entity_id' => (string) $c, 'action' => 'reorder_items', 'summary' => ['ids' => [$b, $a]]]);
    putJson("/api/categories/{$c}/items/order", ['ids' => [$b]])->assertStatus(422)->assertJsonPath('code', 'menu.invalid_order');
    putJson('/api/categories/999999/items/order', ['ids' => [$b, $a]])->assertNotFound()->assertJsonPath('code', 'menu.not_found');
});

it('refuses an order that is not the full set of categories and changes nothing', function (): void {
    ['category' => $a] = seedMenu();
    $b = createdId(postJson('/api/categories', ['name' => 'Bebidas', 'sort' => 2, 'active' => true]));
    $audits = DB::table('audit_log')->count();

    foreach ([[$a], [$a, $b, 999]] as $ids) {
        putJson('/api/categories/order', ['ids' => $ids])->assertStatus(422)
            ->assertExactJson(['code' => 'menu.invalid_order', 'message' => 'The order must list every row exactly once.']);
    }

    expect(DB::table('categories')->orderBy('id')->pluck('sort')->all())->toBe([1, 2])
        ->and(DB::table('audit_log')->count())->toBe($audits);
});

it('validates the order body', function (mixed $ids): void {
    seedMenu();

    putJson('/api/categories/order', ['ids' => $ids])->assertUnprocessable()->assertJsonPath('code', 'validation');
})->with([
    'not a list' => [['x' => 1]],
    'not integers' => [['a']],
    'a duplicate' => [[1, 1]],
    'zero' => [[0]],
    'missing' => [null],
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
