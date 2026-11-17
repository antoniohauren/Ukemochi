<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Optional short name printed on tickets in place of "category item · variant"; lines snapshot it. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('variants', fn (Blueprint $t) => $t->text('print_name')->nullable());
        Schema::table('order_lines', fn (Blueprint $t) => $t->text('print_name')->nullable());
    }

    public function down(): void
    {
        Schema::table('variants', fn (Blueprint $t) => $t->dropColumn('print_name'));
        Schema::table('order_lines', fn (Blueprint $t) => $t->dropColumn('print_name'));
    }
};
