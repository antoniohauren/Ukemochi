<?php

declare(strict_types=1);

namespace App\Application\Audit;

/** One audit_log row as the admin reads it; `userName` is null for system actions. */
final readonly class AuditEntry
{
    /** @param  array<string, mixed>|list<mixed>  $summary */
    public function __construct(
        public int $id,
        public ?int $userId,
        public ?string $userName,
        public \DateTimeImmutable $at,
        public string $entity,
        public string $entityId,
        public string $action,
        public array $summary,
        public ?string $note,
    ) {}
}
