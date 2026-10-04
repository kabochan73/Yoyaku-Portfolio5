<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Facility\PriceType;
use App\Enums\UserRole;
use App\Models\Price;
use App\Models\RegularHoliday;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class InitialDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->createAdmin();
        $this->createSettings();
    }

    private function createAdmin(): void
    {
        $email = config('facility.admin.email');
        $password = config('facility.admin.password');

        if (! is_string($email) || $email === '' || ! is_string($password) || $password === '') {
            throw new RuntimeException('Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding.');
        }

        if (User::query()->where('email', $email)->exists()) {
            return;
        }

        $admin = new User(['name' => '管理者', 'email' => $email, 'password' => $password]);
        $admin->forceFill(['role' => UserRole::Admin])->save();
    }

    private function createSettings(): void
    {
        if (Price::query()->exists()) {
            return;
        }

        DB::transaction(function () {
            Price::query()->create(['type' => PriceType::Weekday, 'amount_per_hour' => 4000]);
            Price::query()->create(['type' => PriceType::Weekend, 'amount_per_hour' => 5000]);
            RegularHoliday::query()->create(['day_of_week' => CarbonInterface::MONDAY]);
        });
    }
}
