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
        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->text('name');
            // Digits only: the lookup key.
            $table->text('phone')->nullable()->unique();
            $table->text('note')->nullable();
            $table->timestampsTz();
        });

        Schema::create('addresses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->text('text');
            $table->text('note')->nullable();

            $table->index('customer_id');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->foreign('customer_id')->references('id')->on('customers');
            $table->index('customer_id');
        });

        DB::statement("ALTER TABLE customers ADD CONSTRAINT customers_phone_check CHECK (phone ~ '^[0-9]{8,15}$')");
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropForeign(['customer_id']);
            $table->dropIndex(['customer_id']);
        });
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('customers');
    }
};
