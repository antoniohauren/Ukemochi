<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Order\ManageOrders;
use App\Application\Order\ReadOrders;
use App\Domain\Ticket\Bill;
use App\Http\Requests\AuditNoteRequest;
use App\Http\Requests\CancelOrderRequest;
use App\Http\Requests\ListOrdersRequest;
use App\Http\Requests\OrderRequest;
use App\Http\Requests\OrderStatusRequest;
use App\Http\Requests\PrintedRequest;
use App\Http\Requests\TicketRequest;
use App\Http\Resources\BillResource;
use App\Http\Resources\KitchenTicketResource;
use App\Http\Resources\OrderListResource;
use App\Http\Resources\OrderResource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\JsonResponse;

final readonly class OrderController
{
    public function __construct(private ReadOrders $read, private ManageOrders $manage) {}

    public function index(ListOrdersRequest $r): OrderListResource
    {
        return new OrderListResource($this->read->list($r->status()));
    }

    public function show(int $id): OrderResource
    {
        return new OrderResource($this->read->get($id));
    }

    public function store(OrderRequest $r): JsonResponse
    {
        return (new OrderResource($this->manage->create($r->details(), $r->lines())))->response()->setStatusCode(201);
    }

    public function update(OrderRequest $r, int $id): OrderResource
    {
        return new OrderResource($this->manage->edit($id, $r->details(), $r->lines(), $r->editNote()));
    }

    public function status(OrderStatusRequest $r, int $id): OrderResource
    {
        return new OrderResource($this->manage->changeStatus($id, $r->status(), self::note($r)));
    }

    public function cancel(CancelOrderRequest $r, int $id): OrderResource
    {
        return new OrderResource($this->manage->cancel($id, $r->string('reason')->toString(), self::note($r)));
    }

    public function reopen(AuditNoteRequest $r, int $id): OrderResource
    {
        return new OrderResource($this->manage->reopen($id, self::note($r)));
    }

    public function ticket(TicketRequest $r, int $id): KitchenTicketResource|BillResource
    {
        $ticket = $this->read->ticket($id, $r->kind());

        return $ticket instanceof Bill ? new BillResource($ticket) : new KitchenTicketResource($ticket);
    }

    public function printed(PrintedRequest $r, int $id): OrderResource
    {
        return new OrderResource($this->manage->markPrinted($id, $r->kind(), $r->integer('version'), self::note($r)));
    }

    private static function note(FormRequest $r): ?string
    {
        return $r->filled('note') ? $r->string('note')->toString() : null;
    }
}
