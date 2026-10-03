<?php

declare(strict_types=1);

namespace App\Facility;

use App\Exceptions\ConflictException;
use App\Facility\Events\HolidayChanged;
use App\Models\Holiday;
use App\Models\Reservation;
use App\Reservations\CancellationReason;
use App\Reservations\CancelReservation;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final readonly class CloseDay
{
    public function __construct(
        private CancelReservation $cancelReservation,
    ) {}

    public function handle(CarbonImmutable $date, ?string $reason, bool $cancelReservations): Holiday
    {
        return DB::transaction(function () use ($date, $reason, $cancelReservations): Holiday {
            Reservation::lockDate($date);

            $reservations = $this->reservationsToCancel($date);

            if ($reservations !== [] && ! $cancelReservations) {
                throw ConflictException::holidayHasReservations(count($reservations));
            }

            $holiday = $this->insertHoliday($date, $reason);

            foreach ($reservations as $reservation) {
                $this->cancelReservation->handle($reservation, CancellationReason::ByHoliday, $reason);
            }

            HolidayChanged::dispatch($date);

            return $holiday;
        });
    }

    /**
     * 開始済みの予約は利用実績として残すので、キャンセルの対象に含めない
     *
     * @return list<Reservation>
     */
    private function reservationsToCancel(CarbonImmutable $date): array
    {
        $now = now()->toImmutable();

        return Reservation::query()
            ->confirmed()
            ->where('date', $date->toDateString())
            ->orderBy('start_hour')
            ->lockForUpdate()
            ->get()
            ->filter(fn (Reservation $reservation): bool => $reservation->isCancellable($now))
            ->values()
            ->all();
    }

    private function insertHoliday(CarbonImmutable $date, ?string $reason): Holiday
    {
        try {
            return Holiday::query()->create([
                'date' => $date->toDateString(),
                'reason' => $reason,
            ]);
        } catch (QueryException $e) {
            if ($e->getCode() === '23505' && str_contains($e->getMessage(), 'holidays_date_unique')) {
                throw ConflictException::holidayAlreadyExists();
            }

            throw $e;
        }
    }
}
