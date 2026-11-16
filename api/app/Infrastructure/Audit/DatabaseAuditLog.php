<?php

declare(strict_types=1);

namespace App\Infrastructure\Audit;

use App\Application\Audit\AuditLog;
use App\Application\Clock;
use Illuminate\Database\ConnectionInterface;

final readonly class DatabaseAuditLog implements AuditLog
{
    public function __construct(private ConnectionInterface $db, private Clock $clock) {}

    public function record(?int $userId, string $entity, string|int $entityId, string $action, array $summary, ?string $note = null): void
    {
        $this->db->table('audit_log')->insert([
            'user_id' => $userId,
            'at' => $this->clock->now()->format('Y-m-d H:i:s.uP'),
            'entity' => $entity,
            'entity_id' => (string) $entityId,
            'action' => $action,
            'summary' => json_encode($summary, JSON_THROW_ON_ERROR),
            'note' => $note,
        ]);
    }
}
