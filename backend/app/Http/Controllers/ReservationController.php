<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Reservations\CancellationReason;
use App\Domain\Reservations\CancelReservation;
use App\Domain\Reservations\CreateReservation;
use App\Http\Requests\StoreReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class ReservationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return ReservationResource::collection($user->reservations()->upcoming()->get());
    }

    public function store(StoreReservationRequest $request, CreateReservation $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $reservation = $action->forMember($user, $request->timeSlot());

        return ReservationResource::make($reservation)->response()->setStatusCode(201);
    }

    public function cancel(Reservation $reservation, CancelReservation $action): ReservationResource
    {
        Gate::authorize('cancel', $reservation);

        return ReservationResource::make($action->handle($reservation, CancellationReason::ByMember));
    }
}
