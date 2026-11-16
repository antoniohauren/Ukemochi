<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Resource is the Reverb app key (public: it only names the app, the secret signs). */
final class RealtimeConfigResource extends JsonResource
{
    public static $wrap = null;

    /** @return array{key: string} */
    public function toArray(Request $request): array
    {
        return ['key' => is_string($this->resource) ? $this->resource : ''];
    }
}
