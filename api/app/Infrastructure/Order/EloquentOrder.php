<?php

declare(strict_types=1);

namespace App\Infrastructure\Order;

use App\Domain\Order\Order;
use App\Domain\Order\OrderDetails;
use App\Domain\Order\OrderStatus;
use App\Domain\Order\OrderType;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $type
 * @property string $status
 * @property ?int $customer_id
 * @property string $customer_name
 * @property ?string $address_text
 * @property int $delivery_fee_cents
 * @property bool $pay_on_delivery
 * @property ?int $change_for_cents
 * @property ?string $note
 * @property int $created_by
 * @property CarbonImmutable $created_at
 * @property ?CarbonImmutable $closed_at
 * @property ?string $cancel_reason
 * @property int $printed_version
 * @property int $version
 * @property-read Collection<int, EloquentOrderLine> $lines
 */
final class EloquentOrder extends Model
{
    /** The id is the order number, set from the counter. */
    public $incrementing = false;

    protected $table = 'orders';

    /** Writes keep the offset; the default format drops it and shifts non-UTC times. */
    protected $dateFormat = 'Y-m-d H:i:s.uP';

    /** @return HasMany<EloquentOrderLine, $this> */
    public function lines(): HasMany
    {
        return $this->hasMany(EloquentOrderLine::class, 'order_id')->orderBy('id');
    }

    public function toDomain(): Order
    {
        return new Order(
            $this->id,
            new OrderDetails(
                OrderType::from($this->type), $this->customer_name, $this->customer_id, $this->address_text,
                $this->delivery_fee_cents, $this->pay_on_delivery, $this->change_for_cents, $this->note,
            ),
            OrderStatus::from($this->status),
            array_values($this->lines->map(fn (EloquentOrderLine $l) => $l->toDomain())->all()),
            $this->created_by,
            $this->created_at->toDateTimeImmutable(),
            $this->closed_at?->toDateTimeImmutable(),
            $this->cancel_reason,
            $this->printed_version,
            $this->version,
        );
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['pay_on_delivery' => 'boolean', 'created_at' => 'immutable_datetime', 'closed_at' => 'immutable_datetime'];
    }
}
