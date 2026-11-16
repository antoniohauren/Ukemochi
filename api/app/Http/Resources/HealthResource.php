<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Resource is the bool from CheckHealth. */
final class HealthResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{status: string, db: string} */
    public function toArray(Request $request): array
    {
        $up = $this->resource === true;

        return ['status' => $up ? 'ok' : 'unavailable', 'db' => $up ? 'ok' : 'down'];
    }
}
