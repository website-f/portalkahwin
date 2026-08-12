<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminFinanceController;
use App\Http\Controllers\Api\Admin\AdminTemplateController;
use App\Http\Controllers\Api\Admin\AdminTrafficController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\ApprovalController;
use App\Http\Controllers\Api\Admin\PackageController;
use App\Http\Controllers\Api\Admin\VoucherController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DesignerController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\StorageController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RsvpController;
use App\Http\Controllers\Api\SeatingController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\TemplateSubmissionController;
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
Route::get('/packages', [PackageController::class, 'publicIndex']);

// Live public card + RSVP
Route::get('/cards/{slug}', [InvitationController::class, 'publicShow']);
Route::post('/cards/{slug}/rsvp', [RsvpController::class, 'store']);
// A guest's own table, opened from the link in their RSVP confirmation email.
Route::get('/cards/{slug}/seat/{guest}', [SeatingController::class, 'guestView']);
Route::get('/cards/{slug}/wishes', [WishController::class, 'index']);
Route::post('/cards/{slug}/wishes', [WishController::class, 'store']);

// ToyyibPay server-to-server callback (public, no auth)
Route::post('/billing/callback', [PaymentController::class, 'callback']);

/* ---------------- Authenticated (any logged-in user) ---------------- */
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::put('/me/profile', [AuthController::class, 'updateProfile']);
    Route::post('/me/logo', [AuthController::class, 'uploadLogo']);
    Route::get('/me/subscription', [SubscriptionController::class, 'show']);

    // Storage: the user's own asset list, usage, and quota-increase requests.
    Route::get('/me/storage', [StorageController::class, 'mine']);
    Route::get('/me/storage-requests', [StorageController::class, 'myRequests']);
    Route::post('/me/storage-requests', [StorageController::class, 'storeRequest']);

    // Voucher validation (used at checkout).
    Route::post('/vouchers/validate', [VoucherController::class, 'validateCode']);

    // Saved / favourite templates (all roles).
    Route::get('/me/favorites', [FavoriteController::class, 'index']);
    Route::post('/me/favorites/toggle', [FavoriteController::class, 'toggle']);

    // The user's own purchase history (transactions + receipts).
    Route::get('/me/purchases', [PurchaseController::class, 'index']);

    // Community template contribution (legacy: base + palette re-skin)
    Route::post('/templates/submit', [TemplateSubmissionController::class, 'store']);
    Route::get('/me/template-submissions', [TemplateSubmissionController::class, 'mine']);

    // No-code template designer (raw custom designs + drafts)
    Route::get('/me/designs', [DesignerController::class, 'mine']);
    Route::post('/me/designs', [DesignerController::class, 'store']);
    Route::post('/me/designs/upload', [DesignerController::class, 'upload']);
    Route::get('/me/designs/{template}', [DesignerController::class, 'show']);
    Route::put('/me/designs/{template}', [DesignerController::class, 'update']);
    Route::post('/me/designs/{template}/submit', [DesignerController::class, 'submit']);
    Route::delete('/me/designs/{template}', [DesignerController::class, 'destroy']);

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
        Route::get('/finance', [AdminFinanceController::class, 'index']);
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

        // Subscription packages (vendor/affiliate)
        Route::get('/packages', [PackageController::class, 'index']);
        Route::post('/packages', [PackageController::class, 'store']);
        Route::put('/packages/{package}', [PackageController::class, 'update']);
        Route::delete('/packages/{package}', [PackageController::class, 'destroy']);

        // Voucher codes
        Route::get('/vouchers', [VoucherController::class, 'index']);
        Route::post('/vouchers', [VoucherController::class, 'store']);
        Route::put('/vouchers/{voucher}', [VoucherController::class, 'update']);
        Route::delete('/vouchers/{voucher}', [VoucherController::class, 'destroy']);

        // Vendor/affiliate approval inbox
        Route::get('/approvals', [ApprovalController::class, 'index']);
        Route::post('/approvals/{user}/approve', [ApprovalController::class, 'approve']);
        Route::post('/approvals/{user}/reject', [ApprovalController::class, 'reject']);

        // Storage-increase requests
        Route::get('/storage-requests', [StorageController::class, 'adminIndex']);
        Route::post('/storage-requests/{storageRequest}/decide', [StorageController::class, 'decide']);

        // Community template submissions
        Route::get('/template-submissions', [TemplateSubmissionController::class, 'adminIndex']);
        Route::post('/template-submissions/bulk-delete', [TemplateSubmissionController::class, 'bulkDestroy']);
        Route::post('/template-submissions/{template}/approve', [TemplateSubmissionController::class, 'approve']);
        Route::post('/template-submissions/{template}/reject', [TemplateSubmissionController::class, 'reject']);
        Route::delete('/template-submissions/{template}', [TemplateSubmissionController::class, 'destroy']);
    });
});
