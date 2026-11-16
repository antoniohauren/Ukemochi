<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\SettingsController;
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

    Route::middleware('role:admin,kitchen')->group(function (): void {
        Route::put('/items/{id}/active', [MenuController::class, 'setItemActive']);
        Route::put('/variants/{id}/available', [MenuController::class, 'setVariantAvailable']);
    });

    Route::middleware('role:admin')->group(function (): void {
        Route::post('/categories', [MenuController::class, 'storeCategory']);
        Route::put('/categories/order', [MenuController::class, 'reorderCategories']);
        Route::put('/categories/{id}', [MenuController::class, 'updateCategory']);
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
    });
});
