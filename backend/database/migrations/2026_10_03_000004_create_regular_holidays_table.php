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
        Schema::create('regular_holidays', function (Blueprint $table) {
            $table->id();
            $table->smallInteger('day_of_week')->unique();
            $table->timestamps();
        });

        DB::statement(<<<'SQL'
            ALTER TABLE regular_holidays
                ADD CONSTRAINT regular_holidays_day_of_week_check
                    CHECK (day_of_week BETWEEN 0 AND 6)
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('regular_holidays');
    }
};
