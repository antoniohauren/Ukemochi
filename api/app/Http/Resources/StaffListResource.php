<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Auth\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property list<User> $resource */
final class StaffListResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{users: list<array{id: int, name: string, role: string, active: bool}>} */
    public function toArray(Request $request): array
    {
        return ['users' => array_map(fn (User $u) => (new StaffResource($u))->toArray($request), $this->resource)];
    }
}
