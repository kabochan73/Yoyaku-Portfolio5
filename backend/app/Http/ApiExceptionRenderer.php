<?php

declare(strict_types=1);

namespace App\Http;

use App\Domain\ConflictException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

final class ApiExceptionRenderer
{
    public function __invoke(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*')) {
            return null;
        }

        return match (true) {
            $e instanceof ValidationException => $this->json(422, 'validation_failed', ['errors' => $e->errors()]),
            $e instanceof ConflictException => $this->json(409, $e->errorCode, $e->extra, $e->getMessage()),
            $e instanceof AuthenticationException => $this->json(401, 'unauthenticated'),
            $e instanceof HttpExceptionInterface => $this->fromHttpException($e),
            default => $this->json(500, 'server_error'),
        };
    }

    private function fromHttpException(HttpExceptionInterface $e): JsonResponse
    {
        $code = match ($e->getStatusCode()) {
            403 => 'forbidden',
            404 => 'not_found',
            419 => 'csrf_token_mismatch',
            429 => 'too_many_requests',
            default => 'http_error',
        };

        return $this->json($e->getStatusCode(), $code)->withHeaders($e->getHeaders());
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function json(int $status, string $code, array $extra = [], ?string $message = null): JsonResponse
    {
        return new JsonResponse([
            'message' => $message ?? __("api.{$code}"),
            'code' => $code,
            ...$extra,
        ], $status);
    }
}
