<?php

declare(strict_types=1);

use App\Domain\Reservations\CancellationReason;
use App\Domain\Reservations\ReservationStatus;
use App\Mail\ReservationCancelledMail;
use App\Models\Holiday;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    $this->withHeader('Referer', 'http://localhost:3000/');
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));
    $this->admin = User::factory()->admin()->create();
    Mail::fake();
});

describe('GET /admin/holidays', function () {
    it('今日以降の休業日を日付の順に返す', function () {
        Holiday::query()->create(['date' => '2026-10-05', 'reason' => '昨日']);
        $later = Holiday::query()->create(['date' => '2026-10-20', 'reason' => null]);
        $today = Holiday::query()->create(['date' => '2026-10-06', 'reason' => '設備点検']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/holidays')
            ->assertOk()
            ->assertExactJson(['data' => [
                ['id' => $today->id, 'date' => '2026-10-06', 'reason' => '設備点検'],
                ['id' => $later->id, 'date' => '2026-10-20', 'reason' => null],
            ]]);
    });
});

describe('POST /admin/holidays', function () {
    it('予約が無い日を休業日にする', function () {
        $this->actingAs($this->admin)
            ->postJson('/api/admin/holidays', ['date' => '2026-10-10', 'reason' => '設備点検'])
            ->assertCreated()
            ->assertJsonPath('data.date', '2026-10-10')
            ->assertJsonPath('data.reason', '設備点検');
    });

    it('予約があり、確認が無ければ件数を返して休業日にしない', function () {
        Reservation::factory()->count(2)->sequence(['start_hour' => 10, 'end_hour' => 12], ['start_hour' => 14, 'end_hour' => 16])
            ->create(['date' => '2026-10-10']);

        $this->actingAs($this->admin)
            ->postJson('/api/admin/holidays', ['date' => '2026-10-10', 'reason' => '設備点検'])
            ->assertConflict()
            ->assertExactJson([
                'message' => 'この日には2件の予約があります。すべてキャンセルして休業日にしますか？',
                'code' => 'holiday_has_reservations',
                'reservation_count' => 2,
            ]);

        expect(Holiday::query()->count())->toBe(0);
    });

    it('確認があれば、予約をキャンセルして休業日にし、会員に施設都合のメールを送る', function () {
        $reservation = Reservation::factory()->on('2026-10-10', 10, 12)->create();

        $this->actingAs($this->admin)
            ->postJson('/api/admin/holidays', ['date' => '2026-10-10', 'reason' => '設備点検', 'cancel_reservations' => true])
            ->assertCreated();

        expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
        Mail::assertSent(
            ReservationCancelledMail::class,
            fn (ReservationCancelledMail $mail) => $mail->reason === CancellationReason::ByHoliday && $mail->note === '設備点検',
        );
    });

    it('同じ日はもう一度登録できない', function () {
        Holiday::query()->create(['date' => '2026-10-10']);

        $this->actingAs($this->admin)
            ->postJson('/api/admin/holidays', ['date' => '2026-10-10'])
            ->assertConflict()
            ->assertJsonPath('code', 'holiday_already_exists');
    });

    it('入力が正しくなければ 422', function (array $input, string $field, string $message) {
        $this->actingAs($this->admin)
            ->postJson('/api/admin/holidays', $input)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$field => $message]);
    })->with([
        '昨日' => [['date' => '2026-10-05'], 'date', '日付は今日以降を選んでください。'],
        '理由が256文字' => [['date' => '2026-10-10', 'reason' => str_repeat('あ', 256)], 'reason', '理由は255文字以内で入力してください。'],
    ]);
});

describe('DELETE /admin/holidays/{holiday}', function () {
    it('休業日を削除する', function () {
        $holiday = Holiday::query()->create(['date' => '2026-10-10']);

        $this->actingAs($this->admin)
            ->deleteJson("/api/admin/holidays/{$holiday->id}")
            ->assertNoContent();

        expect(Holiday::query()->count())->toBe(0);
    });

    it('存在しない休業日は 404', function () {
        $this->actingAs($this->admin)
            ->deleteJson('/api/admin/holidays/999')
            ->assertNotFound();
    });
});

it('会員は 403', function (string $method, string $url) {
    $this->actingAs(User::factory()->create())
        ->json($method, $url, ['date' => '2026-10-10'])
        ->assertForbidden();
})->with([
    '一覧' => ['GET', '/api/admin/holidays'],
    '登録' => ['POST', '/api/admin/holidays'],
]);
