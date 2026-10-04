<?php

declare(strict_types=1);

namespace App\Domain\Reservations;

enum ReservationPhase: string
{
    case BeforeStart = 'before_start';
    case InUse = 'in_use';
    case Finished = 'finished';
}
