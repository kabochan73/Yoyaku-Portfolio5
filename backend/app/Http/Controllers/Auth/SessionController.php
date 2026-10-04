<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

final class SessionController extends Controller
{
    public function store(LoginRequest $request): UserResource
    {
        if (! Auth::attempt($request->validated())) {
            throw ValidationException::withMessages(['credentials' => __('auth.failed')]);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = $request->user();

        return UserResource::make($user);
    }

    public function destroy(Request $request): Response
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
