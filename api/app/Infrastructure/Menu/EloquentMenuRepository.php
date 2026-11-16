<?php

declare(strict_types=1);

namespace App\Infrastructure\Menu;

use App\Application\Menu\MenuRepository;
use App\Domain\Menu\Addon;
use App\Domain\Menu\Category;
use App\Domain\Menu\Item;
use App\Domain\Menu\Menu;
use App\Domain\Menu\Variant;

final class EloquentMenuRepository implements MenuRepository
{
    public function menu(): Menu
    {
        return new Menu(
            array_values(EloquentCategory::query()->orderBy('sort')->orderBy('id')->get()->map(fn (EloquentCategory $c) => $c->toDomain())->all()),
            array_values(EloquentItem::query()->orderBy('name')->orderBy('id')->get()->map(fn (EloquentItem $i) => $i->toDomain())->all()),
            array_values(EloquentVariant::query()->orderBy('sort')->orderBy('id')->get()->map(fn (EloquentVariant $v) => $v->toDomain())->all()),
            array_values(EloquentAddon::query()->orderBy('name')->orderBy('id')->get()->map(fn (EloquentAddon $a) => $a->toDomain())->all()),
        );
    }

    public function findCategory(int $id): ?Category
    {
        return EloquentCategory::query()->find($id)?->toDomain();
    }

    public function findItem(int $id): ?Item
    {
        return EloquentItem::query()->find($id)?->toDomain();
    }

    public function findVariant(int $id): ?Variant
    {
        return EloquentVariant::query()->find($id)?->toDomain();
    }

    public function findAddon(int $id): ?Addon
    {
        return EloquentAddon::query()->find($id)?->toDomain();
    }

    public function saveCategory(Category $category): Category
    {
        $model = $category->id === 0 ? new EloquentCategory : EloquentCategory::query()->findOrFail($category->id);
        $model->forceFill(['name' => $category->name, 'sort' => $category->sort, 'active' => $category->active])->save();

        return $model->toDomain();
    }

    public function saveItem(Item $item): Item
    {
        $model = $item->id === 0 ? new EloquentItem : EloquentItem::query()->findOrFail($item->id);
        $model->forceFill(['category_id' => $item->categoryId, 'name' => $item->name, 'note' => $item->note]);
        if ($item->id === 0) {
            $model->active = $item->active;
        }
        $model->save();

        return $model->toDomain();
    }

    public function saveVariant(Variant $variant): Variant
    {
        $model = $variant->id === 0 ? new EloquentVariant : EloquentVariant::query()->findOrFail($variant->id);
        $model->forceFill([
            'item_id' => $variant->itemId, 'name' => $variant->name, 'price_cents' => $variant->priceCents,
            'sort' => $variant->sort,
        ]);
        if ($variant->id === 0) {
            $model->available = $variant->available;
        }
        $model->save();

        return $model->toDomain();
    }

    public function saveAddon(Addon $addon): Addon
    {
        $model = $addon->id === 0 ? new EloquentAddon : EloquentAddon::query()->findOrFail($addon->id);
        $model->forceFill([
            'item_id' => $addon->itemId, 'category_id' => $addon->categoryId, 'name' => $addon->name,
            'price_cents' => $addon->priceCents, 'active' => $addon->active,
        ])->save();

        return $model->toDomain();
    }

    public function setItemActive(int $id, bool $active): ?Item
    {
        EloquentItem::query()->whereKey($id)->update(['active' => $active]);

        return $this->findItem($id);
    }

    public function setVariantAvailable(int $id, bool $available): ?Variant
    {
        EloquentVariant::query()->whereKey($id)->update(['available' => $available]);

        return $this->findVariant($id);
    }

    public function lockItem(int $id): void
    {
        EloquentItem::query()->whereKey($id)->lockForUpdate()->first();
    }

    public function deleteVariant(int $id): void
    {
        EloquentVariant::query()->whereKey($id)->delete();
    }

    public function countVariants(int $itemId): int
    {
        return EloquentVariant::query()->where('item_id', $itemId)->count();
    }
}
