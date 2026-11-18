<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Application\Report\PeriodReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property PeriodReport $resource */
final class ReportResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $r = $this->resource;
        $utc = new \DateTimeZone('UTC');

        return [
            'from' => $r->from->setTimezone($utc)->format(DATE_ATOM),
            'to' => $r->to->setTimezone($utc)->format(DATE_ATOM),
            'orders_count' => $r->ordersCount,
            'cancelled_count' => $r->cancelledCount,
            'revenue_cents' => $r->revenueCents,
            'by_item' => $r->byItem,
            'by_method' => $r->byMethod,
            'by_waitress' => $r->byWaitress,
        ];
    }
}
