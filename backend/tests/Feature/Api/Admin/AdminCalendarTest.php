<?php

declare(strict_types=1);

use App\Models\RegularHoliday;
use App\Models\Reservation;
use App\Models\User;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    $this->travelTo(new DateTimeImmutable('2026-10-06 15:00'));
    RegularHoliday::query()->create(['day_of_week' => 1]);
    $this->admin = User::factory()->admin()->create();
});

it('枠に予約の番号を付け、日ごとに予約の一覧を返す', function () {
    $member = User::factory()->create(['name' => '山田太郎']);
    $reservation = Reservation::factory()->for($member)->on('2026-10-09', 10, 12)->create(['price' => 8000]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/calendar?from=2026-10-09&to=2026-10-09')
        ->assertOk()
        ->assertJsonPath('meta.today', '2026-10-06')
        ->assertJsonPath('data.0.slots.0', ['hour' => 10, 'status' => 'booked', 'reservation_id' => $reservation->id])
        ->assertJsonPath('data.0.slots.2', ['hour' => 12, 'status' => 'available', 'reservation_id' => null]);

    expect($response->json('data.0.reservations'))->toBe([[
        'id' => $reservation->id,
        'date' => '2026-10-09',
        'start_hour' => 10,
        'end_hour' => 12,
        'hours' => 2,
        'price' => 8000,
        'status' => 'confirmed',
        'phase' => 'before_start',
        'is_cancellable' => true,
        'booker_name' => '山田太郎',
        'user_id' => $member->id,
        'is_phone' => false,
    ]]);
});

it('電話予約は is_phone が true', function () {
    Reservation::factory()->phone()->on('2026-10-09', 10, 12)->create();

    $this->actingAs($this->admin)
        ->getJson('/api/admin/calendar?from=2026-10-09&to=2026-10-09')
        ->assertJsonPath('data.0.reservations.0.is_phone', true)
        ->assertJsonPath('data.0.reservations.0.user_id', null);
});

it('定休日に残った予約の枠は booked、ほかは closed', function () {
    Reservation::factory()->phone()->on('2026-10-12', 10, 12)->create();

    $this->actingAs($this->admin)
        ->getJson('/api/admin/calendar?from=2026-10-12&to=2026-10-12')
        ->assertJsonPath('data.0.closed_reason', 'regular_holiday')
        ->assertJsonPath('data.0.slots.0.status', 'booked')
        ->assertJsonPath('data.0.slots.2.status', 'closed')
        ->assertJsonCount(1, 'data.0.reservations');
});

it('会員は 403', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/admin/calendar?from=2026-10-09&to=2026-10-09')
        ->assertForbidden();
});

it('ログインしていなければ 401', function () {
    $this->getJson('/api/admin/calendar?from=2026-10-09&to=2026-10-09')->assertUnauthorized();
});

it('ETag を付ける', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/calendar?from=2026-10-09&to=2026-10-09')
        ->assertHeader('ETag');
});
