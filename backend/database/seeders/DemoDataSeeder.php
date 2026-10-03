<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Facility\PriceType;
use App\Models\Price;
use App\Models\RegularHoliday;
use App\Models\Reservation;
use App\Models\User;
use App\Reservations\ReservationStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class DemoDataSeeder extends Seeder
{
    private const DAYS = 14;

    private const MEMBERS = [
        ['name' => '山田 太郎', 'email' => 'taro@demo.example.com'],
        ['name' => '佐藤 花子', 'email' => 'hanako@demo.example.com'],
        ['name' => '鈴木 一郎', 'email' => 'ichiro@demo.example.com'],
    ];

    /**
     * 各日の予約の並び。数字は MEMBERS の番号、null は電話予約
     *
     * @var list<list<array{int, int, int|null}>>
     */
    private const PATTERNS = [
        [[10, 12, 0], [14, 16, null], [18, 21, 1]],
        [[10, 12, 1], [18, 21, 2]],
        [[14, 16, null], [18, 21, 0]],
    ];

    public function run(): void
    {
        if (User::query()->where('email', self::MEMBERS[0]['email'])->exists()) {
            return;
        }

        $prices = Price::query()->pluck('amount_per_hour', 'type');
        if ($prices->count() !== 2) {
            throw new RuntimeException('Run InitialDataSeeder before DemoDataSeeder.');
        }

        $regularHolidays = RegularHoliday::query()->pluck('day_of_week')->all();

        DB::transaction(function () use ($prices, $regularHolidays) {
            $members = array_map(
                fn (array $member) => User::query()->create([...$member, 'password' => 'password']),
                self::MEMBERS,
            );

            $date = CarbonImmutable::today();
            for ($day = 1; $day <= self::DAYS; $day++) {
                $date = $date->addDay();
                if (in_array($date->dayOfWeek, $regularHolidays, true)) {
                    continue;
                }

                $unitPrice = $prices[($date->isWeekend() ? PriceType::Weekend : PriceType::Weekday)->value];

                foreach (self::PATTERNS[$day % count(self::PATTERNS)] as [$startHour, $endHour, $memberIndex]) {
                    $member = $memberIndex === null ? null : $members[$memberIndex];

                    Reservation::query()->create([
                        'user_id' => $member?->id,
                        'date' => $date->toDateString(),
                        'start_hour' => $startHour,
                        'end_hour' => $endHour,
                        'status' => ReservationStatus::Confirmed,
                        'booker_name' => $member->name ?? '田中（電話）',
                        'price' => $unitPrice * ($endHour - $startHour),
                    ]);
                }
            }
        });
    }
}
