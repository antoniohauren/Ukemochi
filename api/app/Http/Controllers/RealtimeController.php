<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\RealtimeConfigResource;
use Illuminate\Contracts\Config\Repository;

/** Echo needs the Reverb key to connect; serving it keeps REVERB_APP_KEY in api/.env the only copy. */
final readonly class RealtimeController
{
    public function __construct(private Repository $config) {}

    public function __invoke(): RealtimeConfigResource
    {
        return new RealtimeConfigResource($this->config->get('broadcasting.connections.reverb.key'));
    }
}
