<?php

declare(strict_types=1);

use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * @param  array<string, mixed>  $overrides
 */
function insertReservationRow(array $overrides = []): void
{
    DB::table('reservations')->insert([
        'user_id' => null,
        'date' => '2026-10-10',
        'start_hour' => 10,
        'end_hour' => 12,
        'status' => 'confirmed',
        'booker_name' => '電話予約',
        'price' => 8000,
        'cancelled_at' => null,
        ...$overrides,
    ]);
}

describe('B7: 二重予約', function () {
    it('同じ日に時間帯が重なる確定済みの予約は作れない', function () {
        Reservation::factory()->phone()->on('2026-10-10', 10, 12)->create();

        expect(fn () => Reservation::factory()->phone()->on('2026-10-10', 11, 13)->create())
            ->toThrow(QueryException::class, 'reservations_no_overlap');
    });

    it('終わりと始まりがちょうど接する予約は作れる', function () {
        Reservation::factory()->phone()->on('2026-10-10', 10, 12)->create();
        Reservation::factory()->phone()->on('2026-10-10', 12, 14)->create();

        expect(Reservation::query()->count())->toBe(2);
    });

    it('別の日なら同じ時間帯でも作れる', function () {
        Reservation::factory()->phone()->on('2026-10-10', 10, 12)->create();
        Reservation::factory()->phone()->on('2026-10-11', 10, 12)->create();

        expect(Reservation::query()->count())->toBe(2);
    });

    it('キャンセル済みの予約とは重なってよい', function () {
        Reservation::factory()->phone()->cancelled()->on('2026-10-10', 10, 12)->create();
        Reservation::factory()->phone()->on('2026-10-10', 10, 12)->create();

        expect(Reservation::query()->count())->toBe(2);
    });
});

describe('B8: 会員は1日1件', function () {
    it('同じ会員が同じ日に確定済みの予約を2件は作れない', function () {
        $user = User::factory()->create();
        Reservation::factory()->for($user)->on('2026-10-10', 10, 12)->create();

        expect(fn () => Reservation::factory()->for($user)->on('2026-10-10', 14, 16)->create())
            ->toThrow(QueryException::class, 'reservations_user_date_confirmed_unique');
    });

    it('同じ日の予約をキャンセル済みにすれば、もう1件作れる', function () {
        $user = User::factory()->create();
        Reservation::factory()->for($user)->cancelled()->on('2026-10-10', 10, 12)->create();
        Reservation::factory()->for($user)->on('2026-10-10', 14, 16)->create();

        expect(Reservation::query()->where('user_id', $user->id)->count())->toBe(2);
    });

    it('電話予約は同じ日に何件でも作れる', function () {
        Reservation::factory()->phone()->on('2026-10-10', 10, 12)->create();
        Reservation::factory()->phone()->on('2026-10-10', 14, 16)->create();

        expect(Reservation::query()->whereNull('user_id')->count())->toBe(2);
    });
});

describe('CHECK 制約', function () {
    it('開始と終了が同じ予約は作れない', function () {
        expect(fn () => insertReservationRow(['start_hour' => 12, 'end_hour' => 12]))
            ->toThrow(QueryException::class, 'reservations_hours_check');
    });

    it('24時より後に終わる予約は作れない', function () {
        expect(fn () => insertReservationRow(['start_hour' => 23, 'end_hour' => 25]))
            ->toThrow(QueryException::class, 'reservations_hours_check');
    });

    it('金額が負の予約は作れない', function () {
        expect(fn () => insertReservationRow(['price' => -1]))
            ->toThrow(QueryException::class, 'reservations_price_check');
    });

    it('キャンセル済みなのにキャンセル日時が無い予約は作れない', function () {
        expect(fn () => insertReservationRow(['status' => 'cancelled']))
            ->toThrow(QueryException::class, 'reservations_cancelled_at_check');
    });

    it('確定済みなのにキャンセル日時がある予約は作れない', function () {
        expect(fn () => insertReservationRow(['cancelled_at' => now()]))
            ->toThrow(QueryException::class, 'reservations_cancelled_at_check');
    });

    it('知らない状態の予約は作れない', function () {
        expect(fn () => insertReservationRow(['status' => 'pending']))
            ->toThrow(QueryException::class, 'reservations_status_check');
    });
});

it('会員を削除しても予約は残り、会員との紐づけが外れる', function () {
    $reservation = Reservation::factory()->create();

    $reservation->user?->delete();

    expect($reservation->fresh())
        ->not->toBeNull()
        ->user_id->toBeNull();
});
