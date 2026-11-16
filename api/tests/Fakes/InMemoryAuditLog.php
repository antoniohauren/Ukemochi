<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Application\Audit\AuditLog;

/** In-memory AuditLog for unit tests of use cases. */
final class InMemoryAuditLog implements AuditLog
{
    /** @var list<array{userId: ?int, entity: string, entityId: string|int, action: string, summary: array<string, mixed>|list<mixed>, note: ?string}> */
    public array $entries = [];

    public function record(?int $userId, string $entity, string|int $entityId, string $action, array $summary, ?string $note = null): void
    {
        $this->entries[] = compact('userId', 'entity', 'entityId', 'action', 'summary', 'note');
    }
}
