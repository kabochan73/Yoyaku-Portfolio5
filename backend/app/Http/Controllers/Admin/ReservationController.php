<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Reservations\CancellationReason;
use App\Domain\Reservations\CancelReservation;
use App\Domain\Reservations\CreateReservation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePhoneReservationRequest;
use App\Http\Resources\Admin\ReservationResource;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;

final class ReservationController extends Controller
{
    public function store(StorePhoneReservationRequest $request, CreateReservation $action): JsonResponse
    {
        $reservation = $action->forPhone($request->bookerName(), $request->timeSlot());

        return ReservationResource::make($reservation)->response()->setStatusCode(201);
    }

    public function cancel(Reservation $reservation, CancelReservation $action): ReservationResource
    {
        return ReservationResource::make($action->handle($reservation, CancellationReason::ByAdmin));
    }
}
