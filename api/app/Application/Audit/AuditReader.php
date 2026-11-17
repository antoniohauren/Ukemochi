<?php

declare(strict_types=1);

namespace App\Application\Audit;

interface AuditReader
{
    /**
     * Newest first, ids below `beforeId` when given; filtered by entity (and its id) when given.
     *
     * @return list<AuditEntry>
     */
    public function page(?string $entity, ?string $entityId, ?int $beforeId, int $limit): array;
}
