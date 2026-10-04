<?php

declare(strict_types=1);

use App\Domain\Reservations\CancellationReason;
use App\Domain\Reservations\ReservationStatus;
use App\Mail\ReservationCancelledMail;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));
    $this->admin = User::factory()->admin()->create();
    Mail::fake();
});

it('会員の予約をキャンセルし、管理者による理由でメールを送る', function () {
    $reservation = Reservation::factory()->on('2026-10-09', 10, 12)->create();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/reservations/{$reservation->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
    Mail::assertSent(
        ReservationCancelledMail::class,
        fn (ReservationCancelledMail $mail) => $mail->reason === CancellationReason::ByAdmin
            && $mail->hasTo($reservation->user?->email),
    );
});

it('電話予約もキャンセルでき、メールは送らない', function () {
    $reservation = Reservation::factory()->phone()->on('2026-10-09', 10, 12)->create();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/reservations/{$reservation->id}/cancel")
        ->assertOk();

    Mail::assertNothingSent();
});

it('開始済みは 409', function () {
    $reservation = Reservation::factory()->on('2026-10-06', 8, 10)->create();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/reservations/{$reservation->id}/cancel")
        ->assertConflict()
        ->assertJsonPath('code', 'reservation_not_cancellable');
});

it('会員は 403', function () {
    $member = User::factory()->create();
    $reservation = Reservation::factory()->for($member)->on('2026-10-09', 10, 12)->create();

    $this->actingAs($member)
        ->postJson("/api/admin/reservations/{$reservation->id}/cancel")
        ->assertForbidden();
});
