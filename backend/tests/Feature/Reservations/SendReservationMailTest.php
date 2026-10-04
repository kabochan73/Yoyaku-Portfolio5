<?php

declare(strict_types=1);

use App\Domain\Facility\CloseDay;
use App\Domain\Facility\PriceType;
use App\Domain\Reservations\CancellationReason;
use App\Domain\Reservations\CancelReservation;
use App\Domain\Reservations\CreateReservation;
use App\Domain\Reservations\Events\ReservationCancelled;
use App\Domain\Reservations\Events\ReservationCreated;
use App\Domain\Reservations\Listeners\SendReservationCancelledMail;
use App\Domain\Reservations\Listeners\SendReservationConfirmedMail;
use App\Domain\Reservations\TimeSlot;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationConfirmedMail;
use App\Models\Price;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Events\CallQueuedListener;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
    Mail::fake();
});

it('2つのイベントに登録されている', function (string $event, string $listener) {
    Event::fake();

    Event::assertListening($event, $listener);
})->with([
    [ReservationCreated::class, SendReservationConfirmedMail::class],
    [ReservationCancelled::class, SendReservationCancelledMail::class],
]);

it('会員の予約には予約完了メールを送る', function () {
    $user = User::factory()->create();

    $reservation = app(CreateReservation::class)->forMember($user, TimeSlot::on('2026-10-09', 10, 12));

    Mail::assertSent(
        ReservationConfirmedMail::class,
        fn (ReservationConfirmedMail $mail) => $mail->hasTo($user->email) && $mail->reservation->is($reservation),
    );
});

it('電話予約には送らない', function () {
    app(CreateReservation::class)->forPhone('佐藤（電話）', TimeSlot::on('2026-10-09', 10, 12));

    Mail::assertNothingSent();
});

it('キャンセルのメールを理由と補足つきで会員に送る', function (CancellationReason $reason, ?string $note) {
    $reservation = Reservation::factory()->on('2026-10-09', 10, 12)->create();

    app(CancelReservation::class)->handle($reservation, $reason, $note);

    Mail::assertSent(
        ReservationCancelledMail::class,
        fn (ReservationCancelledMail $mail) => $mail->hasTo($reservation->user?->email)
            && $mail->reason === $reason
            && $mail->note === $note,
    );
})->with([
    '会員が自分で' => [CancellationReason::ByMember, null],
    '管理者が' => [CancellationReason::ByAdmin, null],
    '臨時休業日' => [CancellationReason::ByHoliday, '設備点検'],
]);

it('電話予約のキャンセルには送らない', function () {
    $reservation = Reservation::factory()->phone()->on('2026-10-09', 10, 12)->create();

    app(CancelReservation::class)->handle($reservation, CancellationReason::ByAdmin);

    Mail::assertNothingSent();
});

it('メールの送信はキューに回す', function () {
    Queue::fake();

    app(CreateReservation::class)->forMember(User::factory()->create(), TimeSlot::on('2026-10-09', 10, 12));

    Queue::assertPushed(CallQueuedListener::class, fn (CallQueuedListener $job) => $job->class === SendReservationConfirmedMail::class);
    Mail::assertNothingSent();
});

it('途中で失敗してロールバックしたら、1通も送らない', function () {
    Reservation::factory()->count(2)->sequence(['start_hour' => 10, 'end_hour' => 12], ['start_hour' => 14, 'end_hour' => 16])
        ->create(['date' => '2026-10-09']);
    $calls = 0;
    Event::listen(ReservationCancelled::class, function () use (&$calls) {
        if (++$calls === 2) {
            throw new RuntimeException('2件目で失敗');
        }
    });

    expect(fn () => app(CloseDay::class)->handle(CarbonImmutable::parse('2026-10-09'), null, true))
        ->toThrow(RuntimeException::class);

    Mail::assertNothingSent();
});
