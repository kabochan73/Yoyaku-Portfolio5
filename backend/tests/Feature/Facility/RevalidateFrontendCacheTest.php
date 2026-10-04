<?php

declare(strict_types=1);

use App\Domain\Facility\Events\FacilityChanged;
use App\Domain\Facility\Listeners\RevalidateFrontendCache;
use App\Domain\Facility\PriceType;
use App\Domain\Facility\UpdatePrices;
use App\Domain\Facility\UpdateRegularHolidays;
use App\Domain\Reservations\CreateReservation;
use App\Domain\Reservations\TimeSlot;
use App\Models\Price;
use App\Models\User;
use Illuminate\Events\CallQueuedListener;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    config([
        'services.frontend.internal_url' => 'http://frontend.test',
        'services.frontend.revalidate_secret' => 'test-secret',
    ]);
    Http::fake(['frontend.test/*' => Http::response(['revalidated' => true])]);
});

it('FacilityChanged に登録されている', function () {
    Event::fake();

    Event::assertListening(FacilityChanged::class, RevalidateFrontendCache::class);
});

it('料金・定休日を変えると、合言葉つきでフロントの受け口を呼ぶ', function (Closure $change) {
    $change();

    Http::assertSent(fn (Request $request) => $request->method() === 'POST'
        && $request->url() === 'http://frontend.test/internal/revalidate'
        && $request->hasHeader('Authorization', 'Bearer test-secret'));
})->with([
    '料金' => fn () => app(UpdatePrices::class)->handle(4500, 5500),
    '定休日' => fn () => app(UpdateRegularHolidays::class)->handle([3]),
]);

it('その場では呼ばず、キューに回す', function () {
    Queue::fake();

    app(UpdatePrices::class)->handle(4500, 5500);

    Queue::assertPushed(CallQueuedListener::class, fn (CallQueuedListener $job) => $job->class === RevalidateFrontendCache::class);
    Http::assertNothingSent();
});

it('予約を作っても呼ばない', function () {
    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
    $this->travelTo(new DateTimeImmutable('2026-10-06 09:00'));

    app(CreateReservation::class)->forMember(User::factory()->create(), TimeSlot::on('2026-10-09', 10, 12));

    Http::assertNothingSent();
});

it('相手がエラーを返したら例外を投げて、キューにやり直させる', function () {
    config(['services.frontend.internal_url' => 'http://broken.test']);
    Http::fake(['broken.test/*' => Http::response(status: 500)]);

    expect(fn () => (new RevalidateFrontendCache)->handle(new FacilityChanged))
        ->toThrow(RequestException::class);
});

it('呼び先か合言葉が未設定なら何もしない', function (string $key) {
    config(["services.frontend.{$key}" => null]);

    (new RevalidateFrontendCache)->handle(new FacilityChanged);

    Http::assertNothingSent();
})->with(['internal_url', 'revalidate_secret']);
