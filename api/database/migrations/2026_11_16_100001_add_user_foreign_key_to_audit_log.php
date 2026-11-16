<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_log', function (Blueprint $table): void {
            // Restrict: staff are deactivated, never deleted, so the log always knows who.
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('audit_log', function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
        });
    }
};
