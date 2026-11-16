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
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->text('name');
            $table->integer('sort')->default(0);
            $table->boolean('active')->default(true);
            $table->timestampsTz();
        });

        Schema::create('items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')->constrained();
            $table->text('name');
            $table->text('note')->nullable();
            $table->boolean('active')->default(true);
            $table->timestampsTz();
        });

        Schema::create('variants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('item_id')->constrained();
            // '' for an item's default variant.
            $table->text('name')->default('');
            $table->bigInteger('price_cents');
            $table->boolean('available')->default(true);
            $table->integer('sort')->default(0);
            $table->boolean('track_stock')->default(false);
            $table->integer('stock_min')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('addons', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('item_id')->nullable()->constrained();
            $table->foreignId('category_id')->nullable()->constrained();
            $table->text('name');
            $table->bigInteger('price_cents');
            $table->boolean('active')->default(true);
            $table->timestampsTz();
        });

        DB::statement('ALTER TABLE variants ADD CONSTRAINT variants_price_check CHECK (price_cents >= 0)');
        DB::statement('ALTER TABLE addons ADD CONSTRAINT addons_price_check CHECK (price_cents >= 0)');
        DB::statement('ALTER TABLE addons ADD CONSTRAINT addons_target_check CHECK (num_nonnulls(item_id, category_id) = 1)');
    }

    public function down(): void
    {
        Schema::dropIfExists('addons');
        Schema::dropIfExists('variants');
        Schema::dropIfExists('items');
        Schema::dropIfExists('categories');
    }
};
