<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Application\Audit\AuditLog;

final readonly class Logout
{
    public function __construct(private SessionAuth $session, private AuditLog $audit) {}

    public function execute(): void
    {
        $userId = $this->session->userId();
        $this->session->logout();

        if ($userId !== null) {
            $this->audit->record($userId, 'user', $userId, 'logout', []);
        }
    }
}
