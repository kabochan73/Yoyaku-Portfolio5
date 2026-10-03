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
        Schema::create('prices', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->unique();
            $table->integer('amount_per_hour');
            $table->timestamps();
        });

        DB::statement(<<<'SQL'
            ALTER TABLE prices
                ADD CONSTRAINT prices_type_check
                    CHECK (type IN ('weekday', 'weekend')),
                ADD CONSTRAINT prices_amount_per_hour_check
                    CHECK (amount_per_hour >= 0)
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('prices');
    }
};
