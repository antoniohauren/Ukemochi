<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Customer\Address;
use App\Domain\Customer\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Customer $resource */
final class CustomerResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{id: int, name: string, phone: ?string, note: ?string, addresses: list<array{text: string, note: ?string}>} */
    public function toArray(Request $request): array
    {
        $c = $this->resource;

        return [
            'id' => $c->id, 'name' => $c->name, 'phone' => $c->phone, 'note' => $c->note,
            'addresses' => array_map(fn (Address $a) => ['text' => $a->text, 'note' => $a->note], $c->addresses),
        ];
    }
}
