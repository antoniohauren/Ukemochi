<?php

declare(strict_types=1);

namespace App\Application\Audit;

/** Change log: every mutation records who did what to which record. */
interface AuditLog
{
    /**
     * @param  ?int  $userId  null for system actions (scheduler, backups)
     * @param  array<string, mixed>|list<mixed>  $summary  stored as jsonb
     */
    public function record(?int $userId, string $entity, string|int $entityId, string $action, array $summary, ?string $note = null): void;
}
