<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Auth\CurrentUser;
use App\Application\Auth\Login;
use App\Application\Auth\Logout;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Response;

final class AuthController
{
    public function login(LoginRequest $request, Login $login): UserResource
    {
        return new UserResource($login->execute($request->name(), $request->pin()));
    }

    public function logout(Logout $logout): Response
    {
        $logout->execute();

        return response()->noContent();
    }

    public function me(CurrentUser $currentUser): UserResource
    {
        return new UserResource($currentUser->execute());
    }
}
