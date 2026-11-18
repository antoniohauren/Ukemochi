<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Stock\ManageStock;
use App\Domain\Stock\StockLevel;
use App\Http\Requests\StockConfigRequest;
use App\Http\Requests\StockMovementRequest;
use App\Http\Resources\StockLevelResource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final readonly class StockController
{
    public function __construct(private ManageStock $stock) {}

    public function index(Request $r): JsonResponse
    {
        return new JsonResponse(['stock' => array_map(fn (StockLevel $l) => (new StockLevelResource($l))->toArray($r), $this->stock->levels())]);
    }

    public function configure(StockConfigRequest $r, int $id): StockLevelResource
    {
        $min = $r->input('stock_min') === null ? null : $r->integer('stock_min');

        return new StockLevelResource($this->stock->configure($id, $r->boolean('track_stock'), $min, self::note($r)));
    }

    public function purchase(StockMovementRequest $r, int $id): JsonResponse
    {
        return (new StockLevelResource($this->stock->purchase($id, $r->integer('qty'), self::note($r))))->response()->setStatusCode(201);
    }

    public function adjust(StockMovementRequest $r, int $id): JsonResponse
    {
        return (new StockLevelResource($this->stock->adjust($id, $r->integer('qty'), self::note($r))))->response()->setStatusCode(201);
    }

    private static function note(FormRequest $r): ?string
    {
        return $r->filled('note') ? $r->string('note')->toString() : null;
    }
}
