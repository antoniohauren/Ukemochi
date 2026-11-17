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
        Schema::create('shifts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('opened_by')->constrained('users');
            $table->timestampTz('opened_at');
            $table->bigInteger('opening_float_cents');
            $table->foreignId('closed_by')->nullable()->constrained('users');
            $table->timestampTz('closed_at')->nullable();
            $table->bigInteger('counted_cents')->nullable();
            $table->text('note')->nullable();
        });

        Schema::create('cash_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shift_id')->constrained();
            $table->text('kind');
            $table->bigInteger('amount_cents');
            $table->text('staff_name')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestampTz('created_at');

            $table->index('shift_id');
        });

        // At most one open shift.
        DB::statement('CREATE UNIQUE INDEX shifts_one_open ON shifts ((true)) WHERE closed_at IS NULL');
        DB::statement('ALTER TABLE shifts ADD CONSTRAINT shifts_amounts_check CHECK (opening_float_cents >= 0 AND (counted_cents IS NULL OR counted_cents >= 0))');
        DB::statement('ALTER TABLE shifts ADD CONSTRAINT shifts_close_check CHECK ((closed_at IS NULL) = (closed_by IS NULL) AND (closed_at IS NULL) = (counted_cents IS NULL))');
        DB::statement("ALTER TABLE cash_movements ADD CONSTRAINT cash_movements_kind_check CHECK (kind IN ('withdrawal', 'deposit', 'staff_meal'))");
        DB::statement("ALTER TABLE cash_movements ADD CONSTRAINT cash_movements_check CHECK (amount_cents > 0 AND (kind = 'staff_meal') = (staff_name IS NOT NULL))");
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('shifts');
    }
};
