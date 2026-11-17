<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Payment\SplitOrders;
use App\Http\Requests\SplitRequest;
use App\Http\Resources\SplitResource;

final readonly class SplitController
{
    public function __construct(private SplitOrders $split) {}

    public function __invoke(SplitRequest $r, int $id): SplitResource
    {
        return new SplitResource(match ($r->string('mode')->toString()) {
            'equal' => $this->split->equal($id, $r->integer('n')),
            'amount' => $this->split->byAmount($id, $r->amounts()),
            'units' => $this->split->byUnits($id, $r->unitPayers()),
            default => $this->split->byGoods($id, $r->goodsPayers()),
        });
    }
}
