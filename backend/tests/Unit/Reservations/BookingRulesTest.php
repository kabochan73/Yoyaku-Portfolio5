<?php

declare(strict_types=1);

use App\Domain\Reservations\BookingRules;
use App\Domain\Reservations\DayClosedReason;
use App\Domain\Reservations\TimeSlot;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

function bookingRules(): BookingRules
{
    return new BookingRules(openHour: 10, closeHour: 22, minHours: 2, maxHours: 4, bookingWindowMonths: 1);
}

/**
 * @return array<string, list<string>>
 */
function slotErrors(TimeSlot $slot, string $now): array
{
    try {
        bookingRules()->assertValidSlot($slot, CarbonImmutable::parse($now));
    } catch (ValidationException $e) {
        return $e->errors();
    }

    return [];
}

describe('B2: 利用時間は2〜4時間', function () {
    it('通る長さと通らない長さ', function (int $start, int $end, bool $valid) {
        $errors = slotErrors(TimeSlot::on('2026-10-10', $start, $end), '2026-10-06 09:00');

        expect(array_key_exists('end_hour', $errors))->toBe(! $valid);
    })->with([
        '1時間' => [10, 11, false],
        '2時間' => [10, 12, true],
        '4時間' => [10, 14, true],
        '5時間' => [10, 15, false],
    ]);

    it('メッセージに範囲が入る', function () {
        $errors = slotErrors(TimeSlot::on('2026-10-10', 10, 11), '2026-10-06 09:00');

        expect($errors['end_hour'])->toBe(['ご利用時間は2〜4時間で選んでください。']);
    });
});

describe('B3: 営業時間内', function () {
    it('通る時間帯と通らない時間帯', function (int $start, int $end, bool $valid) {
        $errors = slotErrors(TimeSlot::on('2026-10-10', $start, $end), '2026-10-06 09:00');

        expect(array_key_exists('start_hour', $errors))->toBe(! $valid);
    })->with([
        '9時開始' => [9, 11, false],
        '10時開始' => [10, 12, true],
        '22時終了' => [20, 22, true],
        '23時終了' => [21, 23, false],
    ]);

    it('メッセージに営業時間が入る', function () {
        $errors = slotErrors(TimeSlot::on('2026-10-10', 9, 11), '2026-10-06 09:00');

        expect($errors['start_hour'])->toBe(['営業時間（10:00〜22:00）内で選んでください。']);
    });
});

describe('B4: 予約できるのは1か月後の同日まで', function () {
    it('予約できる最終日', function (string $today, string $lastDay) {
        expect(bookingRules()->bookableUntil(CarbonImmutable::parse("{$today} 09:00"))->toDateString())
            ->toBe($lastDay);
    })->with([
        '10/6 → 11/6' => ['2026-10-06', '2026-11-06'],
        '1/31 → 2/28' => ['2027-01-31', '2027-02-28'],
        'うるう年の 1/31 → 2/29' => ['2028-01-31', '2028-02-29'],
    ]);

    it('最終日は予約でき、その翌日は予約できない', function () {
        expect(slotErrors(TimeSlot::on('2027-02-28', 10, 12), '2027-01-31 09:00'))->toBe([])
            ->and(slotErrors(TimeSlot::on('2027-03-01', 10, 12), '2027-01-31 09:00'))
            ->toBe(['date' => ['2月28日まで予約できます。']]);
    });

    it('過去の日は予約できない', function () {
        expect(slotErrors(TimeSlot::on('2026-10-05', 10, 12), '2026-10-06 09:00'))
            ->toBe(['date' => ['過去の日付は予約できません。']]);
    });
});

describe('B5: 開始時刻が今より後', function () {
    it('今日の過ぎた枠と、これからの枠', function (int $start, bool $valid) {
        $errors = slotErrors(TimeSlot::on('2026-10-06', $start, $start + 2), '2026-10-06 15:00');

        expect($errors === [])->toBe($valid);
    })->with([
        '14時開始' => [14, false],
        '15時開始（ちょうど）' => [15, false],
        '16時開始' => [16, true],
    ]);

    it('メッセージ', function () {
        expect(slotErrors(TimeSlot::on('2026-10-06', 14, 16), '2026-10-06 15:00'))
            ->toBe(['start_hour' => ['開始時刻を過ぎています。']]);
    });
});

it('違反はまとめて返る', function () {
    $errors = slotErrors(TimeSlot::on('2026-10-05', 9, 10), '2026-10-06 09:00');

    expect(array_keys($errors))->toEqualCanonicalizing(['start_hour', 'end_hour', 'date']);
});

it('日付だけで決まる受付外の理由', function (string $date, ?DayClosedReason $reason) {
    expect(bookingRules()->dateClosedReason(CarbonImmutable::parse($date), CarbonImmutable::parse('2026-10-06 09:00')))
        ->toBe($reason);
})->with([
    '昨日' => ['2026-10-05', DayClosedReason::Past],
    '今日' => ['2026-10-06', null],
    '最終日' => ['2026-11-06', null],
    '最終日の翌日' => ['2026-11-07', DayClosedReason::OutOfRange],
]);

it('TimeSlot は時間数と開始・終了の日時を返す', function () {
    $slot = TimeSlot::on('2026-10-10', 10, 12);

    expect($slot->hours())->toBe(2)
        ->and($slot->startsAt()->toDateTimeString())->toBe('2026-10-10 10:00:00')
        ->and($slot->endsAt()->toDateTimeString())->toBe('2026-10-10 12:00:00')
        ->and($slot->isWeekend())->toBeTrue();
});
