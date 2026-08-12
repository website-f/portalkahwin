<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\StorageRequest;
use Illuminate\Http\Request;

class StorageController extends Controller
{
    /** The auth user's storage usage + full asset list. */
    public function mine(Request $request)
    {
        $user = $request->user();

        $assets = $user->assets()->latest()->get()->map(fn (Asset $a) => [
            'id' => $a->id,
            'path' => $a->path,
            'url' => $this->assetUrl($a->path),
            'size_bytes' => (int) $a->size_bytes,
            'kind' => $a->kind,
            'invitation_id' => $a->invitation_id,
            'created_at' => $a->created_at,
        ]);

        return response()->json([
            'used_mb' => $user->storageUsedMb(),
            'quota_mb' => (int) $user->storage_quota_mb,
            'remaining_mb' => $user->storageRemainingMb(),
            'assets' => $assets,
        ]);
    }

    /** The auth user's own quota-increase requests, latest first. */
    public function myRequests(Request $request)
    {
        return response()->json(
            $request->user()->storageRequests()->latest()->get()
        );
    }

    /** Create a pending quota-increase request for the auth user. */
    public function storeRequest(Request $request)
    {
        $data = $request->validate([
            'requested_mb' => ['required', 'integer', 'min:50', 'max:5000'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($request->user()->storageRequests()->where('status', 'pending')->exists()) {
            return response()->json([
                'message' => 'Anda sudah mempunyai permohonan storan yang menunggu keputusan.',
            ], 422);
        }

        $storageRequest = $request->user()->storageRequests()->create([
            'requested_mb' => $data['requested_mb'],
            'reason' => $data['reason'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json($storageRequest, 201);
    }

    /** Admin: every quota-increase request with its requesting user, latest first. */
    public function adminIndex()
    {
        return response()->json(
            StorageRequest::with('user:id,name,email,storage_quota_mb')->latest()->get()
        );
    }

    /** Admin: approve or reject a request; approval grants extra quota. */
    public function decide(Request $request, StorageRequest $storageRequest)
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'admin_note' => ['nullable', 'string', 'max:2000'],
            'grant_mb' => ['nullable', 'integer', 'min:1'],
        ]);

        if ($data['status'] === 'approved') {
            $grant = $data['grant_mb'] ?? $storageRequest->requested_mb;
            $storageRequest->user->increment('storage_quota_mb', $grant);
        }

        $storageRequest->update([
            'status' => $data['status'],
            'admin_note' => $data['admin_note'] ?? null,
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ]);

        return response()->json($storageRequest->fresh());
    }

    /** Turn a stored asset path into a host-agnostic URL. */
    private function assetUrl(string $path): string
    {
        if (str_starts_with($path, 'http') || str_starts_with($path, '/storage')) {
            return $path;
        }

        return '/storage/'.ltrim($path, '/');
    }
}
