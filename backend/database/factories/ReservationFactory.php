<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Reservation;
use App\Models\User;
use App\Reservations\ReservationStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reservation>
 */
final class ReservationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'date' => today()->addDay()->toDateString(),
            'start_hour' => 10,
            'end_hour' => 12,
            'status' => ReservationStatus::Confirmed,
            'booker_name' => fn (array $attributes) => User::query()->find($attributes['user_id'])?->name ?? '電話予約',
            'price' => 8000,
            'cancelled_at' => null,
        ];
    }

    public function confirmed(): static
    {
        return $this->state(fn () => [
            'status' => ReservationStatus::Confirmed,
            'cancelled_at' => null,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => [
            'status' => ReservationStatus::Cancelled,
            'cancelled_at' => now(),
        ]);
    }

    public function phone(): static
    {
        return $this->state(fn () => [
            'user_id' => null,
            'booker_name' => '電話予約',
        ]);
    }

    public function on(string $date, int $startHour, int $endHour): static
    {
        return $this->state(fn () => [
            'date' => $date,
            'start_hour' => $startHour,
            'end_hour' => $endHour,
        ]);
    }
}
