<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Reservations\BookingRules;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

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
        $this->configureRateLimiting();

        TrustProxies::at(array_map('trim', explode(',', (string) config('app.trusted_proxies'))));
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)->by($this->rateLimitKey($request)));

        RateLimiter::for('calendar', fn (Request $request) => Limit::perMinute(300)->by($this->rateLimitKey($request)));

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)->by(
            Str::lower((string) $request->input('email')).'|'.$request->ip(),
        ));
    }

    private function rateLimitKey(Request $request): string
    {
        return (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());
    }
}
