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
        Schema::create('settings', function (Blueprint $table): void {
            $table->text('key')->primary();
            $table->jsonb('value');
        });
        DB::statement("ALTER TABLE settings ADD CONSTRAINT settings_key_check CHECK (key IN ('restaurant_name', 'language', 'paper_width', 'delivery_fee_enabled', 'delivery_fee_cents'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
