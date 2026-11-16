<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Staff\ManageStaff;
use App\Http\Requests\ResetPinRequest;
use App\Http\Requests\StaffRequest;
use App\Http\Resources\StaffListResource;
use App\Http\Resources\StaffResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

final readonly class StaffController
{
    public function __construct(private ManageStaff $staff) {}

    public function index(): StaffListResource
    {
        return new StaffListResource($this->staff->list());
    }

    public function store(StaffRequest $r): JsonResponse
    {
        return (new StaffResource($this->staff->create(
            $r->string('name')->toString(), $r->role(), $r->string('pin')->toString(), $r->boolean('active'),
        )))->response()->setStatusCode(201);
    }

    public function update(StaffRequest $r, int $id): StaffResource
    {
        return new StaffResource($this->staff->update($id, $r->string('name')->toString(), $r->role(), $r->boolean('active')));
    }

    public function resetPin(ResetPinRequest $r, int $id): Response
    {
        $this->staff->resetPin($id, $r->string('pin')->toString(), $r->hasSession() ? $r->session()->getId() : null);

        return response()->noContent();
    }
}
