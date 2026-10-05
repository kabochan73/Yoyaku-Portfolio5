<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Calendar\CalendarQuery;
use App\Domain\Reservations\BookingRules;
use App\Http\Controllers\Controller;
use App\Http\Requests\CalendarRequest;
use App\Http\Resources\Admin\CalendarDayResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CalendarController extends Controller
{
    public function __invoke(CalendarRequest $request, CalendarQuery $query, BookingRules $rules): AnonymousResourceCollection
    {
        $now = now()->toImmutable();

        return CalendarDayResource::collection($query->forAdmin($request->from(), $request->to(), $now))
            ->additional(['meta' => [
                'today' => $now->toDateString(),
                'bookable_until' => $rules->bookableUntil($now)->toDateString(),
                'oldest_date' => $query->oldestAdminDate($now)->toDateString(),
            ]]);
    }
}
