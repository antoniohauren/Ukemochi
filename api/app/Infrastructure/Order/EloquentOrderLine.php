<?php

declare(strict_types=1);

namespace App\Infrastructure\Order;

use App\Domain\Order\OrderLine;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $order_id
 * @property int $variant_id
 * @property string $category_name
 * @property string $item_name
 * @property string $variant_name
 * @property int $unit_price_cents
 * @property int $qty
 * @property ?string $note
 * @property-read Collection<int, EloquentLineAddon> $addons
 */
final class EloquentOrderLine extends Model
{
    public $timestamps = false;

    protected $table = 'order_lines';

    /** @return HasMany<EloquentLineAddon, $this> */
    public function addons(): HasMany
    {
        return $this->hasMany(EloquentLineAddon::class, 'line_id')->orderBy('id');
    }

    public function toDomain(): OrderLine
    {
        return new OrderLine(
            $this->id, $this->variant_id, $this->item_name, $this->variant_name, $this->unit_price_cents, $this->qty, $this->note,
            array_values($this->addons->map(fn (EloquentLineAddon $a) => $a->toDomain())->all()),
            $this->category_name,
        );
    }
}
