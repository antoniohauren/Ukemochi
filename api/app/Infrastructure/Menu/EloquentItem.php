<?php

declare(strict_types=1);

namespace App\Infrastructure\Menu;

use App\Domain\Menu\Item;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $category_id
 * @property string $name
 * @property ?string $note
 * @property bool $active
 */
final class EloquentItem extends Model
{
    protected $table = 'items';

    public function toDomain(): Item
    {
        return new Item($this->id, $this->category_id, $this->name, $this->note, $this->active, $this->sort);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['active' => 'boolean', 'sort' => 'integer'];
    }
}
