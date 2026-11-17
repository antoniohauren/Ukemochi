<?php

declare(strict_types=1);

namespace App\Application\Audit;

/** The change log, newest first, a page at a time. */
final readonly class ReadAudit
{
    public const int PAGE = 50;

    public function __construct(private AuditReader $reader) {}

    /** @return array{list<AuditEntry>, ?int} entries, and the `before` id of the next page (null on the last) */
    public function page(?string $entity, ?string $entityId, ?int $beforeId): array
    {
        $entries = $this->reader->page($entity, $entityId, $beforeId, self::PAGE + 1);
        $more = count($entries) > self::PAGE;
        $entries = array_slice($entries, 0, self::PAGE);

        return [$entries, $more ? $entries[self::PAGE - 1]->id : null];
    }
}
