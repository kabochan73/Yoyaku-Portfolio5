<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\User;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
});

/**
 * @return array<string, string>
 */
function registerInput(array $overrides = []): array
{
    return [
        'name' => '山田太郎',
        'email' => 'taro@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        ...$overrides,
    ];
}

it('会員を登録し、ログイン状態にする', function () {
    $this->postJson('/api/register', registerInput())
        ->assertCreated()
        ->assertExactJson(['data' => [
            'id' => User::query()->sole()->id,
            'name' => '山田太郎',
            'email' => 'taro@example.com',
            'role' => 'user',
        ]]);

    $this->assertAuthenticatedAs(User::query()->sole());
});

it('role に admin を送っても会員になる', function () {
    $this->postJson('/api/register', registerInput(['role' => 'admin']))->assertCreated();

    expect(User::query()->sole()->role)->toBe(UserRole::User);
});

it('入力が正しくなければ項目ごとのエラーを返す', function (array $overrides, string $field, string $message) {
    User::factory()->create(['email' => 'used@example.com']);

    $this->postJson('/api/register', registerInput($overrides))
        ->assertUnprocessable()
        ->assertJsonPath("errors.{$field}", [$message]);

    $this->assertGuest();
})->with([
    '名前が21文字' => [['name' => str_repeat('あ', 21)], 'name', '名前は20文字以内で入力してください。'],
    'メールアドレスの重複' => [['email' => 'used@example.com'], 'email', 'このメールアドレスはすでに使われています。'],
    'パスワードが短い' => [['password' => 'short', 'password_confirmation' => 'short'], 'password', 'パスワードは8文字以上で入力してください。'],
    '確認と違う' => [['password_confirmation' => 'different123'], 'password', 'パスワードが確認用と一致しません。'],
]);

it('同じメールアドレスと IP からは 5回/分まで', function () {
    foreach (range(1, 5) as $_) {
        $this->postJson('/api/register', registerInput(['name' => '']))->assertUnprocessable();
    }

    $this->postJson('/api/register', registerInput())->assertTooManyRequests();
});
