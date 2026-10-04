<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Facility\FacilitySettings;
use App\Domain\Facility\UpdatePrices;
use App\Domain\Facility\UpdateRegularHolidays;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdatePricesRequest;
use App\Http\Requests\Admin\UpdateRegularHolidaysRequest;
use App\Http\Resources\FacilityResource;

final class SettingsController extends Controller
{
    public function updatePrices(UpdatePricesRequest $request, UpdatePrices $action): FacilityResource
    {
        $action->handle($request->integer('weekday'), $request->integer('weekend'));

        return FacilityResource::make(FacilitySettings::current());
    }

    public function updateRegularHolidays(UpdateRegularHolidaysRequest $request, UpdateRegularHolidays $action): FacilityResource
    {
        $action->handle($request->days());

        return FacilityResource::make(FacilitySettings::current());
    }
}
