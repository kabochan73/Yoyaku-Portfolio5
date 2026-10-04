<?php

declare(strict_types=1);

use App\Domain\Reservations\ReservationStatus;
use App\Models\Reservation;
use App\Models\User;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    $this->travelTo(new DateTimeImmutable('2026-10-06 15:00'));
    $this->user = User::factory()->create();
});

it('C1: 自分の予約をキャンセルできる', function () {
    $reservation = Reservation::factory()->for($this->user)->on('2026-10-09', 10, 12)->create();

    $this->actingAs($this->user)
        ->postJson("/api/reservations/{$reservation->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.is_cancellable', false);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
});

it('C1: ほかの会員の予約は 403', function (Closure $makeUser) {
    $reservation = Reservation::factory()->on('2026-10-09', 10, 12)->create();

    $this->actingAs($makeUser())
        ->postJson("/api/reservations/{$reservation->id}/cancel")
        ->assertForbidden()
        ->assertJsonPath('code', 'forbidden');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Confirmed);
})->with([
    '会員' => [fn () => User::factory()->create()],
    '管理者でもこのルートでは不可' => [fn () => User::factory()->admin()->create()],
]);

it('C2: 開始済み・キャンセル済みは 409', function (Closure $makeReservation) {
    $reservation = $makeReservation($this->user);

    $this->actingAs($this->user)
        ->postJson("/api/reservations/{$reservation->id}/cancel")
        ->assertConflict()
        ->assertJsonPath('code', 'reservation_not_cancellable');
})->with([
    '開始済み' => [fn (User $user) => Reservation::factory()->for($user)->on('2026-10-06', 14, 16)->create()],
    'キャンセル済み' => [fn (User $user) => Reservation::factory()->for($user)->cancelled()->on('2026-10-09', 10, 12)->create()],
]);

it('存在しない予約は 404', function () {
    $this->actingAs($this->user)
        ->postJson('/api/reservations/999/cancel')
        ->assertNotFound();
});

it('ログインしていなければ 401', function () {
    $reservation = Reservation::factory()->on('2026-10-09', 10, 12)->create();

    $this->postJson("/api/reservations/{$reservation->id}/cancel")->assertUnauthorized();
});
