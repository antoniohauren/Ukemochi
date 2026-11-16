<?php

declare(strict_types=1);

namespace App\Domain\Auth;

use App\Domain\DomainException;

/** Deactivating or demoting the only active admin would lock everyone out of the admin app. */
final class LastAdmin extends DomainException
{
    public function __construct()
    {
        parent::__construct('user.last_admin', 'The last active admin cannot be deactivated or demoted.');
    }
}
