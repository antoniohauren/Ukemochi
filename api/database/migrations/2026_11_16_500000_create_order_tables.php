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
        Schema::create('counters', function (Blueprint $table): void {
            $table->text('name')->primary();
            $table->bigInteger('value');
        });
        DB::table('counters')->insert(['name' => 'order_number', 'value' => 0]);

        Schema::create('orders', function (Blueprint $table): void {
            // The order number, taken from counters.order_number: no sequence, so no gaps.
            $table->unsignedBigInteger('id')->primary();
            $table->text('type');
            $table->text('status');
            // Foreign key to customers is added with the customers table.
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->text('customer_name');
            $table->text('address_text')->nullable();
            $table->bigInteger('delivery_fee_cents')->default(0);
            $table->boolean('pay_on_delivery')->default(false);
            $table->bigInteger('change_for_cents')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestampsTz();
            $table->timestampTz('closed_at')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->integer('printed_version')->default(0);
            $table->integer('version')->default(1);

            $table->index('created_at');
            $table->index('status');
        });

        Schema::create('order_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained();
            $table->foreignId('variant_id')->constrained();
            $table->text('item_name');
            $table->text('variant_name');
            $table->bigInteger('unit_price_cents');
            $table->integer('qty');
            $table->text('note')->nullable();

            $table->index('order_id');
        });

        Schema::create('line_addons', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('line_id')->constrained('order_lines')->cascadeOnDelete();
            $table->foreignId('addon_id')->constrained();
            $table->text('name');
            $table->bigInteger('price_cents');

            $table->index('line_id');
        });

        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_type_check CHECK (type IN ('dine_in', 'pickup', 'delivery'))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('open', 'ready', 'out_for_delivery', 'closed', 'cancelled'))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_cancel_reason_check CHECK (status <> 'cancelled' OR cancel_reason IS NOT NULL)");
        DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_amounts_check CHECK (delivery_fee_cents >= 0 AND (change_for_cents IS NULL OR change_for_cents >= 0))');
        DB::statement('ALTER TABLE order_lines ADD CONSTRAINT order_lines_check CHECK (unit_price_cents >= 0 AND qty >= 1)');
        DB::statement('ALTER TABLE line_addons ADD CONSTRAINT line_addons_price_check CHECK (price_cents >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('line_addons');
        Schema::dropIfExists('order_lines');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('counters');
    }
};
