<?php

declare(strict_types=1);

use App\Models\Reservation;
use App\Models\User;
use App\Reservations\ReservationPhase;
use App\Reservations\ReservationStatus;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

it('今の時刻から見た段階', function (string $now, ReservationPhase $phase) {
    $reservation = Reservation::factory()->on('2026-10-10', 12, 14)->make();

    expect($reservation->phase(CarbonImmutable::parse($now)))->toBe($phase);
})->with([
    '開始の1分前' => ['2026-10-10 11:59', ReservationPhase::BeforeStart],
    '開始ちょうど' => ['2026-10-10 12:00', ReservationPhase::InUse],
    '終了の1分前' => ['2026-10-10 13:59', ReservationPhase::InUse],
    '終了ちょうど' => ['2026-10-10 14:00', ReservationPhase::Finished],
]);

it('C2: キャンセルできるのは確定済みで開始前の予約だけ', function (bool $cancelled, string $now, bool $cancellable) {
    $factory = Reservation::factory()->on('2026-10-10', 12, 14);
    $reservation = ($cancelled ? $factory->cancelled() : $factory)->make();

    expect($reservation->isCancellable(CarbonImmutable::parse($now)))->toBe($cancellable);
})->with([
    '確定済み・開始前' => [false, '2026-10-10 11:59', true],
    '確定済み・開始済み' => [false, '2026-10-10 12:00', false],
    'キャンセル済み・開始前' => [true, '2026-10-10 11:59', false],
]);

it('C3: キャンセルすると状態とキャンセル日時が入り、行は残る', function () {
    $reservation = Reservation::factory()->create();
    $now = CarbonImmutable::parse('2026-10-06 09:30');

    $reservation->cancel($now);

    $saved = $reservation->fresh();
    expect($saved->status)->toBe(ReservationStatus::Cancelled)
        ->and($saved->cancelled_at?->toDateTimeString())->toBe('2026-10-06 09:30:00');
});

it('今後の予約は、今日以降の確定済みを日付と開始時刻の順に返す', function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 15:00'));
    $user = User::factory()->create();
    Reservation::factory()->for($user)->on('2026-10-05', 10, 12)->create();
    Reservation::factory()->for($user)->on('2026-10-08', 18, 20)->create();
    Reservation::factory()->for($user)->on('2026-10-06', 10, 12)->create();
    Reservation::factory()->for($user)->cancelled()->on('2026-10-07', 10, 12)->create();

    $dates = $user->reservations()->upcoming()->get()->map(fn (Reservation $r) => $r->date->toDateString());

    expect($dates->all())->toBe(['2026-10-06', '2026-10-08']);
});

it('期間と確定済みで絞り込める', function () {
    Reservation::factory()->phone()->on('2026-10-05', 10, 12)->create();
    Reservation::factory()->phone()->on('2026-10-06', 10, 12)->create();
    Reservation::factory()->phone()->cancelled()->on('2026-10-07', 10, 12)->create();
    Reservation::factory()->phone()->on('2026-10-08', 10, 12)->create();

    $count = Reservation::query()
        ->confirmed()
        ->between(CarbonImmutable::parse('2026-10-06'), CarbonImmutable::parse('2026-10-07'))
        ->count();

    expect($count)->toBe(1);
});

it('3か月より前の予約は毎日の削除で消える', function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 03:00'));
    Reservation::factory()->phone()->on('2026-07-05', 10, 12)->create();
    $kept = Reservation::factory()->phone()->on('2026-07-06', 10, 12)->create();

    $this->artisan('model:prune', ['--model' => Reservation::class])->assertSuccessful();

    expect(Reservation::query()->pluck('id')->all())->toBe([$kept->id]);
});

it('古い予約の削除は毎日のスケジュールに入っている', function () {
    $this->artisan('schedule:list')
        ->expectsOutputToContain('model:prune')
        ->assertSuccessful();
});

it('日付のロックはトランザクションの中で取れる', function () {
    $locks = DB::transaction(function () {
        Reservation::lockDate(CarbonImmutable::parse('2026-10-10'));

        return DB::scalar("SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid()");
    });

    expect($locks)->toBe(1);
});
