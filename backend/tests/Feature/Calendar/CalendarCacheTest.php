<?php

declare(strict_types=1);

use App\Calendar\CalendarCache;
use App\Models\Holiday;
use App\Models\RegularHoliday;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RedisStore;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

function cacheDays(string $from, string $to): array
{
    return app(CalendarCache::class)->days(CarbonImmutable::parse($from), CarbonImmutable::parse($to));
}

it('DB から確定済みの予約と臨時休業日を読む', function () {
    $reservation = Reservation::factory()->phone()->on('2026-10-06', 10, 12)->create(['price' => 8000]);
    Reservation::factory()->phone()->cancelled()->on('2026-10-06', 14, 16)->create();
    Holiday::query()->create(['date' => '2026-10-07', 'reason' => '設備点検']);

    $days = cacheDays('2026-10-06', '2026-10-08');

    expect(array_keys($days))->toBe(['2026-10-06', '2026-10-07', '2026-10-08'])
        ->and($days['2026-10-06']->reservations)->toBe([[
            'id' => $reservation->id,
            'start_hour' => 10,
            'end_hour' => 12,
            'booker_name' => '電話予約',
            'user_id' => null,
            'price' => 8000,
        ]])
        ->and($days['2026-10-06']->isHoliday)->toBeFalse()
        ->and($days['2026-10-07']->isHoliday)->toBeTrue()
        ->and($days['2026-10-07']->holidayReason)->toBe('設備点検');
});

it('2回目は DB を見ない', function () {
    Reservation::factory()->phone()->on('2026-10-06', 10, 12)->create();
    cacheDays('2026-10-06', '2026-10-12');

    DB::enableQueryLog();
    cacheDays('2026-10-06', '2026-10-12');

    expect(DB::getQueryLog())->toBe([]);
});

it('キャッシュに無い日だけ DB から読む', function () {
    cacheDays('2026-10-06', '2026-10-06');
    Reservation::factory()->phone()->on('2026-10-06', 10, 12)->create();
    Reservation::factory()->phone()->on('2026-10-07', 10, 12)->create();

    $days = cacheDays('2026-10-06', '2026-10-07');

    expect($days['2026-10-06']->reservations)->toBe([])
        ->and($days['2026-10-07']->reservations)->toHaveCount(1);
});

it('消した日だけ読み直す', function () {
    cacheDays('2026-10-06', '2026-10-07');
    Reservation::factory()->phone()->on('2026-10-06', 10, 12)->create();
    Reservation::factory()->phone()->on('2026-10-07', 10, 12)->create();

    app(CalendarCache::class)->forgetDay(CarbonImmutable::parse('2026-10-06'));
    $days = cacheDays('2026-10-06', '2026-10-07');

    expect($days['2026-10-06']->reservations)->toHaveCount(1)
        ->and($days['2026-10-07']->reservations)->toBe([]);
});

it('保存したキャッシュは60秒で期限が切れる', function () {
    cacheDays('2026-10-06', '2026-10-06');

    /** @var RedisStore $store */
    $store = Cache::getStore();
    $ttl = $store->connection()->ttl($store->getPrefix().'calendar:day:2026-10-06');

    expect($ttl)->toBeGreaterThan(0)->toBeLessThanOrEqual(60);
});

it('定休日の一覧はキャッシュされ、消すと読み直す', function () {
    $cache = app(CalendarCache::class);
    RegularHoliday::query()->create(['day_of_week' => 1]);
    expect($cache->regularHolidays())->toBe([1]);

    RegularHoliday::query()->create(['day_of_week' => 3]);
    expect($cache->regularHolidays())->toBe([1]);

    $cache->forgetRegularHolidays();
    expect($cache->regularHolidays())->toBe([1, 3]);
});
