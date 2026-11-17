<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Order\LineAddon;
use App\Domain\Order\OrderLine;
use App\Domain\Ticket\KitchenTicket;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property KitchenTicket $resource */
final class KitchenTicketResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $t = $this->resource;

        return [
            'kind' => 'kitchen', 'number' => $t->number, 'type' => $t->type->value, 'customer_name' => $t->customerName,
            'created_at' => $t->createdAt->format(DATE_ATOM), 'version' => $t->version, 'updated_version' => $t->updatedVersion,
            'cancelled' => $t->cancelled, 'cancel_reason' => $t->cancelReason, 'note' => $t->note,
            'lines' => array_map(fn (OrderLine $l) => [
                'qty' => $l->qty, 'category_name' => $l->categoryName, 'item_name' => $l->itemName, 'variant_name' => $l->variantName,
                'print_name' => $l->printName,
                'addons' => array_map(fn (LineAddon $a) => $a->name, $l->addons), 'note' => $l->note,
            ], $t->lines),
        ];
    }
}
