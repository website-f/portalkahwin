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
        // A card's kind follows the template it's created from — an event template
        // makes an event card (event_name, no couple), everything else a wedding.
        $template = Template::where('key', $request->input('template_key'))->first();
        $isEvent = ($template?->kind ?? 'wedding') === 'event';

        $data = $request->validate($isEvent ? [
            'template_key' => ['required', 'string', 'exists:templates,key'],
            'event_name' => ['required', 'string', 'max:160'],
        ] : [
            'template_key' => ['required', 'string', 'exists:templates,key'],
            'groom_name' => ['required', 'string', 'max:120'],
            'bride_name' => ['required', 'string', 'max:120'],
        ]);

        // Free-plan card cap — a non-premium user may hold only so many UNPAID
        // cards (paid cards never count, so buying always lets them make more).
        $user = $request->user();
        $cardLimit = Setting::freeCardLimit();
        if ($cardLimit > 0 && ! $user->isAdmin() && ! $user->isPremium()) {
            $held = $user->invitations()->where('is_paid', false)->count();
            if ($held >= $cardLimit) {
                return response()->json([
                    'message' => "Pelan percuma dihadkan kepada {$cardLimit} kad. Bayar untuk menerbitkan kad sedia ada atau naik taraf untuk mencipta lebih banyak.",
                    'requires_upgrade' => true,
                    'limit' => $cardLimit,
                ], 403);
            }
        }

        $state = $this->resolveCardState($request->user(), $template);

        // Buy-first flow with no held credit → must purchase before creating.
        if ($state['blocked']) {
            return response()->json([
                'message' => 'Anda belum memiliki rekaan ini. Sila beli rekaan untuk menggunakannya.',
                'requires_upgrade' => true,
                'template_key' => $data['template_key'],
            ], 403);
        }

        $common = [
            'template_key' => $data['template_key'],
            'kind' => $isEvent ? 'event' : 'wedding',
            // A contributed design carries its own palette; adopt it so the base component re-skins.
            'palette' => $template?->palette,
            'status' => 'draft',
            'is_trial' => $state['is_trial'],
            'is_paid' => $state['is_paid'],
            'rsvp_enabled' => true,
        ];

        $fields = $isEvent ? [
            // NOT NULL couple columns are satisfied with blanks for events.
            'groom_name' => '', 'bride_name' => '',
            'event_name' => $data['event_name'],
            'slug' => $this->uniqueSlug($data['event_name'], $data['event_name']),
        ] : [
            'groom_name' => $data['groom_name'],
            'bride_name' => $data['bride_name'],
            'groom_short' => Str::of($data['groom_name'])->explode(' ')->last(),
            'bride_short' => Str::of($data['bride_name'])->explode(' ')->first(),
            'slug' => $this->uniqueSlug($data['bride_name'], $data['groom_name']),
            'bismillah' => true,
            'walimah_label' => 'Jemputan Walimatulurus',
            'opening_line' => "Dengan penuh kesyukuran, kami mempersilakan\nDato' | Datin | Tuan | Puan | Encik | Cik\nseisi keluarga hadir ke majlis perkahwinan anakanda kami",
            'prayer' => "﷽\nYa Allah ya Tuhan Kami, Sempena meraikan majlis perkahwinan, kami memohon restu-Mu agar berkatilah majlis ini, limpahkan berkat dan rahmatilah pasangan suami isteri ini. Jadikanlah rumah tangga mereka bahagia dalam ketaatan terhadap-Mu. Kurniakanlah kepada mereka zuriat yang sempurna, beriman dan beramal soleh. Ya Allah, murahkanlah rezeki kedua mereka, panjangkan umur mereka, dekatkanlah mereka kepada kebaikan, jauhkanlah mereka dari keburukan, kurniakanlah mereka kesenangan di dunia dan akhirat. Sempurnakanlah agama mereka dan berkat ikatan ini. Amin Ya Rabbal Alamin",
        ];

        $invitation = $request->user()->invitations()->create($common + $fields);

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
            'prayer' => ['nullable', 'string', 'max:900'],
            'bismillah_text' => ['sometimes', 'nullable', 'string', 'max:200'],
            'walimah_label' => ['sometimes', 'nullable', 'string', 'max:120'],
            'parents' => ['sometimes', 'nullable', 'array'],
            'parents.groom' => ['sometimes', 'nullable', 'array'],
            'parents.groom.father' => ['nullable', 'string', 'max:120'],
            'parents.groom.mother' => ['nullable', 'string', 'max:120'],
            'parents.groom.show' => ['nullable', 'in:both,father,mother'],
            'parents.bride' => ['sometimes', 'nullable', 'array'],
            'parents.bride.father' => ['nullable', 'string', 'max:120'],
            'parents.bride.mother' => ['nullable', 'string', 'max:120'],
            'parents.bride.show' => ['nullable', 'in:both,father,mother'],
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
            // Reseller "billed to" name (affiliate + reseller mode only; gated below).
            'client_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            // Event (non-wedding) fields — a card's `kind` is fixed at creation like
            // template_key, so it isn't updatable here; only its content is.
            'event_type' => ['nullable', 'string', 'max:60'],
            'event_name' => ['nullable', 'string', 'max:160'],
            'event_subtitle' => ['nullable', 'string', 'max:200'],
            'event_description' => ['nullable', 'string', 'max:4000'],
            'custom_fields' => ['nullable', 'array', 'max:30'],
            'custom_fields.*.label' => ['required', 'string', 'max:80'],
            'custom_fields.*.value' => ['nullable', 'string', 'max:600'],
            'event_outro' => ['nullable', 'string', 'max:2000'],
            'poster_image' => ['nullable', 'string', 'max:500'],
            'organizer' => ['nullable', 'string', 'max:200'],
            // Nullable: an EVENT card carries no couple, so it saves these blank/null.
            'groom_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'bride_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'groom_short' => ['nullable', 'string', 'max:60'],
            'bride_short' => ['nullable', 'string', 'max:60'],
            'groom_parents' => ['nullable', 'string', 'max:200'],
            'bride_parents' => ['nullable', 'string', 'max:200'],
            'opening_line' => ['nullable', 'string', 'max:500'],
            'prayer' => ['nullable', 'string', 'max:900'],
            'bismillah_text' => ['sometimes', 'nullable', 'string', 'max:200'],
            'walimah_label' => ['sometimes', 'nullable', 'string', 'max:120'],
            'parents' => ['sometimes', 'nullable', 'array'],
            'parents.groom' => ['sometimes', 'nullable', 'array'],
            'parents.groom.father' => ['nullable', 'string', 'max:120'],
            'parents.groom.mother' => ['nullable', 'string', 'max:120'],
            'parents.groom.show' => ['nullable', 'in:both,father,mother'],
            'parents.bride' => ['sometimes', 'nullable', 'array'],
            'parents.bride.father' => ['nullable', 'string', 'max:120'],
            'parents.bride.mother' => ['nullable', 'string', 'max:120'],
            'parents.bride.show' => ['nullable', 'in:both,father,mother'],
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
            'wishes_layout' => ['sometimes', 'in:carousel,list'],
            'gallery_images' => ['nullable', 'array'],
            'music_url' => ['nullable', 'string', 'max:500'],
            // Trim window copied from the chosen preset (or the host's own trim).
            'music_start' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'music_end' => ['sometimes', 'nullable', 'integer', 'min:0'],
            // A filename only — never a path, so it cannot escape public/lottie.
            'motion_file' => ['nullable', 'string', 'max:120', 'regex:/^[A-Za-z0-9._-]+\.json$/'],
            'motion_tint' => ['sometimes', 'boolean'],
            'palette' => ['nullable', 'array'],
            'font_id' => ['nullable', 'string', 'max:40'],
            'rsvp_enabled' => ['sometimes', 'boolean'],
            'rsvp_fields' => ['sometimes', 'in:both,email,phone'],
            // Pay-per-entry (vendor ticketed events) — see the gate below.
            'rsvp_pay_enabled' => ['sometimes', 'boolean'],
            'rsvp_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100000'],
            'rsvp_tax_percent' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'invite_side' => ['sometimes', 'in:groom,bride,both_groom,both_bride,two_couples'],
            'sections' => ['nullable', 'array'],
            'section_order' => ['nullable', 'array'],
            'section_order.*' => ['string'],
            'auto_seat' => ['sometimes', 'boolean'],
            // Flexible seating cap (0/null = uncapped or governed by the table layout).
            'seat_limit' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000'],
        ]);

        // Charging guests to RSVP is a vendor-only capability behind the master
        // switch — never let the pay fields land on a card that isn't eligible.
        $owner = $invitation->user;
        if (! ($owner && $owner->canPayPerEntry())) {
            unset($data['rsvp_pay_enabled'], $data['rsvp_price'], $data['rsvp_tax_percent']);
        }

        // Reseller "billed to" is affiliate-only, behind the reseller master switch.
        if (! ($owner && $owner->role === 'affiliate' && Setting::get('affiliate_reseller_enabled', 'false') === 'true')) {
            unset($data['client_name']);
        }

        // The couple columns are NOT NULL. An EVENT card sends them blank, and
        // ConvertEmptyStringsToNull turns '' into null on the way in — coalesce back
        // to '' so the save doesn't violate the constraint.
        foreach (['groom_name', 'bride_name'] as $k) {
            if (array_key_exists($k, $data) && $data[$k] === null) {
                $data[$k] = '';
            }
        }

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
            // Ticketed events: when active, the RSVP form charges price×pax through
            // the gateway before issuing the guest's pass. (Platform charges are
            // deducted from the vendor's payout, not added to what the guest pays.)
            'rsvpPay' => $invitation->payPerEntryActive() ? [
                'enabled' => true,
                'price' => (float) $invitation->rsvp_price,
                'currency' => config('services.hitpay.currency', 'MYR'),
            ] : null,
            // Seating capacity status (present only when the event is capped) so the
            // RSVP form can show a "full — contact the host" state before submitting.
            'seating' => (function () use ($invitation) {
                $cap = $invitation->seatCapacity();
                if ($cap === null) {
                    return null;
                }
                $full = $invitation->seatingFull(1);

                return [
                    'capacity' => $cap,
                    'taken' => $invitation->seatsTaken(),
                    'full' => $full,
                    'contact' => $full ? $invitation->vendorContact() : null,
                ];
            })(),
            'owner' => $ownerBlock,
            // When true the SPA overlays a "PREVIEW" watermark + disables real RSVP.
            'trial' => $trial,
            // For a no-code custom design (and event designs, which carry their
            // theme in config), pass the template config so the engine can render it.
            'data' => array_merge($invitation->toCardData(), [
                'templateConfig' => $template && in_array($template->base_key, ['custom', 'eventposter'], true) ? $template->config : null,
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
