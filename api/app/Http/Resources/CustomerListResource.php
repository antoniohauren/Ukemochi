<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Customer\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property list<Customer> $resource */
final class CustomerListResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{customers: list<array<string, mixed>>} */
    public function toArray(Request $request): array
    {
        return ['customers' => array_map(fn (Customer $c) => (new CustomerResource($c))->toArray($request), $this->resource)];
    }
}
