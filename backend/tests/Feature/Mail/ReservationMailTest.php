<?php

declare(strict_types=1);

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
