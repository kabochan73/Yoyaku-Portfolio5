<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware(['api', 'auth:sanctum'])->get('/api/test-only/me', fn () => ['id' => auth()->id()]);
});

it('CSRF の Cookie を受け取れる', function () {
    $this->get('/sanctum/csrf-cookie', ['Referer' => 'http://localhost:3000/'])
        ->assertNoContent()
        ->assertCookie('XSRF-TOKEN');
});

it('ログインのセッションで /api を呼べる', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/test-only/me', ['Referer' => 'http://localhost:3000/'])
        ->assertOk()
        ->assertExactJson(['id' => $user->id]);
});

it('ログインしていなければ 401', function () {
    $this->getJson('/api/test-only/me', ['Referer' => 'http://localhost:3000/'])
        ->assertUnauthorized();
});
