<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Application\Audit\AuditEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A page of the change log; `next_before` asks for the next (older) page, null on the last.
 *
 * @property array{list<AuditEntry>, ?int} $resource
 */
final class AuditPageResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        [$entries, $next] = $this->resource;

        return [
            'entries' => array_map(fn (AuditEntry $e) => [
                'id' => $e->id, 'user_id' => $e->userId, 'user_name' => $e->userName, 'at' => $e->at->format(DATE_ATOM),
                'entity' => $e->entity, 'entity_id' => $e->entityId, 'action' => $e->action, 'summary' => $e->summary, 'note' => $e->note,
            ], $entries),
            'next_before' => $next,
        ];
    }
}
