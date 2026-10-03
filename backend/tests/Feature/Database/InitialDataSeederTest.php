<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Facility\PriceType;
use App\Models\Price;
use App\Models\RegularHoliday;
use App\Models\User;
use Database\Seeders\InitialDataSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    config([
        'facility.admin.email' => 'admin@example.com',
        'facility.admin.password' => 'secret-password',
    ]);
});

it('管理者・料金・定休日を作る', function () {
    $this->seed(InitialDataSeeder::class);

    $admin = User::query()->sole();
    expect($admin->email)->toBe('admin@example.com')
        ->and($admin->role)->toBe(UserRole::Admin)
        ->and(Hash::check('secret-password', $admin->password))->toBeTrue()
        ->and(Price::query()->pluck('amount_per_hour', 'type')->all())
        ->toBe([PriceType::Weekday->value => 4000, PriceType::Weekend->value => 5000])
        ->and(RegularHoliday::query()->pluck('day_of_week')->all())->toBe([1]);
});

it('2回流しても増えない', function () {
    $this->seed(InitialDataSeeder::class);
    $this->seed(InitialDataSeeder::class);

    expect(User::query()->count())->toBe(1)
        ->and(Price::query()->count())->toBe(2)
        ->and(RegularHoliday::query()->count())->toBe(1);
});

it('管理者が変えた料金・定休日・パスワードを初期値に戻さない', function () {
    $this->seed(InitialDataSeeder::class);
    Price::query()->where('type', PriceType::Weekday)->update(['amount_per_hour' => 4500]);
    RegularHoliday::query()->delete();
    User::query()->sole()->update(['password' => 'changed-password']);

    $this->seed(InitialDataSeeder::class);

    expect(Price::query()->where('type', PriceType::Weekday)->value('amount_per_hour'))->toBe(4500)
        ->and(RegularHoliday::query()->count())->toBe(0)
        ->and(Hash::check('changed-password', User::query()->sole()->password))->toBeTrue();
});

it('管理者の設定が無いと止まる', function () {
    config(['facility.admin.email' => null]);

    expect(fn () => $this->seed(InitialDataSeeder::class))
        ->toThrow(RuntimeException::class);
});
