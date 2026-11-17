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
        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained();
            $table->foreignId('shift_id')->constrained();
            $table->text('method');
            $table->bigInteger('amount_cents');
            $table->bigInteger('tendered_cents')->nullable();
            $table->text('payer_label')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestampTz('created_at');
            $table->boolean('voided')->default(false);

            $table->index('order_id');
            $table->index('shift_id');
        });

        DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method IN ('cash', 'credit', 'debit', 'pix'))");
        DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_amounts_check CHECK (amount_cents > 0 AND (tendered_cents IS NULL OR (method = 'cash' AND tendered_cents >= amount_cents)))");
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
