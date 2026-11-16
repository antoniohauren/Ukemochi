<?php

declare(strict_types=1);

namespace App\Domain\Realtime;

use App\Domain\DomainException;

/** The server has no Reverb app key configured, so clients cannot connect for live updates. */
final class RealtimeUnavailable extends DomainException
{
    public function __construct()
    {
        parent::__construct('realtime.unavailable', 'Live updates are not configured.');
    }
}
