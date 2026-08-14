<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminFinanceController;
use App\Http\Controllers\Api\Admin\AdminTemplateController;
use App\Http\Controllers\Api\Admin\AdminTrafficController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\ApprovalController;
use App\Http\Controllers\Api\Admin\MusicPresetController;
use App\Http\Controllers\Api\Admin\PackageController;
use App\Http\Controllers\Api\Admin\ProfileFieldController;
use App\Http\Controllers\Api\Admin\VoucherController;
use App\Http\Controllers\Api\AffiliateController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DesignerController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\MotionController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\RsvpController;
use App\Http\Controllers\Api\SeatingController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StorageController;
use App\Http\Controllers\Api\SubscriptionController;
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
    } catch (Throwable $e) {
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

// Sign in with Google (normal users). Browser redirects, not XHR.
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);

// Self-service password recovery, throttled per step rather than as one bucket:
// sending mail to arbitrary addresses is the expensive action, while a guest
// fat-fingering a 6-digit code is normal and shouldn't lock them out. Guessing
// is separately capped at 5 tries per code inside the controller.
Route::post('/password/forgot', [PasswordResetController::class, 'requestCode'])
    ->middleware('throttle:4,1');
Route::post('/password/verify-code', [PasswordResetController::class, 'verifyCode'])
    ->middleware('throttle:15,1');

Route::get('/templates', [TemplateController::class, 'index']);
Route::get('/templates/{key}', [TemplateController::class, 'show']);
// Curated background tracks a host can pick instead of pasting a link.
Route::get('/music-presets', [MusicPresetController::class, 'published']);
// Card animations available to hosts — whatever JSON sits in public/lottie.
Route::get('/motions', [MotionController::class, 'index']);
Route::get('/settings', [SettingsController::class, 'publicShow']);
Route::get('/packages', [PackageController::class, 'publicIndex']);

// Live public card + RSVP
Route::get('/cards/{slug}', [InvitationController::class, 'publicShow']);
Route::post('/cards/{slug}/rsvp', [RsvpController::class, 'store']);
// A guest's own table, opened from the link in their RSVP confirmation email.
Route::get('/cards/{slug}/seat/{guest}', [SeatingController::class, 'guestView']);
Route::get('/cards/{slug}/wishes', [WishController::class, 'index']);
Route::post('/cards/{slug}/wishes', [WishController::class, 'store']);

// HitPay server-to-server webhook (public, no auth; verified by HMAC salt)
Route::post('/billing/webhook', [PaymentController::class, 'webhook']);

