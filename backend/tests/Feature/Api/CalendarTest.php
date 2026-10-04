<?php

declare(strict_types=1);

use App\Domain\Facility\PriceType;
use App\Domain\Reservations\CreateReservation;
use App\Domain\Reservations\TimeSlot;
use App\Models\Price;
use App\Models\RegularHoliday;
use App\Models\Reservation;

beforeEach(function () {
    $this->travelTo(new DateTimeImmutable('2026-10-06 15:00'));
    RegularHoliday::query()->create(['day_of_week' => 1]);
});

it('ログインしていなくても、期間の空き状況を返す', function () {
    Reservation::factory()->phone()->on('2026-10-07', 10, 12)->create();

    $response = $this->getJson('/api/calendar?from=2026-10-05&to=2026-10-11')
        ->assertOk()
        ->assertJsonPath('meta', ['today' => '2026-10-06', 'bookable_until' => '2026-11-06'])
        ->assertJsonCount(7, 'data')
        ->assertJsonPath('data.0', ['date' => '2026-10-05', 'closed_reason' => 'past', 'slots' => []]);

    expect($response->json('data.2.date'))->toBe('2026-10-07')
        ->and($response->json('data.2.closed_reason'))->toBeNull()
        ->and($response->json('data.2.slots.0'))->toBe(['hour' => 10, 'status' => 'booked'])
        ->and($response->json('data.2.slots.2'))->toBe(['hour' => 12, 'status' => 'available']);
});

it('定休日は理由を返し、枠を返さない', function () {
    $this->getJson('/api/calendar?from=2026-10-12&to=2026-10-12')
        ->assertJsonPath('data.0.closed_reason', 'regular_holiday')
        ->assertJsonPath('data.0.slots', []);
});

it('期間が正しくなければ 422', function (string $query, string $field) {
    $this->getJson("/api/calendar?{$query}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'from が無い' => ['to=2026-10-11', 'from'],
    '形式が違う' => ['from=10/5&to=2026-10-11', 'from'],
    'to が from より前' => ['from=2026-10-11&to=2026-10-05', 'to'],
    '15日以上' => ['from=2026-10-05&to=2026-10-19', 'to'],
]);

it('14日ちょうどは返す', function () {
    $this->getJson('/api/calendar?from=2026-10-05&to=2026-10-18')
        ->assertOk()
        ->assertJsonCount(14, 'data');
});

it('15日以上のメッセージ', function () {
    $this->getJson('/api/calendar?from=2026-10-05&to=2026-10-19')
        ->assertJsonPath('errors.to', ['期間は14日以内で指定してください。']);
});

it('中身が変わっていなければ 304 を返し、変われば新しい中身を返す', function () {
    $url = '/api/calendar?from=2026-10-05&to=2026-10-11';
    $etag = $this->getJson($url)->assertOk()->headers->get('ETag');

    expect($etag)->not->toBeNull();
    $this->getJson($url, ['If-None-Match' => $etag])->assertNotModified();

    Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
    Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
    app(CreateReservation::class)->forPhone('佐藤（電話）', TimeSlot::on('2026-10-07', 10, 12));

    $this->getJson($url, ['If-None-Match' => $etag])
        ->assertOk()
        ->assertJsonPath('data.2.slots.0.status', 'booked');
});

it('途中のキャッシュには保存させず、ブラウザには毎回確かめさせる', function () {
    $cacheControl = $this->getJson('/api/calendar?from=2026-10-05&to=2026-10-11')->headers->get('Cache-Control');

    expect($cacheControl)->toContain('private')->toContain('no-cache');
});
