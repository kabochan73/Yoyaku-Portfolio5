<?php

declare(strict_types=1);

use App\Calendar\AdminCalendarDay;
use App\Calendar\CalendarQuery;
use App\Models\RegularHoliday;
use App\Models\Reservation;
use App\Reservations\DayClosedReason;
use App\Reservations\ReservationStatus;
use Carbon\CarbonImmutable;

beforeEach(function () {
    RegularHoliday::query()->create(['day_of_week' => 1]);
});

function adminDay(string $date): AdminCalendarDay
{
    $days = app(CalendarQuery::class)->forAdmin(
        CarbonImmutable::parse($date),
        CarbonImmutable::parse($date),
        CarbonImmutable::parse('2026-10-06 15:00'),
    );

    return $days[0];
}

it('予約済の枠に予約の番号が付き、その日の予約の一覧が入る', function () {
    $reservation = Reservation::factory()->on('2026-10-09', 12, 14)->create(['price' => 8000]);

    $day = adminDay('2026-10-09');
    $slot = $day->slots[2];

    expect($slot->hour)->toBe(12)
        ->and($slot->status->value)->toBe('booked')
        ->and($slot->reservationId)->toBe($reservation->id)
        ->and($day->slots[0]->reservationId)->toBeNull()
        ->and($day->reservations)->toHaveCount(1);

    $listed = $day->reservations[0];
    expect($listed->id)->toBe($reservation->id)
        ->and($listed->booker_name)->toBe($reservation->booker_name)
        ->and($listed->user_id)->toBe($reservation->user_id)
        ->and($listed->price)->toBe(8000)
        ->and($listed->status)->toBe(ReservationStatus::Confirmed)
        ->and($listed->isCancellable(CarbonImmutable::parse('2026-10-06 15:00')))->toBeTrue();
});

it('定休日に残った予約は予約済、ほかの枠は受付外', function () {
    Reservation::factory()->phone()->on('2026-10-12', 10, 12)->create();

    $day = adminDay('2026-10-12');

    expect($day->closedReason)->toBe(DayClosedReason::RegularHoliday)
        ->and($day->slots)->toHaveCount(12)
        ->and($day->slots[0]->status->value)->toBe('booked')
        ->and($day->slots[1]->status->value)->toBe('booked')
        ->and($day->slots[2]->status->value)->toBe('closed')
        ->and($day->reservations)->toHaveCount(1);
});

it('3か月より前の日は枠も予約も返さない', function () {
    $day = adminDay('2026-07-05');

    expect($day->slots)->toBe([])
        ->and($day->reservations)->toBe([]);
});

it('3か月前ちょうどの日は返す', function () {
    $day = adminDay('2026-07-06');

    expect($day->closedReason)->toBe(DayClosedReason::Past)
        ->and($day->slots)->toHaveCount(12);
});
