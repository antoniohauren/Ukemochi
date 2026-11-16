<?php

declare(strict_types=1);

use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Support\Facades\Broadcast;

// Any logged-in staff member; inactive users never authenticate (see the active-users provider).
Broadcast::channel('orders', fn (mixed $user): bool => $user instanceof EloquentUser && $user->active);
