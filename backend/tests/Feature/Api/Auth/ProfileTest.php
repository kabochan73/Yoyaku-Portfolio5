<?php

declare(strict_types=1);

use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    $this->user = User::factory()->create(['name' => '山田太郎', 'email' => 'taro@example.com']);
});

it('名前とメールアドレスを変えられる', function () {
    $this->actingAs($this->user)
        ->putJson('/api/user/profile', ['name' => '山田花子', 'email' => 'hanako@example.com'])
        ->assertOk()
        ->assertJsonPath('data.name', '山田花子')
        ->assertJsonPath('data.email', 'hanako@example.com');

    expect($this->user->fresh())
        ->name->toBe('山田花子')
        ->email->toBe('hanako@example.com');
});

it('自分のメールアドレスのままなら、重複のエラーにならない', function () {
    $this->actingAs($this->user)
        ->putJson('/api/user/profile', ['name' => '山田花子', 'email' => 'taro@example.com'])
        ->assertOk();
});

it('ほかの会員のメールアドレスにはできない', function () {
    User::factory()->create(['email' => 'used@example.com']);

    $this->actingAs($this->user)
        ->putJson('/api/user/profile', ['name' => '山田太郎', 'email' => 'used@example.com'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('パスワードを変えるには、今のパスワードが必要', function (array $input) {
    $this->actingAs($this->user)
        ->putJson('/api/user/profile', [
            'name' => '山田太郎',
            'email' => 'taro@example.com',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
            ...$input,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('current_password');

    expect(Hash::check('password', $this->user->fresh()->password))->toBeTrue();
})->with([
    '送らない' => [[]],
    '違う' => [['current_password' => 'wrong-password']],
]);

it('今のパスワードが正しければパスワードが変わり、新しいパスワードでログインできる', function () {
    $this->actingAs($this->user)
        ->putJson('/api/user/profile', [
            'name' => '山田太郎',
            'email' => 'taro@example.com',
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertOk();

    $this->postJson('/api/logout');
    $this->postJson('/api/login', ['email' => 'taro@example.com', 'password' => 'new-password'])->assertOk();
});

it('パスワードを送らなければ、パスワードは変わらない', function () {
    $this->actingAs($this->user)
        ->putJson('/api/user/profile', ['name' => '山田花子', 'email' => 'taro@example.com'])
        ->assertOk();

    expect(Hash::check('password', $this->user->fresh()->password))->toBeTrue();
});

it('B10: 名前を変えても、すでにある予約の予約者名は変えない', function () {
    $reservation = Reservation::factory()->for($this->user)->create();

    $this->actingAs($this->user)
        ->putJson('/api/user/profile', ['name' => '山田花子', 'email' => 'taro@example.com'])
        ->assertOk();

    expect($reservation->fresh()->booker_name)->toBe('山田太郎');
});

it('ログインしていなければ 401', function () {
    $this->putJson('/api/user/profile', ['name' => '山田花子', 'email' => 'taro@example.com'])
        ->assertUnauthorized();
});
