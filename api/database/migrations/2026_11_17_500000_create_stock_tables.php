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
        Schema::create('stock_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('variant_id')->constrained();
            $table->text('kind');
            $table->integer('qty_delta');
            $table->foreignId('order_id')->nullable()->constrained();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestampTz('created_at');
            $table->index(['variant_id', 'kind', 'created_at']);
        });
        DB::statement('ALTER TABLE variants ADD CONSTRAINT variants_stock_min_check CHECK (stock_min IS NULL OR stock_min >= 0)');
        DB::statement("ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_kind_check CHECK (kind IN ('sale', 'purchase', 'adjust'))");
        DB::statement("ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_check CHECK (qty_delta <> 0 AND (kind = 'sale') = (order_id IS NOT NULL))");
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        DB::statement('ALTER TABLE variants DROP CONSTRAINT variants_stock_min_check');
    }
};
