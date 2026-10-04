<?php

declare(strict_types=1);

use App\Domain\Facility\PriceType;
use App\Models\Price;
use App\Models\RegularHoliday;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
    RegularHoliday::query()->create(['day_of_week' => 1]);
    $this->admin = User::factory()->admin()->create();
    Mail::fake();
});

/**
 * @return array<string, mixed>
 */
function phoneInput(array $overrides = []): array
{
    return ['date' => '2026-10-09', 'start_hour' => 10, 'end_hour' => 12, 'booker_name' => '佐藤（電話）', ...$overrides];
}

it('電話予約を登録し、会員なしの予約として返す', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/reservations', phoneInput())
        ->assertCreated()
        ->assertJsonPath('data.booker_name', '佐藤（電話）')
        ->assertJsonPath('data.user_id', null)
        ->assertJsonPath('data.is_phone', true)
        ->assertJsonPath('data.price', 8000);

    Mail::assertNothingSent();
});

it('会員と同じ予約のルールで弾く', function (array $overrides, string $field) {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/reservations', phoneInput($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'B6: 定休日' => [['date' => '2026-10-12'], 'date'],
    'B4: 1か月より先' => [['date' => '2026-11-07'], 'date'],
    '予約者名が無い' => [['booker_name' => ''], 'booker_name'],
    '予約者名が256文字' => [['booker_name' => str_repeat('あ', 256)], 'booker_name'],
]);

it('B7: 重なる時間帯は 409', function () {
    Reservation::factory()->on('2026-10-09', 11, 13)->create();

    $this->actingAs($this->admin)
        ->postJson('/api/admin/reservations', phoneInput())
        ->assertConflict()
        ->assertJsonPath('code', 'slot_taken');
});

it('B8 は当てない: 同じ日に2件作れる', function () {
    $this->actingAs($this->admin)->postJson('/api/admin/reservations', phoneInput())->assertCreated();
    $this->actingAs($this->admin)->postJson('/api/admin/reservations', phoneInput(['start_hour' => 14, 'end_hour' => 16]))->assertCreated();
});

it('会員は 403', function () {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/admin/reservations', phoneInput())
        ->assertForbidden();
});
