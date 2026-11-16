<?php

declare(strict_types=1);

namespace App\Infrastructure\Menu;

use App\Domain\Menu\Variant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $item_id
 * @property string $name
 * @property int $price_cents
 * @property bool $available
 * @property int $sort
 */
final class EloquentVariant extends Model
{
    use SoftDeletes;

    protected $table = 'variants';

    public function toDomain(): Variant
    {
        return new Variant($this->id, $this->item_id, $this->name, $this->price_cents, $this->available, $this->sort);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['available' => 'boolean'];
    }
}
