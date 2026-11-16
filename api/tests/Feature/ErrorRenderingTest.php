<?php

declare(strict_types=1);

use App\Domain\DomainException;
use App\Domain\Money\InvalidMoney;
use App\Http\RenderApiException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;

use function Pest\Laravel\get;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

beforeEach(function (): void {
    Route::prefix('api/_test')->group(function (): void {
        Route::get('domain', fn () => throw InvalidMoney::unparsable());
        Route::post('validate', fn (Request $request) => $request->validate(['name' => 'required']));
        Route::get('unauthenticated', fn () => throw new AuthenticationException);
        Route::get('forbidden', fn () => throw new AuthorizationException);
        Route::get('crash', fn () => throw new RuntimeException('secret detail'));
    });
    Route::get('_test/crash', fn () => throw new RuntimeException('secret detail'));
});

it('maps a domain exception to 422 with its code', function (): void {
    getJson('/api/_test/domain')
        ->assertStatus(422)
        ->assertExactJson(['code' => 'money.invalid', 'message' => 'Not a valid amount.']);
});

it('uses the status mapped for a domain exception class', function (): void {
    $conflict = new class('test.conflict', 'Already taken.') extends DomainException {};
    $render = new RenderApiException([$conflict::class => 409]);

    $response = TestResponse::fromBaseResponse($render($conflict, Request::create('/api/x')) ?? new JsonResponse);

    $response->assertStatus(409)->assertExactJson(['code' => 'test.conflict', 'message' => 'Already taken.']);
});

it('maps validation errors with field messages', function (): void {
    postJson('/api/_test/validate', [])
        ->assertStatus(422)
        ->assertExactJson([
            'code' => 'validation',
            'message' => 'The name field is required.',
            'errors' => ['name' => ['The name field is required.']],
        ]);
});

it('maps an unknown api route to not_found', function (): void {
    getJson('/api/_test/nope')
        ->assertNotFound()
        ->assertExactJson(['code' => 'not_found', 'message' => 'Not Found']);
});

it('maps a wrong method to method_not_allowed', function (): void {
    postJson('/api/_test/domain')
        ->assertStatus(405)
        ->assertHeader('Allow')
        ->assertExactJson(['code' => 'method_not_allowed', 'message' => 'Method Not Allowed']);
});

it('maps a missing session to unauthenticated', function (): void {
    getJson('/api/_test/unauthenticated')
        ->assertUnauthorized()
        ->assertExactJson(['code' => 'unauthenticated', 'message' => 'Unauthenticated.']);
});

it('maps a denied action to forbidden', function (): void {
    getJson('/api/_test/forbidden')
        ->assertForbidden()
        ->assertExactJson(['code' => 'forbidden', 'message' => 'Forbidden']);
});

it('hides unexpected errors behind server_error even in debug mode', function (): void {
    config(['app.debug' => true]);

    getJson('/api/_test/crash')
        ->assertStatus(500)
        ->assertExactJson(['code' => 'server_error', 'message' => 'Server error.']);
});

it('answers api errors as json even without an accept header', function (): void {
    get('/api/_test/domain')
        ->assertStatus(422)
        ->assertExactJson(['code' => 'money.invalid', 'message' => 'Not a valid amount.']);
});

it('leaves errors outside the api to the default renderer', function (): void {
    config(['app.debug' => false]);

    getJson('/_test/crash')
        ->assertStatus(500)
        ->assertExactJson(['message' => 'Server Error']);
});
