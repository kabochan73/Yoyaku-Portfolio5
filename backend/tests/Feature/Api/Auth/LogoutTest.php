<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
});

it('ログアウトすると、ログインしていない状態になる', function () {
    $user = User::factory()->create();
    $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk();

    $this->postJson('/api/logout')->assertNoContent();

    $this->assertGuest('web');
});

it('ログインしていなければ 401', function () {
    $this->postJson('/api/logout')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');
});
