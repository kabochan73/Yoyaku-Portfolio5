<?php

declare(strict_types=1);

namespace App\Domain\Reservations;

enum CancellationReason: string
{
    case ByMember = 'by_member';
    case ByAdmin = 'by_admin';
    case ByHoliday = 'by_holiday';
}
