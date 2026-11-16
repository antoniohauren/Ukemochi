<?php

declare(strict_types=1);

namespace App\Infrastructure\Menu;

use App\Domain\Menu\Addon;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property ?int $item_id
 * @property ?int $category_id
 * @property string $name
 * @property int $price_cents
 * @property bool $active
 */
final class EloquentAddon extends Model
{
    protected $table = 'addons';

    public function toDomain(): Addon
    {
        return new Addon($this->id, $this->item_id, $this->category_id, $this->name, $this->price_cents, $this->active);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}
