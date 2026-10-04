<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware('api')->prefix('api/test-only')->group(function () {
        Route::get('/default', fn () => ['ok' => true]);
        Route::post('/login', fn () => ['ok' => true])->middleware('throttle:login');
        Route::get('/calendar', fn () => ['ok' => true])
            ->withoutMiddleware('throttle:api')
            ->middleware('throttle:calendar');
    });
});

it('ふつうの API は 60回/分まで', function () {
    foreach (range(1, 60) as $_) {
        $this->getJson('/api/test-only/default')->assertOk();
    }

    $this->getJson('/api/test-only/default')
        ->assertTooManyRequests()
        ->assertJsonPath('code', 'too_many_requests');
});

it('ログインは IP とメールアドレスの組ごとに 5回/分まで', function () {
    foreach (range(1, 5) as $_) {
        $this->postJson('/api/test-only/login', ['email' => 'taro@example.com'])->assertOk();
    }

    $this->postJson('/api/test-only/login', ['email' => 'TARO@example.com'])->assertTooManyRequests();
    $this->postJson('/api/test-only/login', ['email' => 'hanako@example.com'])->assertOk();
});

it('カレンダーは 60回/分を超えても通る', function () {
    foreach (range(1, 61) as $_) {
        $this->getJson('/api/test-only/calendar')->assertOk();
    }
});

it('ログイン中はユーザーごとに数える', function () {
    $taro = User::factory()->create();
    foreach (range(1, 60) as $_) {
        $this->actingAs($taro)->getJson('/api/test-only/default')->assertOk();
    }

    $this->actingAs($taro)->getJson('/api/test-only/default')->assertTooManyRequests();
    $this->actingAs(User::factory()->create())->getJson('/api/test-only/default')->assertOk();
});
