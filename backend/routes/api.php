<?php

declare(strict_types=1);

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\FacilityController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/facility', FacilityController::class);

Route::get('/calendar', CalendarController::class)
    ->withoutMiddleware('throttle:api')
    ->middleware(['throttle:calendar', 'cache.headers:private;no_cache;etag']);

Route::middleware('throttle:login')->group(function () {
    Route::post('/register', RegisterController::class);
    Route::post('/login', [SessionController::class, 'store']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [SessionController::class, 'destroy']);

    Route::get('/user', [UserController::class, 'show']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);

    Route::get('/user/reservations', [ReservationController::class, 'index']);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::post('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);
});

Route::prefix('admin')->middleware(['auth:sanctum', 'can:admin'])->group(function () {
    Route::get('/calendar', Admin\CalendarController::class)
        ->withoutMiddleware('throttle:api')
        ->middleware(['throttle:calendar', 'cache.headers:private;no_cache;etag']);

    Route::post('/reservations', [Admin\ReservationController::class, 'store']);
    Route::post('/reservations/{reservation}/cancel', [Admin\ReservationController::class, 'cancel']);

    Route::put('/prices', [Admin\SettingsController::class, 'updatePrices']);
    Route::put('/regular-holidays', [Admin\SettingsController::class, 'updateRegularHolidays']);

    Route::get('/holidays', [Admin\HolidayController::class, 'index']);
    Route::post('/holidays', [Admin\HolidayController::class, 'store']);
    Route::delete('/holidays/{holiday}', [Admin\HolidayController::class, 'destroy']);
});

// デプロイ後に、Laravel から見た IP が利用者の IP になっているかを確かめるための口
Route::get('/debug/ip', function (Request $request) {
    abort_unless(app()->environment(['local', 'testing']) || config('app.debug_ip_endpoint'), 404);

    return [
        'ip' => $request->ip(),
        'x_forwarded_for' => $request->header('X-Forwarded-For'),
    ];
});
