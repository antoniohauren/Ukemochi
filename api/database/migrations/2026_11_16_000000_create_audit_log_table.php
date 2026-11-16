<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_log', function (Blueprint $table): void {
            $table->id();
            // Foreign key to users is added with the staff users table.
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestampTz('at', 6);
            // entity and action are free-form by design (no CHECK): every feature adds its own.
            $table->text('entity');
            $table->text('entity_id');
            $table->text('action');
            $table->jsonb('summary');
            $table->text('note')->nullable();

            $table->index(['entity', 'entity_id']);
            $table->index('at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_log');
    }
};
