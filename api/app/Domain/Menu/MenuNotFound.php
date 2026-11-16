<?php

declare(strict_types=1);

namespace App\Domain\Menu;

use App\Domain\DomainException;

final class MenuNotFound extends DomainException
{
    public function __construct(string $entity, int $id)
    {
        parent::__construct('menu.not_found', "No {$entity} with id {$id}.", ['entity' => $entity]);
    }
}
