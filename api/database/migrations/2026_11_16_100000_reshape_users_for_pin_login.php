<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('password_reset_tokens');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['email', 'email_verified_at', 'password', 'remember_token']);
            $table->string('pin_hash');
            $table->text('role');
            $table->boolean('active')->default(true);
        });

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'waitress', 'kitchen'))");
        // Login is by name, typed freely on a phone: unique ignoring case.
        DB::statement('CREATE UNIQUE INDEX users_name_lower_unique ON users (lower(name))');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX users_name_lower_unique');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['pin_hash', 'role', 'active']);
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }
};
