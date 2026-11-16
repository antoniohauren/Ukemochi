<?php

declare(strict_types=1);

namespace App\Infrastructure\Order;

use App\Domain\Order\LineAddon;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $line_id
 * @property int $addon_id
 * @property string $name
 * @property int $price_cents
 */
final class EloquentLineAddon extends Model
{
    public $timestamps = false;

    protected $table = 'line_addons';

    public function toDomain(): LineAddon
    {
        return new LineAddon($this->addon_id, $this->name, $this->price_cents);
    }
}
