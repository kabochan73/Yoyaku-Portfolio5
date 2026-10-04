<?php

declare(strict_types=1);

use App\Domain\Facility\PriceType;
use App\Models\Price;
use App\Models\Reservation;
use App\Models\User;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    $this->travelTo(new DateTimeImmutable('2026-10-06 15:00'));
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
    $this->user = User::factory()->create(['name' => '山田太郎']);
});

describe('GET /user/reservations', function () {
    it('自分の今日以降の確定済みの予約を、日付と開始時刻の順に返す', function () {
        Reservation::factory()->for($this->user)->on('2026-10-05', 10, 12)->create();
        $later = Reservation::factory()->for($this->user)->on('2026-10-09', 18, 20)->create();
        $today = Reservation::factory()->for($this->user)->on('2026-10-06', 10, 12)->create();
        Reservation::factory()->for($this->user)->cancelled()->on('2026-10-07', 10, 12)->create();
        Reservation::factory()->on('2026-10-08', 10, 12)->create();

        $this->actingAs($this->user)
            ->getJson('/api/user/reservations')
            ->assertOk()
            ->assertJsonPath('data.*.id', [$today->id, $later->id]);
    });

    it('予約の形と、今の時刻から見た段階を返す', function () {
        $reservation = Reservation::factory()->for($this->user)->on('2026-10-06', 14, 16)->create(['price' => 8000]);

        $this->actingAs($this->user)
            ->getJson('/api/user/reservations')
            ->assertExactJson(['data' => [[
                'id' => $reservation->id,
                'date' => '2026-10-06',
                'start_hour' => 14,
                'end_hour' => 16,
                'hours' => 2,
                'price' => 8000,
                'status' => 'confirmed',
                'phase' => 'in_use',
                'is_cancellable' => false,
                'booker_name' => '山田太郎',
            ]]]);
    });

    it('ログインしていなければ 401', function () {
        $this->getJson('/api/user/reservations')->assertUnauthorized();
    });
});

describe('POST /reservations', function () {
    it('予約して 201 で返す', function () {
        $this->actingAs($this->user)
            ->postJson('/api/reservations', ['date' => '2026-10-10', 'start_hour' => 10, 'end_hour' => 12])
            ->assertCreated()
            ->assertJsonPath('data.booker_name', '山田太郎')
            ->assertJsonPath('data.price', 10000)
            ->assertJsonPath('data.is_cancellable', true);

        expect(Reservation::query()->sole()->user_id)->toBe($this->user->id);
    });

    it('入力の形が正しくなければ 422', function (array $input, string $field) {
        $this->actingAs($this->user)
            ->postJson('/api/reservations', $input)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);
    })->with([
        '日付が無い' => [['start_hour' => 10, 'end_hour' => 12], 'date'],
        '時が整数でない' => [['date' => '2026-10-10', 'start_hour' => 'ten', 'end_hour' => 12], 'start_hour'],
    ]);

    it('B3: 予約のルールに反していれば 422', function () {
        $this->actingAs($this->user)
            ->postJson('/api/reservations', ['date' => '2026-10-10', 'start_hour' => 9, 'end_hour' => 11])
            ->assertUnprocessable()
            ->assertJsonPath('errors.start_hour', ['営業時間（10:00〜22:00）内で選んでください。']);
    });

    it('B7: 重なる時間帯は 409 slot_taken', function () {
        Reservation::factory()->phone()->on('2026-10-10', 10, 12)->create();

        $this->actingAs($this->user)
            ->postJson('/api/reservations', ['date' => '2026-10-10', 'start_hour' => 11, 'end_hour' => 13])
            ->assertConflict()
            ->assertJsonPath('code', 'slot_taken');
    });

    it('B8: 同じ日の2件目は 409 already_booked_that_day', function () {
        Reservation::factory()->for($this->user)->on('2026-10-10', 10, 12)->create();

        $this->actingAs($this->user)
            ->postJson('/api/reservations', ['date' => '2026-10-10', 'start_hour' => 14, 'end_hour' => 16])
            ->assertConflict()
            ->assertJsonPath('code', 'already_booked_that_day');
    });

    it('ログインしていなければ 401', function () {
        $this->postJson('/api/reservations', ['date' => '2026-10-10', 'start_hour' => 10, 'end_hour' => 12])
            ->assertUnauthorized();
    });
});
