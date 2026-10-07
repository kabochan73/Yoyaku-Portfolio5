<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Railway の入口は、利用者の IP を X-Real-IP に入れる一方、X-Forwarded-For の後ろに入口自身の IP を足す。
 * 入口の IP の範囲は公開されていないので、信頼するプロキシから来たときだけ X-Real-IP を利用者の IP として使う
 */
final class UseRealIpHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        $realIp = $request->headers->get('X-Real-IP');

        if (is_string($realIp) && filter_var($realIp, FILTER_VALIDATE_IP) !== false && $request->isFromTrustedProxy()) {
            $request->headers->set('X-Forwarded-For', $realIp);
        }

        return $next($request);
    }
}
