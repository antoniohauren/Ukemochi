<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Menu\MenuRepository;
use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\Menu;
use App\Domain\Menu\Variant;

final class InMemoryMenuRepository implements MenuRepository
{
    /** @var array<int, Category> */
    public array $categories = [];

    /** @var array<int, Item> */
    public array $items = [];

    /** @var array<int, Variant> */
    public array $variants = [];

    /** @var array<int, Addon> */
    public array $addons = [];

    /** @var list<int> */
    public array $deletedVariants = [];

    /** @var list<int> */
    public array $lockedItems = [];

    private int $nextId = 1;

    public function menu(): Menu
    {
        $variants = array_filter($this->variants, fn (Variant $v) => ! in_array($v->id, $this->deletedVariants, true));

        return new Menu(array_values($this->categories), array_values($this->items), array_values($variants), array_values($this->addons));
    }

    public function findCategory(int $id): ?Category
    {
        return $this->categories[$id] ?? null;
    }

    public function findItem(int $id): ?Item
    {
        return $this->items[$id] ?? null;
    }

    public function findVariant(int $id): ?Variant
    {
        return in_array($id, $this->deletedVariants, true) ? null : $this->variants[$id] ?? null;
    }

    public function findAddon(int $id): ?Addon
    {
        return $this->addons[$id] ?? null;
    }

    public function saveCategory(Category $category): Category
    {
        $id = $category->id ?: $this->nextId++;

        return $this->categories[$id] = new Category($id, $category->name, $category->sort, $category->active);
    }

    public function saveItem(Item $item): Item
    {
        $id = $item->id ?: $this->nextId++;

        $active = isset($this->items[$item->id]) ? $this->items[$item->id]->active : $item->active;

        return $this->items[$id] = new Item($id, $item->categoryId, $item->name, $item->note, $active);
    }

    public function saveVariant(Variant $variant): Variant
    {
        $id = $variant->id ?: $this->nextId++;

        $available = isset($this->variants[$variant->id]) ? $this->variants[$variant->id]->available : $variant->available;

        return $this->variants[$id] = new Variant($id, $variant->itemId, $variant->name, $variant->priceCents, $available, $variant->sort);
    }

    public function saveAddon(Addon $addon): Addon
    {
        $id = $addon->id ?: $this->nextId++;

        return $this->addons[$id] = new Addon($id, $addon->itemId, $addon->categoryId, $addon->name, $addon->priceCents, $addon->active);
    }

    public function setItemActive(int $id, bool $active): ?Item
    {
        $i = $this->findItem($id);

        return $i === null ? null : $this->items[$id] = new Item($id, $i->categoryId, $i->name, $i->note, $active);
    }

    public function setVariantAvailable(int $id, bool $available): ?Variant
    {
        $v = $this->findVariant($id);

        return $v === null ? null : $this->variants[$id] = new Variant($id, $v->itemId, $v->name, $v->priceCents, $available, $v->sort);
    }

    public function lockItem(int $id): void
    {
        $this->lockedItems[] = $id;
    }

    public function deleteVariant(int $id): void
    {
        $this->deletedVariants[] = $id;
    }

    public function countVariants(int $itemId): int
    {
        return count(array_filter($this->menu()->variants, fn (Variant $v) => $v->itemId === $itemId));
    }
}
