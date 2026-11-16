<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Auth\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A staff account for the admin screens. Never the PIN hash.
 *
 * @property User $resource
 */
final class StaffResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{id: int, name: string, role: string, active: bool} */
    public function toArray(Request $request): array
    {
        $u = $this->resource;

        return ['id' => $u->id, 'name' => $u->name, 'role' => $u->role->value, 'active' => $u->active];
    }
}
