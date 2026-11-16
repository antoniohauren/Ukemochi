<?php

declare(strict_types=1);

namespace App\Application\Menu;

use App\Application\Audit\AuditLog;
use App\Application\Auth\SessionAuth;
use App\Application\Transaction;
use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\LastVariant;
use App\Domain\Menu\MenuNotFound;
use App\Domain\Menu\MenuOrder;
use App\Domain\Menu\Variant;

/** Menu mutations. Each one writes the record and its audit row in one transaction. */
final readonly class EditMenu
{
    public function __construct(
        private MenuRepository $menu,
        private Transaction $transaction,
        private AuditLog $audit,
        private SessionAuth $session,
    ) {}

    public function createCategory(string $name, int $sort, bool $active): Category
    {
        return $this->transaction->run(fn () => $this->saved(
            $this->menu->saveCategory(new Category(0, $name, $sort, $active)), 'category', 'create',
        ));
    }

    public function updateCategory(int $id, string $name, int $sort, bool $active): Category
    {
        $this->category($id);

        return $this->transaction->run(fn () => $this->saved(
            $this->menu->saveCategory(new Category($id, $name, $sort, $active)), 'category', 'update',
        ));
    }

    /** A new item goes last in its category and gets one unnamed default variant at `$priceCents`. */
    public function createItem(int $categoryId, string $name, ?string $note, bool $active, int $priceCents): Item
    {
        $this->category($categoryId);

        return $this->transaction->run(function () use ($categoryId, $name, $note, $active, $priceCents): Item {
            $item = new Item(0, $categoryId, $name, $note, $active, $this->menu->nextItemSort($categoryId));
            $item = $this->saved($this->menu->saveItem($item), 'item', 'create');
            $this->saved($this->menu->saveVariant(new Variant(0, $item->id, '', $priceCents, true, 0)), 'variant', 'create');

            return $item;
        });
    }

    /** `active` stays as it is: only setItemActive changes it. Moving to another category puts the item last there. */
    public function updateItem(int $id, int $categoryId, string $name, ?string $note): Item
    {
        $this->category($categoryId);

        return $this->transaction->run(function () use ($id, $categoryId, $name, $note): Item {
            $current = $this->item($id);
            $sort = $current->categoryId === $categoryId ? $current->sort : $this->menu->nextItemSort($categoryId);

            return $this->saved($this->menu->saveItem(new Item($id, $categoryId, $name, $note, $current->active, $sort)), 'item', 'update');
        });
    }

    public function setItemActive(int $id, bool $active, ?string $note): Item
    {
        return $this->transaction->run(fn () => $this->saved(
            $this->menu->setItemActive($id, $active) ?? throw new MenuNotFound('item', $id), 'item', 'set_active', $note,
        ));
    }

    public function createVariant(int $itemId, string $name, int $priceCents, bool $available, int $sort): Variant
    {
        $this->item($itemId);
        $variant = new Variant(0, $itemId, $name, $priceCents, $available, $sort);

        return $this->transaction->run(fn () => $this->saved($this->menu->saveVariant($variant), 'variant', 'create'));
    }

    /** `available` stays as it is: only setVariantAvailable changes it. */
    public function updateVariant(int $id, string $name, int $priceCents, int $sort): Variant
    {
        return $this->transaction->run(function () use ($id, $name, $priceCents, $sort): Variant {
            $current = $this->variant($id);

            return $this->saved(
                $this->menu->saveVariant(new Variant($id, $current->itemId, $name, $priceCents, $current->available, $sort)), 'variant', 'update',
            );
        });
    }

    public function setVariantAvailable(int $id, bool $available, ?string $note): Variant
    {
        return $this->transaction->run(fn () => $this->saved(
            $this->menu->setVariantAvailable($id, $available) ?? throw new MenuNotFound('variant', $id), 'variant', 'set_available', $note,
        ));
    }

    /** Soft delete: order lines keep pointing at it. */
    public function deleteVariant(int $id, ?string $note): void
    {
        $this->transaction->run(function () use ($id, $note): void {
            $this->menu->lockItem($this->variant($id)->itemId);
            // Re-read under the lock: a parallel delete may have just removed it.
            $variant = $this->variant($id);
            if ($this->menu->countVariants($variant->itemId) <= 1) {
                throw new LastVariant;
            }

            $this->menu->deleteVariant($variant->id);
            $this->record('variant', $variant->id, 'delete', ['name' => $variant->name], $note);
        });
    }

    /** @param  list<int>  $ids  every category, in the new order */
    public function reorderCategories(array $ids): void
    {
        $this->transaction->run(function () use ($ids): void {
            $this->menu->setCategorySorts(MenuOrder::sorts($ids, $this->menu->lockCategoryIds()));
            $this->record('category', 'all', 'reorder', ['ids' => $ids], null);
        });
    }

    /**
     * Audited on the category, since the order belongs to its item list.
     *
     * @param  list<int>  $ids  every item of the category, in the new order
     */
    public function reorderItems(int $categoryId, array $ids): void
    {
        $this->category($categoryId);
        $this->transaction->run(function () use ($categoryId, $ids): void {
            // Locking the category serialises reorders of its items.
            $this->menu->lockCategory($categoryId);
            $this->menu->setItemSorts(MenuOrder::sorts($ids, $this->menu->itemIds($categoryId)));
            $this->record('category', $categoryId, 'reorder_items', ['ids' => $ids], null);
        });
    }

    /**
     * Audited on the item, since the order belongs to its variant list.
     *
     * @param  list<int>  $ids  every non-deleted variant of the item, in the new order
     */
    public function reorderVariants(int $itemId, array $ids): void
    {
        $this->item($itemId);
        $this->transaction->run(function () use ($itemId, $ids): void {
            // Same lock as deleteVariant, so the set cannot change under us.
            $this->menu->lockItem($itemId);
            $this->menu->setVariantSorts(MenuOrder::sorts($ids, $this->menu->variantIds($itemId)));
            $this->record('item', $itemId, 'reorder', ['ids' => $ids], null);
        });
    }

    public function createAddon(?int $itemId, ?int $categoryId, string $name, int $priceCents, bool $active): Addon
    {
        $addon = $this->targeted(new Addon(0, $itemId, $categoryId, $name, $priceCents, $active));

        return $this->transaction->run(fn () => $this->saved($this->menu->saveAddon($addon), 'addon', 'create'));
    }

    public function updateAddon(int $id, ?int $itemId, ?int $categoryId, string $name, int $priceCents, bool $active): Addon
    {
        if ($this->menu->findAddon($id) === null) {
            throw new MenuNotFound('addon', $id);
        }
        $addon = $this->targeted(new Addon($id, $itemId, $categoryId, $name, $priceCents, $active));

        return $this->transaction->run(fn () => $this->saved($this->menu->saveAddon($addon), 'addon', 'update'));
    }

    private function targeted(Addon $addon): Addon
    {
        if ($addon->itemId !== null) {
            $this->item($addon->itemId);
        }
        if ($addon->categoryId !== null) {
            $this->category($addon->categoryId);
        }

        return $addon;
    }

    private function category(int $id): Category
    {
        return $this->menu->findCategory($id) ?? throw new MenuNotFound('category', $id);
    }

    private function item(int $id): Item
    {
        return $this->menu->findItem($id) ?? throw new MenuNotFound('item', $id);
    }

    private function variant(int $id): Variant
    {
        return $this->menu->findVariant($id) ?? throw new MenuNotFound('variant', $id);
    }

    /**
     * Audits the stored entity with its fields as the summary.
     *
     * @template T of Category|Item|Variant|Addon
     *
     * @param  T  $entity
     * @return T
     */
    private function saved(Category|Item|Variant|Addon $entity, string $name, string $action, ?string $note = null): Category|Item|Variant|Addon
    {
        $summary = [];
        foreach (get_object_vars($entity) as $key => $value) {
            // Same snake_case keys as the API.
            $summary[strtolower((string) preg_replace('/[A-Z]/', '_$0', $key))] = $value;
        }
        unset($summary['id']);
        $this->record($name, $entity->id, $action, $summary, $note);

        return $entity;
    }

    /** @param  array<string, mixed>  $summary */
    private function record(string $entity, string|int $id, string $action, array $summary, ?string $note): void
    {
        $this->audit->record($this->session->userId(), $entity, $id, $action, $summary, $note);
    }
}
