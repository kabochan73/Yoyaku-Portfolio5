<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Reservations\ReservationStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SearchUsersRequest;
use App\Http\Resources\Admin\UserResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class UserController extends Controller
{
    private const LIMIT = 20;

    public function index(SearchUsersRequest $request): AnonymousResourceCollection
    {
        $pattern = '%'.addcslashes($request->keyword(), '\\%_').'%';

        $users = User::query()
            ->where('role', UserRole::User)
            ->where(fn (Builder $query) => $query
                ->where('name', 'ilike', $pattern)
                ->orWhere('email', 'ilike', $pattern))
            ->withCount([
                'reservations as confirmed_reservations_count' => fn (Builder $query) => $query
                    ->where('status', ReservationStatus::Confirmed),
            ])
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get();

        return UserResource::collection($users)->additional(['meta' => ['limit' => self::LIMIT]]);
    }
}
