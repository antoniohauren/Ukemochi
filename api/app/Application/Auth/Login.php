<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Application\Audit\AuditLog;
use App\Domain\Auth\InvalidCredentials;
use App\Domain\Auth\User;

final readonly class Login
{
    public function __construct(
        private UserRepository $users,
        private PinHasher $hasher,
        private SessionAuth $session,
        private LoginThrottle $throttle,
        private AuditLog $audit,
    ) {}

    public function execute(string $name, string $pin): User
    {
        $user = $this->users->findByName($name);
        // Known users are keyed by id, so every spelling the lookup matches shares one lockout.
        $key = $user === null ? 'name:'.mb_strtolower(trim($name)) : "user:{$user->id}";

        $valid = $this->throttle->attempt($key, function () use ($user, $pin): bool {
            if ($user === null) {
                // Same hashing cost as a real check, so response time does not reveal which names exist.
                $this->hasher->hash($pin);

                return false;
            }

            return $this->hasher->verify($pin, $user->pinHash) && $user->active;
        });

        if ($user === null || ! $valid) {
            // Never the typed name: a PIN typed into the name field would be stored.
            $this->audit->record(null, 'auth', $user->id ?? 'unknown', 'login_failed', ['user_id' => $user?->id]);

            throw new InvalidCredentials;
        }

        $this->session->login($user->id);
        $this->audit->record($user->id, 'user', $user->id, 'login', []);

        return $user;
    }
}
