<?php

declare(strict_types=1);

use App\Calendar\DayFacts;

function dayFacts(): DayFacts
{
    return new DayFacts(
        reservations: [
            ['id' => 41, 'start_hour' => 10, 'end_hour' => 12, 'booker_name' => '山田太郎', 'user_id' => 5, 'price' => 8000],
        ],
        isHoliday: false,
        holidayReason: null,
    );
}

it('その時間に入っている予約を返す', function (int $hour, ?int $reservationId) {
    expect(dayFacts()->reservationAt($hour)['id'] ?? null)->toBe($reservationId)
        ->and(dayFacts()->isBooked($hour))->toBe($reservationId !== null);
})->with([
    '9時' => [9, null],
    '10時（開始）' => [10, 41],
    '11時' => [11, 41],
    '12時（終了）' => [12, null],
]);

it('配列にして戻すと同じ中身になる', function () {
    $facts = new DayFacts(reservations: [], isHoliday: true, holidayReason: '設備点検');

    expect(DayFacts::fromArray($facts->toArray()))->toEqual($facts)
        ->and(DayFacts::fromArray(dayFacts()->toArray()))->toEqual(dayFacts());
});
