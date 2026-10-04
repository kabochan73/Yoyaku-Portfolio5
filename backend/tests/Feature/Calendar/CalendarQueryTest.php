<?php

declare(strict_types=1);

use App\Domain\Calendar\CalendarDay;
use App\Domain\Calendar\CalendarQuery;
use App\Domain\Calendar\CalendarSlot;
use App\Domain\Reservations\DayClosedReason;
use App\Models\Holiday;
use App\Models\RegularHoliday;
use App\Models\Reservation;
use Carbon\CarbonImmutable;

beforeEach(function () {
    RegularHoliday::query()->create(['day_of_week' => 1]);
    Holiday::query()->create(['date' => '2026-10-08', 'reason' => '設備点検']);
});

function publicDay(string $date, string $now = '2026-10-06 15:00'): CalendarDay
{
    $days = app(CalendarQuery::class)->forPublic(
        CarbonImmutable::parse($date),
        CarbonImmutable::parse($date),
        CarbonImmutable::parse($now),
    );

    return $days[0];
}

/**
 * @return array<int, string>
 */
function slotStatuses(CalendarDay $day): array
{
    $statuses = [];
    foreach ($day->slots as $slot) {
        $statuses[$slot->hour] = $slot->status->value;
    }

    return $statuses;
}

it('営業日は10〜21時の12枠で、予約がある枠は予約済になる', function () {
    Reservation::factory()->phone()->on('2026-10-09', 12, 14)->create();

    $day = publicDay('2026-10-09');

    expect($day->closedReason)->toBeNull()
        ->and(array_keys(slotStatuses($day)))->toBe(range(10, 21))
        ->and(slotStatuses($day))->toMatchArray([11 => 'available', 12 => 'booked', 13 => 'booked', 14 => 'available']);
});

it('B5: 今日の過ぎた時間の枠は受付外になる', function () {
    Reservation::factory()->phone()->on('2026-10-06', 10, 12)->create();

    expect(slotStatuses(publicDay('2026-10-06')))->toMatchArray([
        10 => 'booked',
        12 => 'past',
        14 => 'past',
        15 => 'past',
        16 => 'available',
    ]);
});

it('受付外の日は枠を返さない', function (string $date, DayClosedReason $reason) {
    $day = publicDay($date);

    expect($day->closedReason)->toBe($reason)
        ->and($day->slots)->toBe([]);
})->with([
    '過去の日' => ['2026-10-05', DayClosedReason::Past],
    'B4: 予約できる最終日の翌日' => ['2026-11-07', DayClosedReason::OutOfRange],
    'B6: 定休日' => ['2026-10-12', DayClosedReason::RegularHoliday],
    'B6: 臨時休業日' => ['2026-10-08', DayClosedReason::Holiday],
]);

it('定休日と臨時休業日が重なる日は定休日', function () {
    Holiday::query()->create(['date' => '2026-10-12']);

    expect(publicDay('2026-10-12')->closedReason)->toBe(DayClosedReason::RegularHoliday);
});

it('定休日に残った予約は公開用には出ない', function () {
    Reservation::factory()->phone()->on('2026-10-12', 10, 12)->create();

    expect(publicDay('2026-10-12')->slots)->toBe([]);
});

it('1週間分を日付の順に返す', function () {
    $days = app(CalendarQuery::class)->forPublic(
        CarbonImmutable::parse('2026-10-05'),
        CarbonImmutable::parse('2026-10-11'),
        CarbonImmutable::parse('2026-10-06 15:00'),
    );

    expect(array_map(fn (CalendarDay $day) => $day->date->toDateString(), $days))
        ->toBe(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'])
        ->and($days[3]->slots)->toBe([])
        ->and($days[4]->slots[0])->toBeInstanceOf(CalendarSlot::class);
});
