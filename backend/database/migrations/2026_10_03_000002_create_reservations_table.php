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
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date')->index();
            $table->smallInteger('start_hour');
            $table->smallInteger('end_hour');
            $table->string('status', 20)->default('confirmed');
            $table->string('booker_name');
            $table->integer('price');
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });

        DB::statement(<<<'SQL'
            ALTER TABLE reservations
                ADD CONSTRAINT reservations_status_check
                    CHECK (status IN ('confirmed', 'cancelled')),
                ADD CONSTRAINT reservations_hours_check
                    CHECK (start_hour >= 0 AND start_hour < end_hour AND end_hour <= 24),
                ADD CONSTRAINT reservations_price_check
                    CHECK (price >= 0),
                ADD CONSTRAINT reservations_cancelled_at_check
                    CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
                ADD CONSTRAINT reservations_no_overlap
                    EXCLUDE USING gist (
                        date WITH =,
                        int4range(start_hour, end_hour) WITH &&
                    ) WHERE (status = 'confirmed')
            SQL);

        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX reservations_user_date_confirmed_unique
                ON reservations (user_id, date)
                WHERE status = 'confirmed' AND user_id IS NOT NULL
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
