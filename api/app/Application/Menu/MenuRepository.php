<?php

declare(strict_types=1);

namespace App\Application\Menu;

use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\Menu;
use App\Domain\Menu\Variant;

/**
 * `save*` inserts when the entity's id is 0, otherwise updates; returns the stored entity.
 * An update never changes item `active` / variant `available`: only the toggles below do.
 */
interface MenuRepository
{
    public function menu(): Menu;

    public function findCategory(int $id): ?Category;

    public function findItem(int $id): ?Item;

    /** Soft-deleted variants are not found. */
    public function findVariant(int $id): ?Variant;

    public function findAddon(int $id): ?Addon;

    public function saveCategory(Category $category): Category;

    public function saveItem(Item $item): Item;

    public function saveVariant(Variant $variant): Variant;

    public function saveAddon(Addon $addon): Addon;

    /** Writes only `active`; null when the item does not exist. */
    public function setItemActive(int $id, bool $active): ?Item;

    /** Writes only `available`; null when the variant does not exist or is deleted. */
    public function setVariantAvailable(int $id, bool $available): ?Variant;

    /** Row lock on the item until the transaction ends (serializes deletes of its variants). */
    public function lockItem(int $id): void;

    /** Row lock on the category until the transaction ends. */
    public function lockCategory(int $id): void;

    /** Sort for a new last item in the category. */
    public function nextItemSort(int $categoryId): int;

    /** @return list<int> */
    public function itemIds(int $categoryId): array;

    /** @param  array<int, int>  $sorts  item id => sort */
    public function setItemSorts(array $sorts): void;

    public function deleteVariant(int $id): void;

    /** Variants of the item that are not soft-deleted. */
    public function countVariants(int $itemId): int;

    /**
     * Every category id, row-locked until the transaction ends.
     *
     * @return list<int>
     */
    public function lockCategoryIds(): array;

    /**
     * Ids of the item's variants that are not soft-deleted.
     *
     * @return list<int>
     */
    public function variantIds(int $itemId): array;

    /** @param  array<int, int>  $sorts  category id => sort */
    public function setCategorySorts(array $sorts): void;

    /** @param  array<int, int>  $sorts  variant id => sort */
    public function setVariantSorts(array $sorts): void;
}
