<?php

declare(strict_types=1);

use App\Exceptions\ConflictException;
use App\Models\Reservation;
use App\Reservations\CancellationReason;
use App\Reservations\CancelReservation;
use App\Reservations\Events\ReservationCancelled;
use App\Reservations\ReservationStatus;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));
    Event::fake([ReservationCancelled::class]);
});

function cancelReservation(Reservation $reservation, ?string $note = null): Reservation
{
    return app(CancelReservation::class)->handle($reservation, CancellationReason::ByMember, $note);
}

it('C2・C3: 確定済みで開始前の予約をキャンセルし、理由つきでイベントを発行する', function () {
    $reservation = Reservation::factory()->on('2026-10-09', 10, 12)->create();

    $cancelled = cancelReservation($reservation);

    expect($cancelled->fresh())
        ->status->toBe(ReservationStatus::Cancelled)
        ->and($cancelled->fresh()->cancelled_at?->toDateTimeString())->toBe('2026-10-06 09:00:00');
    Event::assertDispatched(
        ReservationCancelled::class,
        fn ($event) => $event->reservation->is($reservation) && $event->reason === CancellationReason::ByMember,
    );
});

it('C4: 当日でも開始前ならキャンセルできる', function () {
    $reservation = Reservation::factory()->on('2026-10-06', 10, 12)->create();

    expect(cancelReservation($reservation)->status)->toBe(ReservationStatus::Cancelled);
});

it('C2: キャンセルできない予約は reservation_not_cancellable', function (Reservation $reservation) {
    expect(fn () => cancelReservation($reservation))
        ->toThrow(fn (ConflictException $e) => expect($e->errorCode)->toBe('reservation_not_cancellable'));
    Event::assertNotDispatched(ReservationCancelled::class);
})->with([
    'キャンセル済み' => fn () => Reservation::factory()->cancelled()->on('2026-10-09', 10, 12)->create(),
    '開始済み' => fn () => Reservation::factory()->on('2026-10-06', 8, 10)->create(),
]);

it('渡された予約が古くても、DB を読み直して判定する', function () {
    $reservation = Reservation::factory()->on('2026-10-09', 10, 12)->create();
    Reservation::query()->whereKey($reservation->id)->update(['status' => 'cancelled', 'cancelled_at' => now()]);

    expect($reservation->status)->toBe(ReservationStatus::Confirmed)
        ->and(fn () => cancelReservation($reservation))
        ->toThrow(ConflictException::class);
    Event::assertNotDispatched(ReservationCancelled::class);
});

it('補足をイベントに入れる', function () {
    $reservation = Reservation::factory()->on('2026-10-09', 10, 12)->create();

    app(CancelReservation::class)->handle($reservation, CancellationReason::ByHoliday, '設備点検');

    Event::assertDispatched(
        ReservationCancelled::class,
        fn ($event) => $event->reason === CancellationReason::ByHoliday && $event->note === '設備点検',
    );
});
