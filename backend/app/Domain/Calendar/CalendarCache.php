<?php

declare(strict_types=1);

namespace App\Domain\Calendar;

use App\Models\Holiday;
use App\Models\RegularHoliday;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Cache;

/**
 * @phpstan-import-type DayFactsArray from DayFacts
 */
final class CalendarCache
{
    private const REGULAR_HOLIDAYS_KEY = 'calendar:regular_holidays';

    /**
     * @return array<string, DayFacts> 日付（Y-m-d）→ その日の事実
     */
    public function days(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $dates = $this->datesBetween($from, $to);
        if ($dates === []) {
            return [];
        }

        $cached = Cache::many(array_map($this->dayKey(...), $dates));

        $facts = [];
        $missing = [];
        foreach ($dates as $date) {
            /** @var DayFactsArray|null $data */
            $data = $cached[$this->dayKey($date)] ?? null;

            if ($data === null) {
                $missing[] = $date;
            } else {
                $facts[$date] = DayFacts::fromArray($data);
            }
        }

        if ($missing !== []) {
            $loaded = $this->loadDays($missing);

            $values = [];
            foreach ($loaded as $date => $dayFacts) {
                $values[$this->dayKey($date)] = $dayFacts->toArray();
            }
            Cache::putMany($values, $this->ttl());

            $facts += $loaded;
        }

        ksort($facts);

        return $facts;
    }

    /**
     * @return list<int>
     */
    public function regularHolidays(): array
    {
        return Cache::remember(self::REGULAR_HOLIDAYS_KEY, $this->ttl(), RegularHoliday::days(...));
    }

    public function forgetDay(CarbonImmutable $date): void
    {
        Cache::forget($this->dayKey($date->toDateString()));
    }

    public function forgetRegularHolidays(): void
    {
        Cache::forget(self::REGULAR_HOLIDAYS_KEY);
    }

    /**
     * @param  list<string>  $dates
     * @return array<string, DayFacts>
     */
    private function loadDays(array $dates): array
    {
        $reservations = Reservation::query()
            ->confirmed()
            ->whereIn('date', $dates)
            ->orderBy('start_hour')
            ->toBase()
            ->get(['id', 'date', 'start_hour', 'end_hour', 'booker_name', 'user_id', 'price'])
            ->groupBy('date');

        $holidayReasons = Holiday::query()
            ->whereIn('date', $dates)
            ->toBase()
            ->pluck('reason', 'date')
            ->all();

        $facts = [];
        foreach ($dates as $date) {
            $facts[$date] = new DayFacts(
                reservations: $reservations->get($date, collect())
                    ->map(fn (object $row): array => [
                        'id' => (int) $row->id,
                        'start_hour' => (int) $row->start_hour,
                        'end_hour' => (int) $row->end_hour,
                        'booker_name' => (string) $row->booker_name,
                        'user_id' => $row->user_id === null ? null : (int) $row->user_id,
                        'price' => (int) $row->price,
                    ])
                    ->values()
                    ->all(),
                isHoliday: array_key_exists($date, $holidayReasons),
                holidayReason: $holidayReasons[$date] ?? null,
            );
        }

        return $facts;
    }

    /**
     * @return list<string>
     */
    private function datesBetween(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $dates = [];
        foreach (CarbonPeriod::create($from->startOfDay(), $to->startOfDay()) as $date) {
            $dates[] = $date->toDateString();
        }

        return $dates;
    }

    private function dayKey(string $date): string
    {
        return "calendar:day:{$date}";
    }

    private function ttl(): int
    {
        return (int) config('facility.calendar_cache_ttl');
    }
}
