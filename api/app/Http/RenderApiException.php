<?php

declare(strict_types=1);

namespace App\Http;

use App\Domain\DomainException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/** Renders every /api/* error as `{code, message}` (plus `errors` for validation). */
final class RenderApiException
{
    private const array HTTP_CODES = [
        401 => 'unauthenticated',
        403 => 'forbidden',
        404 => 'not_found',
        405 => 'method_not_allowed',
        419 => 'csrf_mismatch',
        429 => 'too_many_requests',
    ];

    /** @param  array<class-string<DomainException>, int>  $domainStatuses  HTTP status per domain exception class; unlisted ones answer 422 */
    public function __construct(private readonly array $domainStatuses = []) {}

    public function __invoke(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*') || $e instanceof HttpResponseException) {
            return null;
        }

        return match (true) {
            $e instanceof DomainException => $this->json($this->domainStatus($e), $e->errorCode, $e->getMessage(), $e->context),
            $e instanceof ValidationException => $this->json($e->status, 'validation', $e->getMessage(), ['errors' => $e->errors()]),
            $e instanceof AuthenticationException => $this->json(401, 'unauthenticated', 'Unauthenticated.'),
            $e instanceof HttpExceptionInterface => $this->json(
                $e->getStatusCode(),
                self::HTTP_CODES[$e->getStatusCode()] ?? 'http_error',
                Response::$statusTexts[$e->getStatusCode()] ?? 'HTTP error.',
                headers: $e->getHeaders(),
            ),
            // Never the raw message: it can carry SQL and bindings. The log has it.
            default => $this->json(500, 'server_error', 'Server error.'),
        };
    }

    private function domainStatus(DomainException $e): int
    {
        foreach ($this->domainStatuses as $class => $status) {
            if ($e instanceof $class) {
                return $status;
            }
        }

        return 422;
    }

    /**
     * @param  array<string, mixed>  $extra
     * @param  array<array-key, mixed>  $headers
     */
    private function json(int $status, string $code, string $message, array $extra = [], array $headers = []): JsonResponse
    {
        return new JsonResponse(['code' => $code, 'message' => $message, ...$extra], $status, $headers);
    }
}
