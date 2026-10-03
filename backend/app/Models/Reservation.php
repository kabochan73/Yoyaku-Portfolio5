<?php

declare(strict_types=1);

namespace App\Models;

use App\Reservations\ReservationPhase;
use App\Reservations\ReservationStatus;
use App\Reservations\TimeSlot;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\ReservationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

/**
 * @property int $id
 * @property int|null $user_id
 * @property CarbonImmutable $date
 * @property int $start_hour
 * @property int $end_hour
 * @property ReservationStatus $status
 * @property string $booker_name
 * @property int $price
 * @property CarbonImmutable|null $cancelled_at
 */
#[Fillable([
    'user_id',
    'date',
    'start_hour',
    'end_hour',
    'status',
    'booker_name',
    'price',
    'cancelled_at',
])]
final class Reservation extends Model
{
    /** @use HasFactory<ReservationFactory> */
    use HasFactory;

    use MassPrunable;

    /**
     * 予約の作成と臨時休業日の登録が同じ日に同時に起きても、休業日に予約が残らないよう順番に処理させる
     */
    public static function lockDate(CarbonImmutable $date): void
    {
        DB::statement('SELECT pg_advisory_xact_lock(?)', [crc32('reservation-date:'.$date->toDateString())]);
    }

    public function timeSlot(): TimeSlot
    {
        return new TimeSlot($this->date, $this->start_hour, $this->end_hour);
    }

    public function phase(CarbonImmutable $now): ReservationPhase
    {
        $slot = $this->timeSlot();

        if ($now->lt($slot->startsAt())) {
            return ReservationPhase::BeforeStart;
        }

        return $now->lt($slot->endsAt()) ? ReservationPhase::InUse : ReservationPhase::Finished;
    }

    public function isCancellable(CarbonImmutable $now): bool
    {
        return $this->status === ReservationStatus::Confirmed
            && $this->phase($now) === ReservationPhase::BeforeStart;
    }

    public function cancel(CarbonImmutable $now): void
    {
        $this->status = ReservationStatus::Cancelled;
        $this->cancelled_at = $now;
        $this->save();
    }

    /**
     * @return Builder<self>
     */
    public function prunable(): Builder
    {
        $months = (int) config('facility.rules.admin_lookback_months');

        return self::query()->where('date', '<', today()->subMonthsNoOverflow($months)->toDateString());
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function confirmed(Builder $query): void
    {
        $query->where('status', ReservationStatus::Confirmed);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function between(Builder $query, CarbonInterface $from, CarbonInterface $to): void
    {
        $query->whereBetween('date', [$from->toDateString(), $to->toDateString()]);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function upcoming(Builder $query): void
    {
        $query->where('status', ReservationStatus::Confirmed)
            ->where('date', '>=', today()->toDateString())
            ->orderBy('date')
            ->orderBy('start_hour');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReservationStatus::class,
            'date' => 'immutable_date',
            'start_hour' => 'integer',
            'end_hour' => 'integer',
            'price' => 'integer',
            'cancelled_at' => 'immutable_datetime',
        ];
    }
}
