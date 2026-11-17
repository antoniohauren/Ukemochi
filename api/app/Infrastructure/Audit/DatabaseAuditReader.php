<?php

declare(strict_types=1);

namespace App\Infrastructure\Audit;

use App\Application\Audit\AuditEntry;
use App\Application\Audit\AuditReader;
use Illuminate\Database\ConnectionInterface;

final readonly class DatabaseAuditReader implements AuditReader
{
    public function __construct(private ConnectionInterface $db) {}

    public function page(?string $entity, ?string $entityId, ?int $beforeId, int $limit): array
    {
        $rows = $this->db->table('audit_log')->leftJoin('users', 'users.id', '=', 'audit_log.user_id')
            ->when($entity !== null, fn ($q) => $q->where('audit_log.entity', $entity))
            ->when($entityId !== null, fn ($q) => $q->where('audit_log.entity_id', $entityId))
            ->when($beforeId !== null, fn ($q) => $q->where('audit_log.id', '<', $beforeId))
            ->orderByDesc('audit_log.id')->limit($limit)
            ->get(['audit_log.*', 'users.name as user_name']);

        return array_values($rows->map(function (object $r): AuditEntry {
            /** @var object{id: int, user_id: ?int, user_name: ?string, at: string, entity: string, entity_id: string, action: string, summary: string, note: ?string} $r */
            /** @var array<string, mixed>|list<mixed> $summary */
            $summary = json_decode($r->summary, true, flags: JSON_THROW_ON_ERROR);

            return new AuditEntry($r->id, $r->user_id, $r->user_name, new \DateTimeImmutable($r->at), $r->entity, $r->entity_id, $r->action, $summary, $r->note);
        })->all());
    }
}
