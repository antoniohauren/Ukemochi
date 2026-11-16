<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Health\CheckHealth;
use App\Http\Resources\HealthResource;
use Illuminate\Http\JsonResponse;

final class HealthController
{
    public function __invoke(CheckHealth $checkHealth): JsonResponse
    {
        $up = $checkHealth->execute();

        return (new HealthResource($up))->response()->setStatusCode($up ? 200 : 503);
    }
}
