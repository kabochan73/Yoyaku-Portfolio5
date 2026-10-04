<?php

declare(strict_types=1);

use App\Domain\Reservations\CancellationReason;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationConfirmedMail;
use App\Models\Reservation;
use App\Models\User;

function mailReservation(): Reservation
{
    $user = User::factory()->create(['name' => '山田太郎']);

    return Reservation::factory()->for($user)->on('2026-10-09', 10, 12)->create(['price' => 8000]);
}

describe('予約完了メール', function () {
    it('件名に施設名が入る', function () {
        (new ReservationConfirmedMail(mailReservation()))
            ->assertHasSubject('【FUTSAL PARK】ご予約を承りました');
    });

    it('本文に予約者名・日付（曜日付き）・時間・料金が入る', function () {
        (new ReservationConfirmedMail(mailReservation()))
            ->assertSeeInHtml('山田太郎 様')
            ->assertSeeInHtml('2026年10月9日（金）')
            ->assertSeeInHtml('10:00 〜 12:00（2時間）')
            ->assertSeeInHtml('¥8,000');
    });

    it('フッターに施設の連絡先が入る', function () {
        config(['facility.phone' => '000-1111-2222']);

        (new ReservationConfirmedMail(mailReservation()))
            ->assertSeeInHtml('TEL 000-1111-2222');
    });
});

describe('キャンセルのメール', function () {
    it('理由ごとに件名と書き出しが変わる', function (CancellationReason $reason, string $subject, string $opening) {
        (new ReservationCancelledMail(mailReservation(), $reason, '設備点検'))
            ->assertHasSubject($subject)
            ->assertSeeInHtml($opening);
    })->with([
        '会員が自分で' => [
            CancellationReason::ByMember,
            '【FUTSAL PARK】ご予約をキャンセルしました',
            '以下のご予約のキャンセルを承りました。',
        ],
        '管理者が' => [
            CancellationReason::ByAdmin,
            '【FUTSAL PARK】ご予約をキャンセルしました',
            '以下のご予約は、施設にてキャンセルいたしました。',
        ],
        '臨時休業日' => [
            CancellationReason::ByHoliday,
            '【FUTSAL PARK】施設都合によりご予約をキャンセルいたしました',
            '臨時休業のため、以下のご予約をキャンセルさせていただきました。',
        ],
    ]);

    it('本文に予約者名・日付・時間・料金が入る', function (CancellationReason $reason) {
        (new ReservationCancelledMail(mailReservation(), $reason))
            ->assertSeeInHtml('山田太郎 様')
            ->assertSeeInHtml('2026年10月9日（金）')
            ->assertSeeInHtml('10:00 〜 12:00（2時間）')
            ->assertSeeInHtml('¥8,000');
    })->with([
        '会員が自分で' => [CancellationReason::ByMember],
        '臨時休業日' => [CancellationReason::ByHoliday],
    ]);

    it('施設都合のメールには休業の理由が入り、理由が無ければ行を出さない', function () {
        $reservation = mailReservation();

        (new ReservationCancelledMail($reservation, CancellationReason::ByHoliday, '設備点検'))
            ->assertSeeInHtml('理由: 設備点検');

        (new ReservationCancelledMail($reservation, CancellationReason::ByHoliday))
            ->assertDontSeeInHtml('理由:');
    });
});
