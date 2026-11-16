<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Domain\Auth\Role;
use App\Domain\Auth\User;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $pin_hash
 * @property Role $role
 * @property bool $active
 */
final class EloquentUser extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    protected $table = 'users';

    // PIN sessions only: no "remember me" column.
    protected $rememberTokenName = '';

    protected $fillable = ['name', 'pin_hash'];

    protected $hidden = ['pin_hash'];

    public function getAuthPasswordName(): string
    {
        return 'pin_hash';
    }

    public function toDomain(): User
    {
        return new User($this->id, $this->name, $this->role, $this->active, $this->pin_hash);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['role' => Role::class, 'active' => 'boolean'];
    }

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
