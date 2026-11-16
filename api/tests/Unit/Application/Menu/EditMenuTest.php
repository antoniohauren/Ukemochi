<?php

declare(strict_types=1);

use App\Application\Menu\EditMenu;
use App\Domain\Menu\InvalidAddonTarget;
use App\Domain\Menu\InvalidPrice;
use App\Domain\Menu\LastVariant;
use App\Domain\Menu\MenuNotFound;
use App\Domain\Menu\Variant;
use Tests\Fakes\ImmediateTransaction;
use Tests\Fakes\InMemoryAuditLog;
use Tests\Fakes\InMemoryMenuRepository;
use Tests\Fakes\InMemorySessionAuth;

/** @return array{EditMenu, InMemoryMenuRepository, InMemoryAuditLog} */
function editMenu(): array
{
    $repo = new InMemoryMenuRepository;
    $audit = new InMemoryAuditLog;
    $session = new InMemorySessionAuth;
    $session->login(7);

    return [new EditMenu($repo, new ImmediateTransaction, $audit, $session), $repo, $audit];
}

it('creates a category and audits it as the session user', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $category = $edit->createCategory('Uramaki', 2, true);

    expect($repo->categories)->toBe([$category->id => $category])
        ->and($audit->entries)->toBe([[
            'userId' => 7, 'entity' => 'category', 'entityId' => $category->id, 'action' => 'create',
            'summary' => ['name' => 'Uramaki', 'sort' => 2, 'active' => true], 'note' => null,
        ]]);
});

it('creates an item with one unnamed default variant at its price', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $category = $edit->createCategory('Uramaki', 0, true);

    $item = $edit->createItem($category->id, 'Philadelphia', 'sem cebolinha', true, 3200);

    expect(array_values($repo->variants))->toEqual([new Variant($item->id + 1, $item->id, '', 3200, true, 0)])
        ->and(array_column($audit->entries, 'action', 'entity'))->toBe(['category' => 'create', 'item' => 'create', 'variant' => 'create']);
});

it('refuses an item in a missing category', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $edit->createItem(99, 'Philadelphia', null, true, 3200);
})->throws(MenuNotFound::class);

it('refuses a negative price', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $item = $edit->createItem($edit->createCategory('Bebidas', 0, true)->id, 'Coca', null, true, 600);

    $edit->createVariant($item->id, 'Zero', -600, true, 0);
})->throws(InvalidPrice::class);

it('toggles item and variant availability with an audit note', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $item = $edit->createItem($edit->createCategory('Uramaki', 0, true)->id, 'Salmão', null, true, 3000);
    $variantId = (int) array_key_first($repo->variants);

    $edit->setItemActive($item->id, false, 'acabou salmão');
    $edit->setVariantAvailable($variantId, false, null);

    expect($repo->items[$item->id]->active)->toBeFalse()
        ->and($repo->variants[$variantId]->available)->toBeFalse()
        ->and(array_map(fn (array $e) => [$e['entity'], $e['action'], $e['note']], array_slice($audit->entries, -2)))->toBe([
            ['item', 'set_active', 'acabou salmão'],
            ['variant', 'set_available', null],
        ]);
});

it('keeps toggled availability when the item or variant is edited', function (): void {
    [$edit, $repo] = editMenu();
    $item = $edit->createItem($edit->createCategory('Uramaki', 0, true)->id, 'Salmão', null, true, 3000);
    $variantId = (int) array_key_first($repo->variants);
    $edit->setItemActive($item->id, false, null);
    $edit->setVariantAvailable($variantId, false, null);

    expect($edit->updateItem($item->id, $item->categoryId, 'Salmão grelhado', null)->active)->toBeFalse()
        ->and($edit->updateVariant($variantId, '', 3100, 0)->available)->toBeFalse();
});

it('audits summaries with snake_case keys', function (): void {
    [$edit, , $audit] = editMenu();
    $item = $edit->createItem($edit->createCategory('Uramaki', 0, true)->id, 'Salmão', null, true, 3000);

    expect(array_column($audit->entries, 'summary', 'entity'))->toMatchArray([
        'item' => ['category_id' => $item->categoryId, 'name' => 'Salmão', 'note' => null, 'active' => true],
        'variant' => ['item_id' => $item->id, 'name' => '', 'price_cents' => 3000, 'available' => true, 'sort' => 0],
    ]);
});

it('locks the item before deleting a variant and audits a double delete once', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $item = $edit->createItem($edit->createCategory('Uramaki', 0, true)->id, 'Salmão', null, true, 3000);
    $half = $edit->createVariant($item->id, 'Meio', 1600, true, 1);
    $edit->createVariant($item->id, 'Combo', 5000, true, 2);
    $edit->deleteVariant($half->id, null);

    expect($repo->lockedItems)->toBe([$item->id]);
    $before = count($audit->entries);

    try {
        $edit->deleteVariant($half->id, null);
    } finally {
        expect($audit->entries)->toHaveCount($before);
    }
})->throws(MenuNotFound::class);

it('soft deletes a variant but keeps the last one', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $item = $edit->createItem($edit->createCategory('Uramaki', 0, true)->id, 'Salmão', null, true, 3000);
    $half = $edit->createVariant($item->id, 'Meio', 1600, true, 1);

    $edit->deleteVariant($half->id, 'saiu do cardápio');

    expect($repo->findVariant($half->id))->toBeNull()
        ->and(end($audit->entries))->toMatchArray(['entity' => 'variant', 'entityId' => $half->id, 'action' => 'delete', 'note' => 'saiu do cardápio']);

    $edit->deleteVariant((int) array_key_first($repo->variants), null);
})->throws(LastVariant::class);

it('refuses to edit a deleted variant', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $item = $edit->createItem($edit->createCategory('Uramaki', 0, true)->id, 'Salmão', null, true, 3000);
    $half = $edit->createVariant($item->id, 'Meio', 1600, true, 1);
    $edit->deleteVariant($half->id, null);

    $edit->updateVariant($half->id, 'Meio', 1700, 1);
})->throws(MenuNotFound::class);

it('creates an add-on for an existing item or category only', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $category = $edit->createCategory('Uramaki', 0, true);

    expect($edit->createAddon(null, $category->id, 'Cream cheese', 400, true)->categoryId)->toBe($category->id);

    $edit->createAddon(99, null, 'Tarê', 0, true);
})->throws(MenuNotFound::class);

it('refuses an add-on with two targets', function (): void {
    [$edit, $repo, $audit] = editMenu();
    $category = $edit->createCategory('Uramaki', 0, true);
    $item = $edit->createItem($category->id, 'Salmão', null, true, 3000);

    $edit->createAddon($item->id, $category->id, 'Tarê', 0, true);
})->throws(InvalidAddonTarget::class);

it('refuses to update what does not exist', function (string $entity): void {
    [$edit] = editMenu();
    match ($entity) {
        'category' => $edit->updateCategory(99, 'X', 0, true),
        'item' => $edit->updateItem(99, 1, 'X', null),
        default => $edit->updateAddon(99, 1, null, 'X', 0, true),
    };
})->with(['category', 'item', 'addon'])->throws(MenuNotFound::class);
