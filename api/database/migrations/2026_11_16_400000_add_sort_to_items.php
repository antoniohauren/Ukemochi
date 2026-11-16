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
        Schema::table('items', function (Blueprint $table): void {
            $table->integer('sort')->default(0);
        });

        // Keep today's alphabetical order as the starting position within each category.
        DB::statement(<<<'SQL'
            UPDATE items SET sort = ranked.position
            FROM (SELECT id, row_number() OVER (PARTITION BY category_id ORDER BY name, id) - 1 AS position FROM items) AS ranked
            WHERE items.id = ranked.id
            SQL);
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table): void {
            $table->dropColumn('sort');
        });
    }
};
