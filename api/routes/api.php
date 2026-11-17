<?php

declare(strict_types=1);

use App\Http\Controllers\AuditController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RealtimeController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\SplitController;
use App\Http\Controllers\StaffController;
use Illuminate\Support\Facades\Route;

// Ids fit a bigint: longer ones are 404, not an int overflow.
Route::pattern('id', '[0-9]{1,18}');
Route::pattern('itemId', '[0-9]{1,18}');

Route::get('/health', HealthController::class);

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/menu', [MenuController::class, 'show']);
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::get('/realtime', RealtimeController::class);
    Route::get('/shifts/current', [ShiftController::class, 'current']);

    // Orders: any staff reads, edits, moves status and reopens (PLAN: any staff can edit/reopen closed orders).
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::put('/orders/{id}', [OrderController::class, 'update']);
    Route::put('/orders/{id}/status', [OrderController::class, 'status']);
    Route::post('/orders/{id}/reopen', [OrderController::class, 'reopen']);
    Route::get('/orders/{id}/ticket', [OrderController::class, 'ticket']);
    Route::post('/orders/{id}/printed', [OrderController::class, 'printed']);
    Route::get('/orders/{id}/payments', [PaymentController::class, 'index']);
    // Preview only: nothing is stored.
    Route::post('/orders/{id}/split', SplitController::class);

    // Taking and cancelling orders is front-of-house work; the kitchen only follows them.
    Route::middleware('role:admin,waitress')->group(function (): void {
        Route::post('/orders', [OrderController::class, 'store']);
        Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
        // Cash is front-of-house work too.
        Route::post('/shifts', [ShiftController::class, 'open']);
        Route::post('/shifts/current/movements', [ShiftController::class, 'movement']);
        Route::post('/shifts/current/close', [ShiftController::class, 'close']);
        Route::post('/orders/{id}/payments', [PaymentController::class, 'store']);
        Route::post('/payments/{id}/void', [PaymentController::class, 'void']);
    });

    Route::middleware('role:admin,kitchen')->group(function (): void {
        Route::put('/items/{id}/active', [MenuController::class, 'setItemActive']);
        Route::put('/variants/{id}/available', [MenuController::class, 'setVariantAvailable']);
    });

    Route::middleware('role:admin')->group(function (): void {
        Route::post('/categories', [MenuController::class, 'storeCategory']);
        Route::put('/categories/order', [MenuController::class, 'reorderCategories']);
        Route::put('/categories/{id}', [MenuController::class, 'updateCategory']);
        Route::put('/categories/{id}/items/order', [MenuController::class, 'reorderItems']);
        Route::post('/items', [MenuController::class, 'storeItem']);
        Route::put('/items/{id}', [MenuController::class, 'updateItem']);
        Route::post('/items/{itemId}/variants', [MenuController::class, 'storeVariant']);
        Route::put('/items/{itemId}/variants/order', [MenuController::class, 'reorderVariants']);
        Route::put('/variants/{id}', [MenuController::class, 'updateVariant']);
        Route::delete('/variants/{id}', [MenuController::class, 'destroyVariant']);
        Route::post('/addons', [MenuController::class, 'storeAddon']);
        Route::put('/addons/{id}', [MenuController::class, 'updateAddon']);
        Route::get('/users', [StaffController::class, 'index']);
        Route::post('/users', [StaffController::class, 'store']);
        Route::put('/users/{id}', [StaffController::class, 'update']);
        Route::put('/users/{id}/pin', [StaffController::class, 'resetPin']);
        Route::put('/settings', [SettingsController::class, 'update']);
        Route::get('/shifts', [ShiftController::class, 'index']);
        Route::get('/shifts/{id}', [ShiftController::class, 'show']);
        Route::get('/audit', AuditController::class);
    });
});
