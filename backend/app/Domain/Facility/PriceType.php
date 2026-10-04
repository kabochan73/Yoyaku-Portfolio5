<?php

declare(strict_types=1);

namespace App\Domain\Facility;

enum PriceType: string
{
    case Weekday = 'weekday';
    case Weekend = 'weekend';
}
