<?php

declare(strict_types=1);

use App\Application\Menu\MenuRepository;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\Variant;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/** @return array{MenuRepository, Item} */
function menuRepoWithItem(): array
{
    $repo = app(MenuRepository::class);
    $category = $repo->saveCategory(new Category(0, 'Bebidas', 0, true));

    return [$repo, $repo->saveItem(new Item(0, $category->id, 'Coca', null, true, 0))];
}

it('stores, finds and updates a variant', function (): void {
    [$repo, $item] = menuRepoWithItem();
    $variant = $repo->saveVariant(new Variant(0, $item->id, 'Zero', 600, true, 1));
    $repo->saveVariant(new Variant($variant->id, $item->id, 'Zero lata', 650, false, 2));

    expect($repo->findVariant($variant->id))->toEqual(new Variant($variant->id, $item->id, 'Zero lata', 650, true, 2));
});

it('toggles only the availability column and returns the fresh record', function (): void {
    [$repo, $item] = menuRepoWithItem();
    $variant = $repo->saveVariant(new Variant(0, $item->id, 'Zero', 600, true, 1));
    // A concurrent price edit lands between the toggle's read and write.
    DB::table('variants')->where('id', $variant->id)->update(['price_cents' => 700]);
    DB::table('items')->where('id', $item->id)->update(['name' => 'Coca-Cola']);

    expect($repo->setVariantAvailable($variant->id, false))->toEqual(new Variant($variant->id, $item->id, 'Zero', 700, false, 1))
        ->and($repo->setItemActive($item->id, false))->toEqual(new Item($item->id, $item->categoryId, 'Coca-Cola', null, false, 0))
        ->and($repo->setItemActive(999999, false))->toBeNull();
});

it('does not change availability on save of an existing record', function (): void {
    [$repo, $item] = menuRepoWithItem();
    $variant = $repo->saveVariant(new Variant(0, $item->id, 'Zero', 600, false, 1));

    expect($repo->saveVariant(new Variant($variant->id, $item->id, 'Zero', 650, true, 1))->available)->toBeFalse()
        ->and($repo->saveItem(new Item($item->id, $item->categoryId, 'Coca', null, false, 0))->active)->toBeTrue();
});

it('hides soft-deleted variants from find, count and menu', function (): void {
    [$repo, $item] = menuRepoWithItem();
    $keep = $repo->saveVariant(new Variant(0, $item->id, 'Normal', 600, true, 0));
    $gone = $repo->saveVariant(new Variant(0, $item->id, 'Zero', 600, true, 1));

    $repo->deleteVariant($gone->id);

    expect($repo->findVariant($gone->id))->toBeNull()
        ->and($repo->countVariants($item->id))->toBe(1)
        ->and($repo->menu()->variants)->toEqual([$keep])
        ->and(DB::table('variants')->count())->toBe(2);
});

it('enforces add-on target and price rules in the schema', function (array $row): void {
    [, $item] = menuRepoWithItem();
    DB::table('addons')->insert(['name' => 'X', 'active' => true, 'category_id' => $item->categoryId, ...$row]);
})->with([
    'no target' => [['price_cents' => 0, 'category_id' => null]],
    'negative price' => [['price_cents' => -1]],
])->throws(QueryException::class);

it('lists ids to reorder and writes only the sort column', function (): void {
    [$repo, $item] = menuRepoWithItem();
    $other = $repo->saveCategory(new Category(0, 'Uramaki', 5, true));
    $a = $repo->saveVariant(new Variant(0, $item->id, 'Lata', 600, true, 0));
    $b = $repo->saveVariant(new Variant(0, $item->id, 'Garrafa', 900, true, 1));
    $gone = $repo->saveVariant(new Variant(0, $item->id, 'Velha', 100, true, 2));
    $repo->deleteVariant($gone->id);

    expect($repo->lockCategoryIds())->toBe([$item->categoryId, $other->id])
        ->and($repo->variantIds($item->id))->toBe([$a->id, $b->id]);

    $repo->setCategorySorts([$other->id => 0, $item->categoryId => 1]);
    $repo->setVariantSorts([$b->id => 0, $a->id => 1]);

    expect($repo->findCategory($other->id))->toEqual(new Category($other->id, 'Uramaki', 0, true))
        ->and($repo->findVariant($a->id))->toEqual(new Variant($a->id, $item->id, 'Lata', 600, true, 1))
        ->and($repo->findVariant($b->id)?->sort)->toBe(0);
});
