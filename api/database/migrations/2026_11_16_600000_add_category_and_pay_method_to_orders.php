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
        Schema::table('order_lines', function (Blueprint $table): void {
            $table->text('category_name')->default('');
        });
        // Existing lines take their variant's current category name.
        DB::statement('UPDATE order_lines SET category_name = c.name FROM variants v JOIN items i ON i.id = v.item_id JOIN categories c ON c.id = i.category_id WHERE v.id = order_lines.variant_id');

        Schema::table('orders', function (Blueprint $table): void {
            $table->text('pay_method')->nullable();
        });
        // Before the method was recorded, pay on delivery meant cash ("troco para").
        DB::statement("UPDATE orders SET pay_method = 'cash' WHERE pay_on_delivery");
        DB::statement('UPDATE orders SET change_for_cents = NULL WHERE pay_method IS NULL');
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_pay_method_check CHECK ((pay_on_delivery AND pay_method IN ('cash', 'credit', 'debit', 'pix')) OR (NOT pay_on_delivery AND pay_method IS NULL))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_change_for_check CHECK (change_for_cents IS NULL OR pay_method = 'cash')");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE orders DROP CONSTRAINT orders_change_for_check');
        DB::statement('ALTER TABLE orders DROP CONSTRAINT orders_pay_method_check');
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn('pay_method');
        });
        Schema::table('order_lines', function (Blueprint $table): void {
            $table->dropColumn('category_name');
        });
    }
};
