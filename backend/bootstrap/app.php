<?php

declare(strict_types=1);

use App\Http\ApiExceptionRenderer;
use App\Http\Middleware\UseRealIpHeader;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withEvents(discover: [__DIR__.'/../app/Domain/*/Listeners'])
    ->withMiddleware(function (Middleware $middleware): void {
        // TrustProxies（標準のグローバルミドルウェア）より後に置き、信頼するプロキシかどうかを判定できるようにする
        $middleware->append(UseRealIpHeader::class);
        $middleware->statefulApi();
        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(new ApiExceptionRenderer);
    })->create();
