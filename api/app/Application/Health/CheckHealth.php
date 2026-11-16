<?php

declare(strict_types=1);

namespace App\Application\Health;

final readonly class CheckHealth
{
    public function __construct(private DatabaseProbe $database) {}

    /** True when every dependency the API needs answers. */
    public function execute(): bool
    {
        return $this->database->isUp();
    }
}
