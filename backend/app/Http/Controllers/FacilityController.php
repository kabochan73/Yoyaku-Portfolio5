<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Facility\FacilitySettings;
use App\Http\Resources\FacilityResource;

final class FacilityController extends Controller
{
    public function __invoke(): FacilityResource
    {
        return FacilityResource::make(FacilitySettings::current());
    }
}
