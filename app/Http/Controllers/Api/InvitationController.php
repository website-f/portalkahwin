<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class InvitationController extends Controller
{
    /** List the authenticated user's cards. */
    public function index(Request $request)
    {
        return $request->user()->invitations()
            ->withCount('guests')
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'template_key' => ['required', 'string', 'exists:templates,key'],
            'groom_name' => ['required', 'string', 'max:120'],
            'bride_name' => ['required', 'string', 'max:120'],
        ]);

        if ($resp = $this->guardPremiumTemplate($request, $data['template_key'])) {
            return $resp;
        }

        $template = Template::where('key', $data['template_key'])->first();

        $invitation = $request->user()->invitations()->create([
            'template_key' => $data['template_key'],
            // A contributed design carries its own palette; adopt it so the base component re-skins.
            'palette' => $template?->palette,
            'groom_name' => $data['groom_name'],
            'bride_name' => $data['bride_name'],
            'groom_short' => Str::of($data['groom_name'])->explode(' ')->last(),
            'bride_short' => Str::of($data['bride_name'])->explode(' ')->first(),
            'slug' => $this->uniqueSlug($data['bride_name'], $data['groom_name']),
            'status' => 'draft',
            'bismillah' => true,
            'rsvp_enabled' => true,
            'opening_line' => 'Dengan penuh rasa syukur, kami berbesar hati menjemput Tuan/Puan ke majlis perkahwinan anakanda kami',
        ]);

        Template::where('key', $data['template_key'])->increment('usage_count');

        return response()->json($invitation, 201);
    }

    /** Owner view for the editor. */
    public function show(Request $request, Invitation $invitation)
    {
        $this->authorizeOwner($request, $invitation);

        return $invitation;
    }

    public function update(Request $request, Invitation $invitation)
    {
        $this->authorizeOwner($request, $invitation);

        $data = $request->validate([
            'template_key' => ['sometimes', 'string', 'exists:templates,key'],
            'status' => ['sometimes', 'in:draft,published'],
            'groom_name' => ['sometimes', 'string', 'max:120'],
            'bride_name' => ['sometimes', 'string', 'max:120'],
            'groom_short' => ['nullable', 'string', 'max:60'],
            'bride_short' => ['nullable', 'string', 'max:60'],
            'groom_parents' => ['nullable', 'string', 'max:200'],
            'bride_parents' => ['nullable', 'string', 'max:200'],
            'opening_line' => ['nullable', 'string', 'max:500'],
            'bismillah' => ['sometimes', 'boolean'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'akad_at' => ['nullable', 'date'],
            'reception_at' => ['nullable', 'date'],
            'date_label' => ['nullable', 'string', 'max:120'],
            'time_label' => ['nullable', 'string', 'max:120'],
            'hijri_label' => ['nullable', 'string', 'max:120'],
            'venue_name' => ['nullable', 'string', 'max:200'],
            'venue_address' => ['nullable', 'string', 'max:300'],
            'maps_url' => ['nullable', 'string', 'max:500'],
            'waze_url' => ['nullable', 'string', 'max:500'],
            'program' => ['nullable', 'array'],
            'contacts' => ['nullable', 'array'],
            'gift' => ['nullable', 'array'],
            'wishlist' => ['nullable', 'array'],
            'wishlist.*.title' => ['required', 'string', 'max:120'],
            'wishlist.*.note' => ['nullable', 'string', 'max:200'],
            'wishlist.*.url' => ['nullable', 'string', 'max:500'],
            'gallery_images' => ['nullable', 'array'],
            'music_url' => ['nullable', 'string', 'max:500'],
            'palette' => ['nullable', 'array'],
            'rsvp_enabled' => ['sometimes', 'boolean'],
            'sections' => ['nullable', 'array'],
            'auto_seat' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['template_key']) && ($resp = $this->guardPremiumTemplate($request, $data['template_key']))) {
            return $resp;
        }

        $publishing = ($data['status'] ?? null) === 'published';

        $invitation->update($data);

        if ($publishing) {
            $this->applyPublishLifecycle($invitation);
        }

        return response()->json($invitation);
    }

    /**
     * Stamp the publish time and, for AFFILIATE-owned free cards, open the 24-hour
     * live window. Non-affiliate owners keep expires_at null (their cards never lapse).
     * Idempotent: never overwrites an existing published_at or an already-set expiry.
     */
    private function applyPublishLifecycle(Invitation $invitation): void
    {
        $dirty = false;

        if (! $invitation->published_at) {
            $invitation->published_at = now();
            $dirty = true;
        }

        // Load the owner to decide whether the 24h affiliate clock applies.
        $owner = $invitation->user;

        if ($owner && $owner->isAffiliate() && ! $invitation->is_paid && ! $invitation->expires_at) {
            $invitation->expires_at = now()->addDay();
            $dirty = true;
        }

        if ($dirty) {
            $invitation->save();
        }
    }

    public function destroy(Request $request, Invitation $invitation)
    {
        $this->authorizeOwner($request, $invitation);
        $invitation->delete();

        return response()->json(['ok' => true]);
    }

    /** PUBLIC — the live card at /e/{slug}. No auth. */
    public function publicShow(string $slug)
    {
        $invitation = Invitation::where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $owner = $invitation->user;
        $ownerBlock = [
            'role' => $owner?->role,
            'company_name' => $owner?->company_name,
            'company_logo' => $owner?->company_logo,
        ];

        // Affiliate free cards go live for 24h; once that window lapses without a
        // payment, hide the card behind an "awaiting payment" gate (still HTTP 200).
        $lapsed = $owner
            && $owner->isAffiliate()
            && ! $invitation->is_paid
            && $invitation->expires_at
            && Carbon::parse($invitation->expires_at)->isPast();

        if ($lapsed) {
            return response()->json([
                'expired' => true,
                'owner' => $ownerBlock,
                'invitation' => [
                    'brideName' => $invitation->bride_name,
                    'groomName' => $invitation->groom_name,
                ],
            ]);
        }

        $invitation->increment('views');

        // Resolve the actual React component to render (a contributed design points
        // at a base component via base_key; built-ins render by their own key).
        $template = Template::where('key', $invitation->template_key)->first();

        return response()->json([
            'id' => $invitation->id,
            'slug' => $invitation->slug,
            'templateKey' => $template?->renderKey() ?? $invitation->template_key,
            'rsvpEnabled' => (bool) $invitation->rsvp_enabled,
            'owner' => $ownerBlock,
            // For a no-code custom design, pass its config so the engine can render it.
            'data' => array_merge($invitation->toCardData(), [
                'templateConfig' => $template && $template->base_key === 'custom' ? $template->config : null,
            ]),
        ]);
    }

    private function guardPremiumTemplate(Request $request, string $templateKey): ?\Illuminate\Http\JsonResponse
    {
        $template = Template::where('key', $templateKey)->first();
        if ($template && $template->tier === 'premium' && ! $request->user()->ownsTemplate($templateKey)) {
            return response()->json([
                'message' => 'Anda belum memiliki rekaan ini. Sila beli rekaan untuk menggunakannya.',
                'requires_upgrade' => true,
                'template_key' => $templateKey,
            ], 403);
        }

        return null;
    }

    private function authorizeOwner(Request $request, Invitation $invitation): void
    {
        abort_unless(
            $invitation->user_id === $request->user()->id || $request->user()->isAdmin(),
            403,
            'Kad ini bukan milik anda.'
        );
    }

    private function uniqueSlug(string $bride, string $groom): string
    {
        $base = Str::slug(Str::of($bride)->explode(' ')->first().'-'.Str::of($groom)->explode(' ')->last());
        $slug = $base;
        while (Invitation::where('slug', $slug)->exists()) {
            $slug = $base.'-'.Str::lower(Str::random(4));
        }

        return $slug;
    }
}
