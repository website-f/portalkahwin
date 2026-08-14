<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Setting;
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\JsonResponse;
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

        $template = Template::where('key', $data['template_key'])->first();
        $state = $this->resolveCardState($request->user(), $template);

        // Buy-first flow with no held credit → must purchase before creating.
        if ($state['blocked']) {
            return response()->json([
                'message' => 'Anda belum memiliki rekaan ini. Sila beli rekaan untuk menggunakannya.',
                'requires_upgrade' => true,
                'template_key' => $data['template_key'],
            ], 403);
        }

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
            'is_trial' => $state['is_trial'],
            'is_paid' => $state['is_paid'],
            'bismillah' => true,
            'rsvp_enabled' => true,
            'opening_line' => 'Dengan penuh rasa syukur, kami berbesar hati menjemput Tuan/Puan ke majlis perkahwinan anakanda kami',
        ]);

        Template::where('key', $data['template_key'])->increment('usage_count');

        return response()->json($invitation, 201);
    }

    /**
     * Create a card from a guest's TRIAL editor content once they log in (Logic 2).
     * Published immediately so the shareable preview link works, but watermarked +
     * view-limited (is_trial) until the host pays to publish.
     */
    public function trialStore(Request $request)
    {
        $data = $request->validate([
            'template_key' => ['required', 'string', 'exists:templates,key'],
            'groom_name' => ['required', 'string', 'max:120'],
            'bride_name' => ['required', 'string', 'max:120'],
            'groom_short' => ['nullable', 'string', 'max:60'],
            'bride_short' => ['nullable', 'string', 'max:60'],
            'groom_parents' => ['nullable', 'string', 'max:200'],
            'bride_parents' => ['nullable', 'string', 'max:200'],
            'opening_line' => ['nullable', 'string', 'max:500'],
            'bismillah' => ['sometimes', 'boolean'],
            'date_label' => ['nullable', 'string', 'max:120'],
            'time_label' => ['nullable', 'string', 'max:120'],
            'hijri_label' => ['nullable', 'string', 'max:120'],
            'akad_at' => ['nullable', 'date'],
            'reception_at' => ['nullable', 'date'],
            'venue_name' => ['nullable', 'string', 'max:200'],
            'venue_address' => ['nullable', 'string', 'max:300'],
            'maps_url' => ['nullable', 'string', 'max:500'],
            'waze_url' => ['nullable', 'string', 'max:500'],
            'program' => ['nullable', 'array'],
            'contacts' => ['nullable', 'array'],
            'gift' => ['nullable', 'array'],
        ]);

        $template = Template::where('key', $data['template_key'])->first();
        $state = $this->resolveCardState($request->user(), $template);
        if ($state['blocked']) {
            return response()->json([
                'message' => 'Anda belum memiliki rekaan ini. Sila beli rekaan untuk menggunakannya.',
                'requires_upgrade' => true,
                'template_key' => $data['template_key'],
            ], 403);
        }

        $invitation = $request->user()->invitations()->create(array_merge(
            $data,
            [
                'palette' => $template?->palette,
                'groom_short' => $data['groom_short'] ?? Str::of($data['groom_name'])->explode(' ')->last(),
                'bride_short' => $data['bride_short'] ?? Str::of($data['bride_name'])->explode(' ')->first(),
                'slug' => $this->uniqueSlug($data['bride_name'], $data['groom_name']),
                // Published so the preview link is live; watermarked while it's a trial.
                'status' => 'published',
                'published_at' => now(),
                'is_trial' => $state['is_trial'],
                'is_paid' => $state['is_paid'],
                'rsvp_enabled' => true,
            ],
        ));

        Template::where('key', $data['template_key'])->increment('usage_count');

        return response()->json($invitation, 201);
    }

    /**
     * A new card's paid/trial state under the current flow.
     *
     * @return array{is_trial:bool, is_paid:bool, blocked:bool}
     */
    private function resolveCardState(User $user, ?Template $template): array
    {
        // Free designs (or a missing template) and privileged accounts publish normally.
        if (! $template || $template->tier !== 'premium' || $user->isPremium()) {
            return ['is_trial' => false, 'is_paid' => false, 'blocked' => false];
        }
        // A held credit becomes a normal paid card (consumes the credit).
        if ($user->availableTemplateCredits($template->key) > 0) {
            return ['is_trial' => false, 'is_paid' => true, 'blocked' => false];
        }
        // No credit: buy-first blocks; trial-first makes a watermarked trial card.
        if (Setting::get('signup_flow', 'trial') === 'buy') {
            return ['is_trial' => false, 'is_paid' => false, 'blocked' => true];
        }

        return ['is_trial' => true, 'is_paid' => false, 'blocked' => false];
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

        // Edit limit: cap how many times a card can be edited so one purchase can't
        // be repurposed for another wedding. 0 = unlimited; staff/premium bypass.
        $limit = (int) Setting::get('card_edit_limit', 0);
        $capped = $limit > 0 && ! $request->user()->isAdmin() && ! $request->user()->isPremium();
        if ($capped && $invitation->edit_count >= $limit) {
            return response()->json([
                'message' => 'Anda telah mencapai had suntingan untuk kad ini. Sila beli rekaan sekali lagi untuk majlis yang baharu.',
                'edit_limit_reached' => true,
                'edit_count' => (int) $invitation->edit_count,
                'edit_limit' => $limit,
            ], 403);
        }

        $data = $request->validate([
            // template_key is deliberately NOT updatable: a card's design is
            // chosen once, at creation. Allowing a swap meant a paid design
            // could be adopted after the fact, and any already-shared link
            // would silently change appearance under the guests looking at it.
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
            // A filename only — never a path, so it cannot escape public/lottie.
            'motion_file' => ['nullable', 'string', 'max:120', 'regex:/^[A-Za-z0-9._-]+\.json$/'],
            'motion_tint' => ['sometimes', 'boolean'],
            'palette' => ['nullable', 'array'],
            'font_id' => ['nullable', 'string', 'max:40'],
            'rsvp_enabled' => ['sometimes', 'boolean'],
            'rsvp_fields' => ['sometimes', 'in:both,email,phone'],
            'invite_side' => ['sometimes', 'in:groom,bride,both_groom,both_bride,two_couples'],
            'sections' => ['nullable', 'array'],
            'section_order' => ['nullable', 'array'],
            'section_order.*' => ['string'],
            'auto_seat' => ['sometimes', 'boolean'],
        ]);

        $publishing = ($data['status'] ?? null) === 'published';

        $invitation->update($data);

        // Any content-bearing save counts as one edit (drives the cap + monitoring).
        $invitation->increment('edit_count');

        if ($publishing) {
            $this->applyPublishLifecycle($invitation);
        }

        return response()->json($invitation->fresh());
    }

    /**
     * Stamp the publish time. Cards never lapse — affiliates now behave like normal
     * users, so there is no per-role live window. Idempotent: never overwrites an
     * existing published_at.
     */
    private function applyPublishLifecycle(Invitation $invitation): void
    {
        $dirty = false;

        if (! $invitation->published_at) {
            $invitation->published_at = now();
            $dirty = true;
        }

        // Affiliates now behave exactly like normal users — no 24h expiry window;
        // their cards go live and stay live once paid, just like everyone else.

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

        // A trial/test card is a real preview but watermarked + view-limited until the
        // host pays to publish — so a shared trial link can't quietly become a free card.
        $trial = $invitation->is_trial && ! $invitation->is_paid;

        if ($trial) {
            $viewLimit = (int) Setting::get('trial_view_limit', 5);
            if ($viewLimit > 0 && $invitation->trial_views >= $viewLimit) {
                return response()->json([
                    'trial_exhausted' => true,
                    'owner' => $ownerBlock,
                    'invitation' => [
                        'brideName' => $invitation->bride_name,
                        'groomName' => $invitation->groom_name,
                    ],
                ]);
            }
            $invitation->increment('trial_views');
        } else {
            $invitation->increment('views');
        }

        // Resolve the actual React component to render (a contributed design points
        // at a base component via base_key; built-ins render by their own key).
        $template = Template::where('key', $invitation->template_key)->first();

        return response()->json([
            'id' => $invitation->id,
            'slug' => $invitation->slug,
            'templateKey' => $template?->renderKey() ?? $invitation->template_key,
            'rsvpEnabled' => (bool) $invitation->rsvp_enabled,
            'rsvpFields' => $invitation->rsvpFieldSet(),
            'owner' => $ownerBlock,
            // When true the SPA overlays a "PREVIEW" watermark + disables real RSVP.
            'trial' => $trial,
            // For a no-code custom design, pass its config so the engine can render it.
            'data' => array_merge($invitation->toCardData(), [
                'templateConfig' => $template && $template->base_key === 'custom' ? $template->config : null,
            ]),
        ]);
    }

    private function guardPremiumTemplate(Request $request, string $templateKey): ?JsonResponse
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
