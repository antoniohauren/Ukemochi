<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Auth\Role;
use App\Infrastructure\Auth\EloquentUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/** @extends Factory<EloquentUser> */
final class UserFactory extends Factory
{
    protected $model = EloquentUser::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->firstName(),
            'pin_hash' => Hash::make('1234'),
            'role' => Role::Waitress,
            'active' => true,
        ];
    }

    public function role(Role $role): static
    {
        return $this->state(['role' => $role]);
    }

    public function inactive(): static
    {
        return $this->state(['active' => false]);
    }
}
