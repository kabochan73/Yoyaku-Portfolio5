<?php

declare(strict_types=1);

namespace App\Facility;

enum PriceType: string
{
    case Weekday = 'weekday';
    case Weekend = 'weekend';
}
