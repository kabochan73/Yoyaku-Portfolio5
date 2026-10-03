<?php

declare(strict_types=1);

namespace App\Providers;

use App\Reservations\BookingRules;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(BookingRules::class, function (): BookingRules {
            /** @var array{open_hour: int, close_hour: int, min_hours: int, max_hours: int, booking_window_months: int} $rules */
            $rules = config('facility.rules');

            return BookingRules::fromConfig($rules);
        });
    }

    public function boot(): void
    {
        //
    }
}
