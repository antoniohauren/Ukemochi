<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Cash\ManageCash;
use App\Domain\Cash\ShiftReport;
use App\Http\Requests\CashMovementRequest;
use App\Http\Requests\CloseShiftRequest;
use App\Http\Requests\OpenShiftRequest;
use App\Http\Resources\ShiftResource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final readonly class ShiftController
{
    public function __construct(private ManageCash $cash) {}

    /** `{shift: null}` while no shift is open. */
    public function current(Request $r): JsonResponse
    {
        $report = $this->cash->current();

        return new JsonResponse(['shift' => $report === null ? null : (new ShiftResource($report))->toArray($r)]);
    }

    public function index(Request $r): JsonResponse
    {
        return new JsonResponse(['shifts' => array_map(fn (ShiftReport $s) => (new ShiftResource($s))->toArray($r), $this->cash->recent())]);
    }

    public function show(int $id): ShiftResource
    {
        return new ShiftResource($this->cash->get($id));
    }

    public function open(OpenShiftRequest $r): JsonResponse
    {
        return (new ShiftResource($this->cash->open($r->integer('opening_float_cents'), self::note($r))))->response()->setStatusCode(201);
    }

    public function movement(CashMovementRequest $r): JsonResponse
    {
        $staff = $r->filled('staff_name') ? $r->string('staff_name')->toString() : null;

        return (new ShiftResource($this->cash->addMovement($r->kind(), $r->integer('amount_cents'), $staff, self::note($r))))->response()->setStatusCode(201);
    }

    public function close(CloseShiftRequest $r): ShiftResource
    {
        return new ShiftResource($this->cash->close($r->integer('counted_cents'), self::note($r)));
    }

    private static function note(FormRequest $r): ?string
    {
        return $r->filled('note') ? $r->string('note')->toString() : null;
    }
}
