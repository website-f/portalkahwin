<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Template;
use Illuminate\Http\Request;
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

        $invitation = $request->user()->invitations()->create([
            'template_key' => $data['template_key'],
            'groom_name' => $data['groom_name'],
            'bride_name' => $data['bride_name'],
            'groom_short' => Str::of($data['groom_name'])->explode(' ')->last(),
            'bride_short' => Str::of($data['bride_name'])->explode(' ')->first(),
            'slug' => $this->uniqueSlug($data['bride_name'], $data['groom_name']),
            'status' => 'draft',
            'bismillah' => true,
            'rsvp_enabled' => true,
            'opening_line' => 'Dengan penuh kesyukuran, kami menjemput Tuan/Puan ke majlis perkahwinan anakanda kami',
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
            'gallery_images' => ['nullable', 'array'],
            'music_url' => ['nullable', 'string', 'max:500'],
            'palette' => ['nullable', 'array'],
            'rsvp_enabled' => ['sometimes', 'boolean'],
            'auto_seat' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['template_key']) && ($resp = $this->guardPremiumTemplate($request, $data['template_key']))) {
            return $resp;
        }

        $invitation->update($data);

        return response()->json($invitation);
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

        $invitation->increment('views');

        return response()->json([
            'id' => $invitation->id,
            'slug' => $invitation->slug,
            'templateKey' => $invitation->template_key,
            'rsvpEnabled' => (bool) $invitation->rsvp_enabled,
            'data' => $invitation->toCardData(),
        ]);
    }

    private function guardPremiumTemplate(Request $request, string $templateKey): ?\Illuminate\Http\JsonResponse
    {
        $template = Template::where('key', $templateKey)->first();
        if ($template && $template->tier === 'premium' && ! $request->user()->isPremium()) {
            return response()->json([
                'message' => 'Templat ini eksklusif untuk pelan Premium. Sila naik taraf untuk menggunakannya.',
                'requires_upgrade' => true,
            ], 403);
        }

        return null;
    }

    private function authorizeOwner(Request $request, Invitation $invitation): void
    {
        abort_unless(
            $invitation->user_id === $request->user()->id || $request->user()->isAdmin(),
            403,
            'Bukan kad anda.'
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
