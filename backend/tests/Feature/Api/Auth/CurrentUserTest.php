<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
});

it('ログイン中のユーザーを返す', function () {
    $user = User::factory()->create(['name' => '山田太郎']);

    $this->actingAs($user)
        ->getJson('/api/user')
        ->assertOk()
        ->assertExactJson(['data' => [
            'id' => $user->id,
            'name' => '山田太郎',
            'email' => $user->email,
            'role' => 'user',
        ]]);
});

it('ログインしていなければ 401', function () {
    $this->getJson('/api/user')->assertUnauthorized();
});
