<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Payment\ManagePayments;
use App\Http\Requests\AuditNoteRequest;
use App\Http\Requests\PaymentRequest;
use App\Http\Resources\OrderPaymentsResource;
use Illuminate\Http\JsonResponse;

final readonly class PaymentController
{
    public function __construct(private ManagePayments $payments) {}

    public function index(int $id): OrderPaymentsResource
    {
        return new OrderPaymentsResource($this->payments->get($id));
    }

    public function store(PaymentRequest $r, int $id): JsonResponse
    {
        $note = $r->filled('note') ? $r->string('note')->toString() : null;
        $result = $this->payments->pay($id, $r->payMethod(), $r->integer('amount_cents'), $r->tendered(), $r->payerLabel(), $note, $r->allocations());

        return (new OrderPaymentsResource($result))->response()->setStatusCode(201);
    }

    public function void(AuditNoteRequest $r, int $id): OrderPaymentsResource
    {
        return new OrderPaymentsResource($this->payments->void($id, $r->filled('note') ? $r->string('note')->toString() : null));
    }
}
