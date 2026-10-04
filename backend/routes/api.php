<?php

declare(strict_types=1);

use App\Http\Controllers\FacilityController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/facility', FacilityController::class);

// デプロイ後に、Laravel から見た IP が利用者の IP になっているかを確かめるための口
Route::get('/debug/ip', function (Request $request) {
    abort_unless(app()->environment(['local', 'testing']) || config('app.debug_ip_endpoint'), 404);

    return [
        'ip' => $request->ip(),
        'x_forwarded_for' => $request->header('X-Forwarded-For'),
    ];
});