/* ---------------- Authenticated (any logged-in user) ---------------- */
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::put('/me/profile', [AuthController::class, 'updateProfile']);
    Route::get('/me/profile-fields', [AuthController::class, 'myProfileFields']);
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

    // Affiliate's own referral link + the sales they've driven.
    Route::get('/me/affiliate', [AffiliateController::class, 'mine']);
    Route::get('/purchases/{payment}/receipt', [PurchaseController::class, 'receipt']);
    Route::get('/purchases/{payment}/receipt-meta', [PurchaseController::class, 'receiptMeta']);

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
    Route::post('/me/designs/{template}/thumbnail', [DesignerController::class, 'thumbnail']);
    Route::delete('/me/designs/{template}', [DesignerController::class, 'destroy']);

    Route::get('/invitations', [InvitationController::class, 'index']);
    Route::post('/invitations', [InvitationController::class, 'store']);
    // Turn a guest's trial-editor content into a (watermarked) trial card after login.
    Route::post('/me/trial-cards', [InvitationController::class, 'trialStore']);
    Route::get('/invitations/{invitation}', [InvitationController::class, 'show']);
    Route::put('/invitations/{invitation}', [InvitationController::class, 'update']);
    Route::delete('/invitations/{invitation}', [InvitationController::class, 'destroy']);
    Route::post('/invitations/{invitation}/upload', [MediaController::class, 'upload']);

    Route::get('/invitations/{invitation}/guests', [RsvpController::class, 'index']);
    Route::get('/invitations/{invitation}/guests/export', [RsvpController::class, 'export']);
    Route::get('/guests/import-template', [RsvpController::class, 'importTemplate']);
    Route::post('/invitations/{invitation}/guests', [RsvpController::class, 'storeGuest']);
    Route::post('/invitations/{invitation}/guests/import', [RsvpController::class, 'importGuests']);
    Route::put('/guests/{guest}', [RsvpController::class, 'updateGuest']);
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
    Route::get('/invitations/{invitation}/seating/export', [SeatingController::class, 'export']);
    Route::put('/invitations/{invitation}/seating/privacy', [SeatingController::class, 'setPrivacy']);
    Route::post('/invitations/{invitation}/props', [SeatingController::class, 'storeProp']);
    Route::put('/props/{prop}', [SeatingController::class, 'updateProp']);
    Route::delete('/props/{prop}', [SeatingController::class, 'destroyProp']);

    // Billing / subscription (HitPay)
    Route::post('/billing/subscribe', [PaymentController::class, 'subscribe']);
    Route::post('/billing/checkout', [PaymentController::class, 'checkout']);
    // Pay to publish a specific trial card (removes the watermark, goes live).
    Route::post('/billing/publish-card', [PaymentController::class, 'publishCard']);
    Route::post('/billing/verify', [PaymentController::class, 'verify']);

    /* ---------------- Admin only ---------------- */
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);
        Route::get('/finance', [AdminFinanceController::class, 'index']);
        Route::get('/affiliates', [AffiliateController::class, 'adminIndex']);
        Route::get('/traffic', [AdminTrafficController::class, 'index']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::post('/users/{user}/toggle', [AdminUserController::class, 'toggleActive']);
        Route::post('/users/{user}/impersonate', [AdminUserController::class, 'impersonate']);
        Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

        // Archive: soft-deleted accounts, restorable or permanently erasable.
        Route::get('/archive/templates', [AdminTemplateController::class, 'archived']);
        Route::post('/archive/templates/{id}/restore', [AdminTemplateController::class, 'restore']);
        Route::delete('/archive/templates/{id}', [AdminTemplateController::class, 'forceDestroy']);
        Route::get('/archive/users', [AdminUserController::class, 'archived']);
        Route::post('/archive/users/{id}/restore', [AdminUserController::class, 'restore']);
        Route::delete('/archive/users/{id}', [AdminUserController::class, 'forceDestroy']);

        Route::get('/approvals/{user}/receipt', [ApprovalController::class, 'receipt']);

        Route::get('/settings', [SettingsController::class, 'index']);
        Route::put('/settings', [SettingsController::class, 'update']);

        Route::get('/templates', [AdminTemplateController::class, 'index']);
        Route::post('/templates', [AdminTemplateController::class, 'store']);
        Route::put('/templates/{template}', [AdminTemplateController::class, 'update']);
        Route::delete('/templates/{template}', [AdminTemplateController::class, 'destroy']);
        Route::post('/templates/{template}/thumbnail', [AdminTemplateController::class, 'thumbnail']);

        // Background music library offered to hosts.
        Route::get('/music-presets', [MusicPresetController::class, 'index']);
        Route::post('/music-presets', [MusicPresetController::class, 'store']);
        Route::post('/music-presets/upload', [MusicPresetController::class, 'upload']);
        Route::put('/music-presets/{preset}', [MusicPresetController::class, 'update']);
        Route::delete('/music-presets/{preset}', [MusicPresetController::class, 'destroy']);

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

        // Superadmin-defined profile fields (custom fields -> profile tabs; receipt fields).
        Route::get('/profile-fields', [ProfileFieldController::class, 'index']);
        Route::post('/profile-fields', [ProfileFieldController::class, 'store']);
        Route::put('/profile-fields/{profileField}', [ProfileFieldController::class, 'update']);
        Route::delete('/profile-fields/{profileField}', [ProfileFieldController::class, 'destroy']);

        // Vendor/affiliate approval inbox
        Route::get('/approvals', [ApprovalController::class, 'index']);
        Route::post('/approvals/{user}/approve', [ApprovalController::class, 'approve']);
        Route::post('/approvals/{user}/reject', [ApprovalController::class, 'reject']);
        // Book an offline approval receipt into finance (idempotent).
        Route::post('/approvals/{user}/record-payment', [ApprovalController::class, 'recordPayment']);

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
