<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Reservation;
use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Database\Seeders\InitialDataSeeder;

beforeEach(function () {
    config([
        'facility.admin.email' => 'admin@example.com',
        'facility.admin.password' => 'secret-password',
    ]);
    $this->travelTo(new DateTimeImmutable('2026-10-05 09:00'));
    $this->seed(InitialDataSeeder::class);
});

it('デモ会員3人と、明日から14日分の予約を作る', function () {
    $this->seed(DemoDataSeeder::class);

    $dates = Reservation::query()->pluck('date');

    expect(User::query()->where('role', UserRole::User)->count())->toBe(3)
        ->and(Reservation::query()->count())->toBeGreaterThan(0)
        ->and($dates->min()->toDateString())->toBeGreaterThanOrEqual('2026-10-06')
        ->and($dates->max()->toDateString())->toBeLessThanOrEqual('2026-10-19');
});

it('定休日には予約を入れない', function () {
    $this->seed(DemoDataSeeder::class);

    $mondays = Reservation::query()->get()->filter(fn (Reservation $reservation) => $reservation->date->isMonday());

    expect($mondays)->toBeEmpty();
});

it('料金はその日の単価 × 時間数', function () {
    $this->seed(DemoDataSeeder::class);

    Reservation::query()->get()->each(function (Reservation $reservation) {
        $unitPrice = $reservation->date->isWeekend() ? 5000 : 4000;

        expect($reservation->price)->toBe($unitPrice * ($reservation->end_hour - $reservation->start_hour));
    });
});

it('2回流しても増えない', function () {
    $this->seed(DemoDataSeeder::class);
    $count = Reservation::query()->count();

    $this->seed(DemoDataSeeder::class);

    expect(User::query()->count())->toBe(4)
        ->and(Reservation::query()->count())->toBe($count);
});
