<?php

declare(strict_types=1);

use App\Domain\ConflictException;
use App\Models\Reservation;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Route::middleware('api')->prefix('api/test-only')->group(function () {
        Route::get('/validation', fn () => throw ValidationException::withMessages(['start_hour' => '営業時間内で選んでください。']));
        Route::get('/conflict', fn () => throw ConflictException::holidayHasReservations(2));
        Route::get('/unauthenticated', fn () => throw new AuthenticationException);
        Route::get('/forbidden', fn () => throw new AuthorizationException);
        Route::get('/not-found', fn () => Reservation::query()->findOrFail(999));
        Route::get('/csrf', fn () => throw new TokenMismatchException);
        Route::get('/throttled', fn () => throw new ThrottleRequestsException(headers: ['Retry-After' => 30]));
        Route::get('/server-error', fn () => throw new RuntimeException('秘密の中身'));
    });
});

it('例外ごとに決まった形で返す', function (string $path, int $status, string $code, string $message) {
    $this->getJson("/api/test-only/{$path}")
        ->assertStatus($status)
        ->assertJson(['message' => $message, 'code' => $code]);
})->with([
    '422' => ['validation', 422, 'validation_failed', '入力内容を確認してください。'],
    '409' => ['conflict', 409, 'holiday_has_reservations', 'この日には2件の予約があります。すべてキャンセルして休業日にしますか？'],
    '401' => ['unauthenticated', 401, 'unauthenticated', 'ログインしてください。'],
    '403' => ['forbidden', 403, 'forbidden', 'この操作は許可されていません。'],
    '404' => ['not-found', 404, 'not_found', 'お探しのデータが見つかりませんでした。'],
    '419' => ['csrf', 419, 'csrf_token_mismatch', 'ページの有効期限が切れました。もう一度お試しください。'],
    '429' => ['throttled', 429, 'too_many_requests', '試行回数が多すぎます。しばらくしてからお試しください。'],
    '500' => ['server-error', 500, 'server_error', 'サーバーでエラーが発生しました。'],
]);

it('422 は項目ごとのエラーを返す', function () {
    $this->getJson('/api/test-only/validation')
        ->assertExactJson([
            'message' => '入力内容を確認してください。',
            'code' => 'validation_failed',
            'errors' => ['start_hour' => ['営業時間内で選んでください。']],
        ]);
});

it('409 は場面ごとの追加情報を返す', function () {
    $this->getJson('/api/test-only/conflict')
        ->assertJsonPath('reservation_count', 2);
});

it('429 は再試行までの秒数のヘッダーを残す', function () {
    $this->getJson('/api/test-only/throttled')
        ->assertHeader('Retry-After', '30');
});

it('500 は開発中でも中身を返さない', function () {
    config(['app.debug' => true]);

    $this->getJson('/api/test-only/server-error')
        ->assertExactJson(['message' => 'サーバーでエラーが発生しました。', 'code' => 'server_error']);
});

it('/api 以外は Laravel の標準のまま', function () {
    Route::get('/test-only/not-api', fn () => throw new RuntimeException('秘密の中身'));

    $this->getJson('/test-only/not-api')
        ->assertStatus(500)
        ->assertJsonMissingPath('code');
});
