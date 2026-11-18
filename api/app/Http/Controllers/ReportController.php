<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Report\ReadReports;
use App\Http\Requests\ReportRequest;
use App\Http\Resources\ReportResource;

final readonly class ReportController
{
    public function __construct(private ReadReports $reports) {}

    public function __invoke(ReportRequest $r): ReportResource
    {
        return new ReportResource($this->reports->period($r->instant('from'), $r->instant('to')));
    }
}
