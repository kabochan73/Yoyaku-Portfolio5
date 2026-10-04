<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Facility\CloseDay;
use App\Domain\Facility\ReopenDay;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreHolidayRequest;
use App\Http\Resources\HolidayResource;
use App\Models\Holiday;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class HolidayController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return HolidayResource::collection(
            Holiday::query()->where('date', '>=', today()->toDateString())->orderBy('date')->get()
        );
    }

    public function store(StoreHolidayRequest $request, CloseDay $action): JsonResponse
    {
        $holiday = $action->handle($request->holidayDate(), $request->reason(), $request->cancelReservations());

        return HolidayResource::make($holiday)->response()->setStatusCode(201);
    }

    public function destroy(Holiday $holiday, ReopenDay $action): Response
    {
        $action->handle($holiday);

        return response()->noContent();
    }
}
