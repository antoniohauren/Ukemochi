<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Auth\NotAuthenticated;
use App\Domain\Auth\User;

final readonly class CurrentUser
{
    public function __construct(private SessionAuth $session, private UserRepository $users) {}

    public function execute(): User
    {
        $id = $this->session->userId();
        $user = $id === null ? null : $this->users->find($id);

        if ($user === null || ! $user->active) {
            throw new NotAuthenticated;
        }

        return $user;
    }
}
