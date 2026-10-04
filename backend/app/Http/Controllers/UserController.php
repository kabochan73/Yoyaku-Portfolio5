<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

final class UserController extends Controller
{
    public function show(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        return UserResource::make($user);
    }

    public function updateProfile(UpdateProfileRequest $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        $user->fill($request->safe()->only(['name', 'email']));

        if ($request->filled('password')) {
            $user->password = $request->string('password')->toString();
        }

        $user->save();

        return UserResource::make($user);
    }
}
