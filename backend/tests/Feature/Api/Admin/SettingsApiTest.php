<?php

declare(strict_types=1);

use App\Domain\Facility\PriceType;
use App\Models\Price;
use App\Models\RegularHoliday;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
    RegularHoliday::query()->create(['day_of_week' => 1]);
    $this->admin = User::factory()->admin()->create();
    config([
        'services.frontend.internal_url' => 'http://frontend.test',
        'services.frontend.revalidate_secret' => 'test-secret',
    ]);
    Http::fake(['frontend.test/*' => Http::response(['revalidated' => true])]);
});

describe('PUT /admin/prices', function () {
    it('料金を更新し、更新後の施設情報を返す', function () {
        $this->actingAs($this->admin)
            ->putJson('/api/admin/prices', ['weekday' => 4500, 'weekend' => 5500])
            ->assertOk()
            ->assertJsonPath('data.prices', ['weekday' => 4500, 'weekend' => 5500])
            ->assertJsonPath('data.regular_holidays', [1])
            ->assertJsonPath('data.name', 'FUTSAL PARK');
    });

    it('入力が正しくなければ 422', function (array $input, string $field) {
        $this->actingAs($this->admin)
            ->putJson('/api/admin/prices', $input)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);
    })->with([
        '負の数' => [['weekday' => -1, 'weekend' => 5000], 'weekday'],
        '小数' => [['weekday' => 4000, 'weekend' => 4500.5], 'weekend'],
        '空' => [['weekday' => 4000], 'weekend'],
    ]);

    it('更新すると、フロントにトップページを作り直させる', function () {
        $this->actingAs($this->admin)->putJson('/api/admin/prices', ['weekday' => 4500, 'weekend' => 5500]);

        Http::assertSent(fn (Request $request) => $request->url() === 'http://frontend.test/internal/revalidate');
    });
});

describe('PUT /admin/regular-holidays', function () {
    it('定休日を入れ替え、更新後の施設情報を返す', function () {
        $this->actingAs($this->admin)
            ->putJson('/api/admin/regular-holidays', ['days' => [3, 0]])
            ->assertOk()
            ->assertJsonPath('data.regular_holidays', [0, 3]);
    });

    it('空の配列で定休日なしにできる', function () {
        $this->actingAs($this->admin)
            ->putJson('/api/admin/regular-holidays', ['days' => []])
            ->assertOk()
            ->assertJsonPath('data.regular_holidays', []);
    });

    it('入力が正しくなければ 422', function (array $input, string $field, string $message) {
        $this->actingAs($this->admin)
            ->putJson('/api/admin/regular-holidays', $input)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$field => $message]);
    })->with([
        'days が無い' => [[], 'days', '定休日を指定してください。'],
        '範囲外' => [['days' => [7]], 'days.0', '曜日は0〜6の範囲で入力してください。'],
        '重複' => [['days' => [3, 3]], 'days.0', '曜日に同じ値が含まれています。'],
    ]);
});

it('会員は 403', function (string $method, string $url, array $input) {
    $this->actingAs(User::factory()->create())
        ->json($method, $url, $input)
        ->assertForbidden();
})->with([
    '料金' => ['PUT', '/api/admin/prices', ['weekday' => 4500, 'weekend' => 5500]],
    '定休日' => ['PUT', '/api/admin/regular-holidays', ['days' => [3]]],
]);
