<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminTemplateController;
use App\Http\Controllers\Api\Admin\AdminTrafficController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RsvpController;
use App\Http\Controllers\Api\SeatingController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\WishController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/* ---------------- Health (P0 probe) ---------------- */
Route::get('/health', function () {
    $db = 'error';
    try {
        DB::connection()->getPdo();
        $db = DB::connection()->getDriverName() === 'mysql' ? 'connected' : DB::connection()->getDriverName();
    } catch (\Throwable $e) {
        $db = 'error';
    }

    return response()->json([
        'app' => config('app.name'),
        'laravel' => app()->version(),
        'php' => PHP_VERSION,
        'database' => $db,
        'supabase' => 'none',
    ]);
});

/* ---------------- Public ---------------- */
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/track', [TrackingController::class, 'store']);

Route::get('/templates', [TemplateController::class, 'index']);
Route::get('/templates/{key}', [TemplateController::class, 'show']);
Route::get('/settings', [SettingsController::class, 'publicShow']);

// Live public card + RSVP
Route::get('/cards/{slug}', [InvitationController::class, 'publicShow']);
Route::post('/cards/{slug}/rsvp', [RsvpController::class, 'store']);
Route::get('/cards/{slug}/wishes', [WishController::class, 'index']);
Route::post('/cards/{slug}/wishes', [WishController::class, 'store']);

// ToyyibPay server-to-server callback (public, no auth)
Route::post('/billing/callback', [PaymentController::class, 'callback']);

/* ---------------- Authenticated (any logged-in user) ---------------- */
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::get('/me/subscription', [SubscriptionController::class, 'show']);

    Route::get('/invitations', [InvitationController::class, 'index']);
    Route::post('/invitations', [InvitationController::class, 'store']);
    Route::get('/invitations/{invitation}', [InvitationController::class, 'show']);
    Route::put('/invitations/{invitation}', [InvitationController::class, 'update']);
    Route::delete('/invitations/{invitation}', [InvitationController::class, 'destroy']);
    Route::post('/invitations/{invitation}/upload', [MediaController::class, 'upload']);

    Route::get('/invitations/{invitation}/guests', [RsvpController::class, 'index']);
    Route::get('/invitations/{invitation}/guests/export', [RsvpController::class, 'export']);
    Route::post('/guests/{guest}/checkin', [RsvpController::class, 'checkIn']);
    Route::post('/invitations/{invitation}/scan', [RsvpController::class, 'scan']);
    Route::delete('/guests/{guest}', [RsvpController::class, 'destroyGuest']);

    // Seating floorplan
    Route::get('/invitations/{invitation}/seating', [SeatingController::class, 'show']);
    Route::post('/invitations/{invitation}/tables', [SeatingController::class, 'storeTable']);
    Route::put('/tables/{table}', [SeatingController::class, 'updateTable']);
    Route::delete('/tables/{table}', [SeatingController::class, 'destroyTable']);
    Route::post('/seats/{seat}/assign', [SeatingController::class, 'assignSeat']);
    Route::post('/seats/{seat}/unassign', [SeatingController::class, 'unassignSeat']);
    Route::post('/invitations/{invitation}/seating/auto', [SeatingController::class, 'autoAssign']);
    Route::post('/invitations/{invitation}/seating/clear', [SeatingController::class, 'clear']);

    // Billing / subscription (ToyyibPay)
    Route::post('/billing/subscribe', [PaymentController::class, 'subscribe']);
    Route::post('/billing/checkout', [PaymentController::class, 'checkout']);
    Route::post('/billing/verify', [PaymentController::class, 'verify']);

    /* ---------------- Admin only ---------------- */
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);
        Route::get('/traffic', [AdminTrafficController::class, 'index']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::post('/users/{user}/toggle', [AdminUserController::class, 'toggleActive']);
        Route::post('/users/{user}/impersonate', [AdminUserController::class, 'impersonate']);
        Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);

        Route::get('/settings', [SettingsController::class, 'index']);
        Route::put('/settings', [SettingsController::class, 'update']);

        Route::get('/templates', [AdminTemplateController::class, 'index']);
        Route::post('/templates', [AdminTemplateController::class, 'store']);
        Route::put('/templates/{template}', [AdminTemplateController::class, 'update']);
        Route::delete('/templates/{template}', [AdminTemplateController::class, 'destroy']);
    });
});
