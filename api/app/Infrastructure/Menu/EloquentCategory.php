<?php

declare(strict_types=1);

namespace App\Infrastructure\Menu;

use App\Domain\Menu\Category;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property int $sort
 * @property bool $active
 */
final class EloquentCategory extends Model
{
    protected $table = 'categories';

    public function toDomain(): Category
    {
        return new Category($this->id, $this->name, $this->sort, $this->active);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}
