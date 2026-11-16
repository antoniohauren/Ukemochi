<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Auth\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property User $resource */
final class UserResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{id: int, name: string, role: string} */
    public function toArray(Request $request): array
    {
        return ['id' => $this->resource->id, 'name' => $this->resource->name, 'role' => $this->resource->role->value];
    }
}
