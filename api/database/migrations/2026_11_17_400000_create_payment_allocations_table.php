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
        // The quantity is an exact fraction (1/3 of a roll): numerator and denominator.
        Schema::create('payment_allocations', function (Blueprint $table): void {
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            // A line removed by an edit takes its allocations with it; the payment amount stays.
            $table->foreignId('line_id')->constrained('order_lines')->cascadeOnDelete();
            $table->integer('qty_num');
            $table->integer('qty_den');

            $table->index('payment_id');
        });

        DB::statement('ALTER TABLE payment_allocations ADD CONSTRAINT payment_allocations_qty_check CHECK (qty_num > 0 AND qty_den > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
    }
};
