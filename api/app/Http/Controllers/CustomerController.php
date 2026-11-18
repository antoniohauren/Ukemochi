<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Customer\ManageCustomers;
use App\Http\Requests\CustomerRequest;
use App\Http\Requests\ListCustomersRequest;
use App\Http\Resources\CustomerListResource;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderListResource;
use Illuminate\Http\JsonResponse;

final readonly class CustomerController
{
    public function __construct(private ManageCustomers $customers) {}

    public function index(ListCustomersRequest $r): CustomerListResource
    {
        return new CustomerListResource($this->customers->search($r->term()));
    }

    public function show(int $id): CustomerResource
    {
        return new CustomerResource($this->customers->get($id));
    }

    public function orders(int $id): OrderListResource
    {
        return new OrderListResource($this->customers->orders($id));
    }

    public function store(CustomerRequest $r): JsonResponse
    {
        return (new CustomerResource($this->customers->create($r->customer())))->response()->setStatusCode(201);
    }

    public function update(CustomerRequest $r, int $id): CustomerResource
    {
        return new CustomerResource($this->customers->update($r->customer($id)));
    }
}
