<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Application\Auth\CreateAdmin;
use App\Domain\DomainException;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Contracts\Config\Repository as Config;

// No PIN argument: it would land in shell history and `ps`. ADMIN_PIN or a hidden prompt instead.
#[Signature('user:create-admin {name? : Defaults to ADMIN_NAME}')]
#[Description('Create an admin user (first install)')]
final class CreateAdminCommand extends Command
{
    public function handle(CreateAdmin $createAdmin, Config $config): int
    {
        $name = trim($this->stringArgument('name') ?? self::string($config->get('auth.first_admin.name')));
        if ($name === '') {
            $this->error('Give a name (argument or ADMIN_NAME).');

            return self::FAILURE;
        }

        $pin = self::string($config->get('auth.first_admin.pin'));
        if ($pin === '' && $this->input->isInteractive()) {
            $pin = self::string($this->secret('PIN (4 digits)'));
        }
        if ($pin === '') {
            $this->error('Set ADMIN_PIN or run interactively to be asked for the PIN.');

            return self::FAILURE;
        }

        try {
            $user = $createAdmin->execute($name, $pin);
        } catch (DomainException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Admin \"{$user->name}\" created.");

        return self::SUCCESS;
    }

    private function stringArgument(string $key): ?string
    {
        $value = $this->argument($key);

        return is_string($value) ? $value : null;
    }

    private static function string(mixed $value): string
    {
        // env() turns ADMIN_PIN=1234 into a string, but a config override may pass an int.
        return is_string($value) || is_int($value) ? (string) $value : '';
    }
}
