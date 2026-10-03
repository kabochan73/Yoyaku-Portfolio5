<?php

declare(strict_types=1);

use App\Facility\Events\HolidayChanged;
use App\Facility\ReopenDay;
use App\Models\Holiday;
use App\Models\Reservation;
use App\Reservations\ReservationStatus;
use Illuminate\Support\Facades\Event;

it('臨時休業日を削除し、キャンセルした予約は戻さない', function () {
    Event::fake([HolidayChanged::class]);
    $holiday = Holiday::query()->create(['date' => '2026-10-09', 'reason' => '設備点検']);
    $cancelled = Reservation::factory()->phone()->cancelled()->on('2026-10-09', 10, 12)->create();

    app(ReopenDay::class)->handle($holiday);

    expect(Holiday::query()->count())->toBe(0)
        ->and($cancelled->fresh()->status)->toBe(ReservationStatus::Cancelled);
    Event::assertDispatched(HolidayChanged::class, fn ($event) => $event->date->toDateString() === '2026-10-09');
});
