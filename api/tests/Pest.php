<?php

declare(strict_types=1);

use App\Application\Menu\MenuRepository;
use App\Domain\Auth\Role;
use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\Variant;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;

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

/** @return array{variant: int, half: int, addon: int} Philadelphia: Inteiro R$32, Meio R$17; add-on Cream cheese R$3 */
function orderApiMenu(): array
{
    $menu = app(MenuRepository::class);
    $category = $menu->saveCategory(new Category(0, 'Uramaki', 0, true));
    $item = $menu->saveItem(new Item(0, $category->id, 'Philadelphia', null, true, 0));

    return [
        'variant' => $menu->saveVariant(new Variant(0, $item->id, 'Inteiro', 3200, true, 0))->id,
        'half' => $menu->saveVariant(new Variant(0, $item->id, 'Meio', 1700, true, 1))->id,
        'addon' => $menu->saveAddon(new Addon(0, $item->id, null, 'Cream cheese', 300, true))->id,
    ];
}

/**
 * @param  array<string, mixed>  $body
 * @return array<string, mixed>
 */
function dineInBody(int $variant, array $body = []): array
{
    return ['type' => 'dine_in', 'customer_name' => 'Amanda', 'lines' => [['variant_id' => $variant, 'qty' => 1]], ...$body];
}

/**
 * @param  array<string, mixed>  $body
 * @return TestResponse<JsonResponse>
 */
function placeOrder(int $variant, array $body = []): TestResponse
{
    return postJson('/api/orders', dineInBody($variant, $body))->assertCreated();
}

/** @param  TestResponse<JsonResponse>  $response */
function lineId(TestResponse $response, int $index = 0): int
{
    $id = $response->json("lines.{$index}.id");
    assert(is_int($id));

    return $id;
}
