<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Menu\EditMenu;
use App\Application\Menu\ReadMenu;
use App\Http\Requests\AddonRequest;
use App\Http\Requests\AuditNoteRequest;
use App\Http\Requests\CategoryRequest;
use App\Http\Requests\ItemRequest;
use App\Http\Requests\ReorderRequest;
use App\Http\Requests\SetItemActiveRequest;
use App\Http\Requests\SetVariantAvailableRequest;
use App\Http\Requests\VariantRequest;
use App\Http\Resources\AddonResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ItemResource;
use App\Http\Resources\MenuResource;
use App\Http\Resources\VariantResource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

final readonly class MenuController
{
    public function __construct(private EditMenu $edit) {}

    public function show(ReadMenu $read): MenuResource
    {
        return new MenuResource($read->execute());
    }

    public function storeCategory(CategoryRequest $r): JsonResponse
    {
        return self::created(new CategoryResource($this->edit->createCategory(self::str($r, 'name'), $r->integer('sort'), $r->boolean('active'))));
    }

    public function updateCategory(CategoryRequest $r, int $id): CategoryResource
    {
        return new CategoryResource($this->edit->updateCategory($id, self::str($r, 'name'), $r->integer('sort'), $r->boolean('active')));
    }

    public function reorderCategories(ReorderRequest $r): Response
    {
        $this->edit->reorderCategories($r->ids());

        return response()->noContent();
    }

    public function storeItem(ItemRequest $r): JsonResponse
    {
        return self::created(new ItemResource($this->edit->createItem(
            $r->integer('category_id'), self::str($r, 'name'), self::nullableStr($r, 'note'), $r->boolean('active'), $r->integer('price_cents'),
        )));
    }

    public function updateItem(ItemRequest $r, int $id): ItemResource
    {
        return new ItemResource($this->edit->updateItem(
            $id, $r->integer('category_id'), self::str($r, 'name'), self::nullableStr($r, 'note'),
        ));
    }

    public function setItemActive(SetItemActiveRequest $r, int $id): ItemResource
    {
        return new ItemResource($this->edit->setItemActive($id, $r->boolean('active'), self::nullableStr($r, 'note')));
    }

    public function storeVariant(VariantRequest $r, int $itemId): JsonResponse
    {
        return self::created(new VariantResource($this->edit->createVariant(
            $itemId, self::nullableStr($r, 'name') ?? '', $r->integer('price_cents'), $r->boolean('available'), $r->integer('sort'),
        )));
    }

    public function reorderVariants(ReorderRequest $r, int $itemId): Response
    {
        $this->edit->reorderVariants($itemId, $r->ids());

        return response()->noContent();
    }

    public function updateVariant(VariantRequest $r, int $id): VariantResource
    {
        return new VariantResource($this->edit->updateVariant(
            $id, self::nullableStr($r, 'name') ?? '', $r->integer('price_cents'), $r->integer('sort'),
        ));
    }

    public function setVariantAvailable(SetVariantAvailableRequest $r, int $id): VariantResource
    {
        return new VariantResource($this->edit->setVariantAvailable($id, $r->boolean('available'), self::nullableStr($r, 'note')));
    }

    public function destroyVariant(AuditNoteRequest $r, int $id): Response
    {
        $this->edit->deleteVariant($id, self::nullableStr($r, 'note'));

        return response()->noContent();
    }

    public function storeAddon(AddonRequest $r): JsonResponse
    {
        return self::created(new AddonResource($this->edit->createAddon(
            self::nullableInt($r, 'item_id'), self::nullableInt($r, 'category_id'), self::str($r, 'name'), $r->integer('price_cents'), $r->boolean('active'),
        )));
    }

    public function updateAddon(AddonRequest $r, int $id): AddonResource
    {
        return new AddonResource($this->edit->updateAddon(
            $id, self::nullableInt($r, 'item_id'), self::nullableInt($r, 'category_id'), self::str($r, 'name'), $r->integer('price_cents'), $r->boolean('active'),
        ));
    }

    private static function created(JsonResource $resource): JsonResponse
    {
        return $resource->response()->setStatusCode(201);
    }

    private static function str(FormRequest $r, string $key): string
    {
        return $r->string($key)->toString();
    }

    private static function nullableStr(FormRequest $r, string $key): ?string
    {
        return $r->filled($key) ? $r->string($key)->toString() : null;
    }

    private static function nullableInt(FormRequest $r, string $key): ?int
    {
        return $r->filled($key) ? $r->integer($key) : null;
    }
}
