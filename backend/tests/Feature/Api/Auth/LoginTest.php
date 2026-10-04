<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
});

it('ログインして、ユーザーを返す', function (Closure $makeUser, string $role) {
    $user = $makeUser();

    $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.role', $role);

    $this->assertAuthenticatedAs($user);
})->with([
    '会員' => [fn () => User::factory()->create(), 'user'],
    '管理者' => [fn () => User::factory()->admin()->create(), 'admin'],
]);

it('メールアドレスかパスワードが違えば、どちらでも同じエラーを返す', function (string $email, string $password) {
    User::factory()->create(['email' => 'taro@example.com']);

    $this->postJson('/api/login', ['email' => $email, 'password' => $password])
        ->assertUnprocessable()
        ->assertExactJson([
            'message' => '入力内容を確認してください。',
            'code' => 'validation_failed',
            'errors' => ['credentials' => ['メールアドレスまたはパスワードが正しくありません。']],
        ]);

    $this->assertGuest();
})->with([
    'パスワード違い' => ['taro@example.com', 'wrong-password'],
    '存在しないメールアドレス' => ['nobody@example.com', 'password'],
]);

it('入力が無ければ項目ごとのエラーを返す', function () {
    $this->postJson('/api/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);
});
