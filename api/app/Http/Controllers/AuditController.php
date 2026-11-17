<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Audit\ReadAudit;
use App\Http\Requests\AuditRequest;
use App\Http\Resources\AuditPageResource;

final readonly class AuditController
{
    public function __construct(private ReadAudit $audit) {}

    public function __invoke(AuditRequest $r): AuditPageResource
    {
        $before = $r->filled('before') ? $r->integer('before') : null;

        return new AuditPageResource($this->audit->page($r->text('entity'), $r->text('entity_id'), $before));
    }
}
