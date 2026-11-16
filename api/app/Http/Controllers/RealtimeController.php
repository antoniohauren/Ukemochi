<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Realtime\RealtimeUnavailable;
use App\Http\Resources\RealtimeConfigResource;
use Illuminate\Contracts\Config\Repository;

/** Echo needs the Reverb key to connect; serving it keeps REVERB_APP_KEY in api/.env the only copy. */
final readonly class RealtimeController
{
    public function __construct(private Repository $config) {}

    public function __invoke(): RealtimeConfigResource
    {
        $key = $this->config->get('broadcasting.connections.reverb.key');
        if (! is_string($key) || $key === '') {
            throw new RealtimeUnavailable;
        }

        return new RealtimeConfigResource($key);
    }
}
