<?php

declare(strict_types=1);

use App\Models\Reservation;
use App\Models\User;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    $this->admin = User::factory()->admin()->create(['name' => '山田管理者', 'email' => 'admin@example.com']);
});

function searchUsers(string $keyword): TestResponse
{
    return test()->actingAs(test()->admin)->getJson('/api/admin/users?search='.urlencode($keyword));
}

it('名前の部分一致で探し、確定済みの予約の件数を付ける', function () {
    $taro = User::factory()->create(['name' => '山田太郎', 'email' => 'taro@example.com']);
    User::factory()->create(['name' => '佐藤花子', 'email' => 'hanako@example.com']);
    Reservation::factory()->for($taro)->on('2026-10-09', 10, 12)->create();
    Reservation::factory()->for($taro)->on('2026-10-10', 10, 12)->create();
    Reservation::factory()->for($taro)->cancelled()->on('2026-10-11', 10, 12)->create();

    searchUsers('山田')
        ->assertOk()
        ->assertExactJson([
            'data' => [[
                'id' => $taro->id,
                'name' => '山田太郎',
                'email' => 'taro@example.com',
                'confirmed_reservations_count' => 2,
            ]],
            'meta' => ['limit' => 20],
        ]);
});

it('メールアドレスでも、大文字と小文字を区別せずに探す', function () {
    User::factory()->create(['name' => '佐藤花子', 'email' => 'hanako@example.com']);

    searchUsers('HANAKO')->assertJsonPath('data.0.name', '佐藤花子');
});

it('% と _ は文字そのものとして扱う', function (string $keyword) {
    User::factory()->create(['name' => '佐藤花子', 'email' => 'hanako@example.com']);

    searchUsers($keyword)->assertJsonCount(0, 'data');
})->with(['%', '_']);

it('名前の順に最大20件', function () {
    foreach (range(21, 1) as $i) {
        User::factory()->create(['name' => sprintf('会員%02d', $i)]);
    }

    $response = searchUsers('会員')->assertJsonCount(20, 'data');

    expect($response->json('data.0.name'))->toBe('会員01')
        ->and($response->json('data.19.name'))->toBe('会員20');
});

it('検索語が無い・長すぎれば 422', function (string $query) {
    $this->actingAs($this->admin)
        ->getJson("/api/admin/users{$query}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('search');
})->with([
    '無い' => [''],
    '256文字' => ['?search='.str_repeat('a', 256)],
]);

it('会員は 403', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/admin/users?search=山田')
        ->assertForbidden();
});
