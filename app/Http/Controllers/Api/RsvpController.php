<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RsvpConfirmation;
use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Services\SeatingService;
use App\Services\SeatNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RsvpController extends Controller
{
    public function __construct(
        private SeatingService $seating,
        private SeatNotifier $notifier,
    ) {}

    /** PUBLIC — a guest submits their RSVP + ucapan on the live card. */
    public function store(Request $request, string $slug)
    {
        $invitation = Invitation::where('slug', $slug)
            ->where('status', 'published')
            ->where('rsvp_enabled', true)
            ->firstOrFail();

        // Ticketed event: an attending guest must pay through the entry flow, so
        // the free RSVP endpoint refuses it (declines stay free — no charge to skip).
        if ($invitation->payPerEntryActive() && $request->input('status') === 'attending') {
            return response()->json([
                'message' => 'Majlis ini memerlukan bayaran untuk mengesahkan kehadiran.',
                'payment_required' => true,
            ], 422);
        }

        // Capacity: refuse a new attending party once the seats would be exceeded.
        if ($request->input('status') === 'attending' && $invitation->seatingFull((int) $request->input('pax', 1))) {
            return response()->json([
                'message' => 'Maaf, semua tempat duduk telah penuh.',
                'seating_full' => true,
                'contact' => $invitation->vendorContact(),
            ], 422);
        }

        // Free-plan guest cap — refuse an attending party once the host's guest
        // allowance would be exceeded. Premium hosts (isPremium covers admins) use
        // premium_guest_limit; 0 = unlimited on either plan.
        if ($request->input('status') === 'attending') {
            $owner = $invitation->user;
            $guestLimit = ($owner && $owner->isPremium())
                ? (int) \App\Models\Setting::get('premium_guest_limit', 0)
                : \App\Models\Setting::freeGuestLimit();
            if ($guestLimit > 0) {
                $current = (int) $invitation->guests()->where('status', 'attending')->sum('pax');
                if ($current + (int) $request->input('pax', 1) > $guestLimit) {
                    return response()->json([
                        'message' => 'Maaf, senarai tetamu untuk majlis ini telah mencapai had.',
                        'guest_limit_reached' => true,
                        'contact' => $invitation->vendorContact(),
                    ], 422);
                }
            }
        }

        // The host decides which contact details a guest is asked for; a field
        // that is asked for is required, since a half-filled contact is worse
        // than none — the host cannot chase a guest they cannot reach.
        $fields = $invitation->rsvpFieldSet();
        $wantsEmail = $fields !== 'phone';
        $wantsPhone = $fields !== 'email';

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => [$wantsPhone ? 'required' : 'nullable', 'string', 'max:30'],
            'email' => [$wantsEmail ? 'required' : 'nullable', 'email', 'max:120'],
            'pax' => ['required', 'integer', 'min:1', 'max:'.\App\Models\Setting::rsvpMaxPax()],
            'status' => ['required', 'in:attending,declined'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $guest = $invitation->guests()->create([
            ...$data,
            'responded_at' => now(),
        ]);

        // Auto-assign a seat during RSVP if the host enabled it.
        if ($invitation->auto_seat && $guest->status === 'attending') {
            $this->seating->assignGuestToFreeSeats($invitation, $guest);
        }

        // This confirmation already carries whatever seat they have, so record it as
        // communicated — otherwise the host's next auto-assign would tell them twice.
        $this->notifier->markNotified($guest, $this->notifier->primaryTableId($invitation, $guest));

        // Email the guest their confirmation (+ seat, if assigned). Never let mail block the RSVP.
        if (! empty($data['email'])) {
            try {
                Mail::to($data['email'])->send(new RsvpConfirmation(
                    $guest->fresh(),
                    $invitation,
                    $this->notifier->seatLabel($invitation, $guest),
                    $this->notifier->seatUrl($invitation, $guest),
                ));
                // Log the hand-off explicitly: silence here used to be ambiguous between
                // "never attempted" and "sent but undelivered", which are very different bugs.
                Log::info('RSVP confirmation handed to mailer', [
                    'guest_id' => $guest->id,
                    'email' => $data['email'],
                    'invitation' => $invitation->slug,
                ]);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json(['ok' => true, 'guest' => $guest], 201);
    }

    /** PUBLIC — recent wishes (ucapan) shown on the live card. */
    public function publicWishes(string $slug)
    {
        $invitation = Invitation::where('slug', $slug)->where('status', 'published')->firstOrFail();

        $wishes = $invitation->guests()
            ->whereNotNull('message')->where('message', '!=', '')
            ->latest()->limit(50)
            ->get(['id', 'name', 'message', 'status', 'created_at']);

        return response()->json($wishes);
    }

    /** Owner — list guests + summary for a card. */
    public function index(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);

        $guests = $invitation->guests()->latest()->get();

        return response()->json([
            'guests' => $guests,
            'summary' => [
                'responses' => $guests->count(),
                'attending' => $guests->where('status', 'attending')->count(),
                'declined' => $guests->where('status', 'declined')->count(),
                'pax' => (int) $guests->where('status', 'attending')->sum('pax'),
                'checked_in' => $guests->where('attended', true)->count(),
            ],
        ]);
    }

    /** Owner — toggle check-in for the big day. */
    public function checkIn(Request $request, RsvpGuest $guest)
    {
        $this->guard($request, $guest->invitation);
        $this->requireFeature($request, 'checkin');
        $attended = ! $guest->attended;
        $guest->update(['attended' => $attended, 'checked_in_at' => $attended ? now() : null]);

        return response()->json($guest);
    }

    /** Owner — QR scan check-in: idempotently mark a guest as attended. */
    public function scan(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);
        $this->requireFeature($request, 'checkin');
        $data = $request->validate(['guest_id' => ['required', 'uuid']]);

        $guest = $invitation->guests()->find($data['guest_id']);
        if (! $guest) {
            return response()->json(['message' => 'Tetamu tidak ditemui untuk majlis ini.'], 404);
        }

        $already = (bool) $guest->attended;
        if (! $already) {
            $guest->update(['attended' => true, 'checked_in_at' => now()]);
        }

        return response()->json(['guest' => $guest->fresh(), 'already' => $already]);
    }

    public function destroyGuest(Request $request, RsvpGuest $guest)
    {
        $this->guard($request, $guest->invitation);
        $guest->delete();

        return response()->json(['ok' => true]);
    }

    /** Owner — CSV export of the guest list. */
    public function export(Request $request, Invitation $invitation): StreamedResponse
    {
        $this->guard($request, $invitation);
        $guests = $invitation->guests()->latest()->get();

        return response()->streamDownload(function () use ($guests) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Nama', 'Telefon', 'Bilangan', 'Status', 'Hadir', 'Ucapan', 'Masa']);
            foreach ($guests as $g) {
                fputcsv($out, [
                    $g->name, $g->phone, $g->pax, $g->status,
                    $g->attended ? 'Ya' : 'Tidak', $g->message,
                    optional($g->responded_at)->format('Y-m-d H:i'),
                ]);
            }
            fclose($out);
        }, 'senarai-tetamu.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Owner — guest data for printable QR passes, behind the qr_passes capability.
     * The passes page previously read the ownership-only guest list, so the paid
     * feature had no server gate; this endpoint enforces it. Payload matches index.
     */
    public function passes(Request $request, Invitation $invitation)
    {
        $this->requireFeature($request, 'qr_passes');

        return $this->index($request, $invitation);
    }

    /**
     * Owner — add a guest by hand.
     *
     * A host knows most of their guest list before anyone RSVPs, and waiting on
     * replies to start seating is backwards. A manually added guest defaults to
     * `attending` so they can be seated immediately; the host can change it.
     */
    public function storeGuest(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'pax' => ['nullable', 'integer', 'min:1', 'max:'.\App\Models\Setting::rsvpMaxPax()],
            'status' => ['nullable', 'in:attending,declined,pending'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        // Free-plan guest cap applies to host-added guests too (not just public RSVPs),
        // otherwise the cap is trivially bypassed from the guest list.
        $status = $data['status'] ?? 'attending';
        $limit = $this->attendingLimit($invitation);
        if ($limit > 0 && $status === 'attending') {
            $current = (int) $invitation->guests()->where('status', 'attending')->sum('pax');
            if ($current + ($data['pax'] ?? 1) > $limit) {
                return response()->json([
                    'message' => 'Senarai tetamu telah mencapai had pelan. Naik taraf untuk menambah lebih ramai.',
                    'guest_limit_reached' => true,
                ], 422);
            }
        }

        $guest = $invitation->guests()->create([
            ...$data,
            'pax' => $data['pax'] ?? 1,
            'status' => $data['status'] ?? 'attending',
            // Recorded by the host rather than answered by the guest, but it is
            // still a decided reply — so the list counts add up.
            'responded_at' => now(),
        ]);

        return response()->json($guest, 201);
    }

    public function updateGuest(Request $request, RsvpGuest $guest)
    {
        $this->guard($request, $guest->invitation);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'pax' => ['sometimes', 'integer', 'min:1', 'max:'.\App\Models\Setting::rsvpMaxPax()],
            'status' => ['sometimes', 'in:attending,declined,pending'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $guest->update($data);

        return response()->json($guest->fresh());
    }

    /**
     * Owner — bulk import from the sheet the host downloaded and filled in.
     *
     * Rows are validated one at a time and reported per row: a list of 200
     * guests with three bad email addresses should import 197 and name the
     * three, not reject the whole file.
     */
    public function importGuests(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        if ($handle === false) {
            return response()->json(['message' => 'Fail tidak dapat dibaca.'], 422);
        }

        $header = fgetcsv($handle);
        // Excel writes a UTF-8 BOM; left in place it corrupts the first column name.
        if (is_array($header) && isset($header[0])) {
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]);
        }

        $cols = self::mapColumns(is_array($header) ? $header : []);
        if (! isset($cols['name'])) {
            fclose($handle);

            return response()->json([
                'message' => 'Lajur "Nama" tidak dijumpai. Sila guna templat yang disediakan.',
            ], 422);
        }

        $imported = 0;
        $errors = [];
        $row = 1;

        // Free-plan guest cap applies to imports too: attending rows stop being added
        // once the allowance is used up (declined/pending rows never count).
        $limit = $this->attendingLimit($invitation);
        $attending = $limit > 0 ? (int) $invitation->guests()->where('status', 'attending')->sum('pax') : 0;
        $cappedSkips = 0;

        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            $get = fn (string $k) => isset($cols[$k]) ? trim((string) ($line[$cols[$k]] ?? '')) : '';

            $name = $get('name');
            if ($name === '') {
                continue; // a blank trailing row is not an error
            }

            $status = strtolower($get('status'));
            $status = match (true) {
                str_starts_with($status, 'tidak'), str_starts_with($status, 'decl') => 'declined',
                str_starts_with($status, 'belum'), str_starts_with($status, 'pend') => 'pending',
                default => 'attending',
            };

            $email = $get('email');
            if ($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = "Baris {$row}: e-mel tidak sah ({$email}).";

                continue;
            }

            $pax = max(1, min(\App\Models\Setting::rsvpMaxPax(), (int) ($get('pax') ?: 1)));
            if ($limit > 0 && $status === 'attending' && $attending + $pax > $limit) {
                $cappedSkips++;

                continue; // past the plan's guest allowance
            }

            $invitation->guests()->create([
                'name' => mb_substr($name, 0, 120),
                'phone' => mb_substr($get('phone'), 0, 30) ?: null,
                'email' => $email ?: null,
                'pax' => $pax,
                'status' => $status,
                'message' => mb_substr($get('message'), 0, 500) ?: null,
                'responded_at' => now(),
            ]);
            if ($status === 'attending') {
                $attending += $pax;
            }
            $imported++;
        }

        fclose($handle);

        if ($cappedSkips > 0) {
            $errors[] = "{$cappedSkips} tetamu tidak diimport kerana had pelan percuma telah dicapai. Naik taraf untuk menambah lebih ramai.";
        }

        return response()->json([
            'imported' => $imported,
            'skipped_cap' => $cappedSkips,
            'errors' => array_slice($errors, 0, 20),
            'error_count' => count($errors),
        ]);
    }

    /** The blank sheet a host downloads, fills in, and uploads back. */
    public function importTemplate(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            // BOM so Excel reads the Malay column names as UTF-8, not mojibake.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Nama', 'Telefon', 'E-mel', 'Bilangan', 'Status', 'Ucapan']);
            fputcsv($out, ['Ahmad bin Ali', '+60123456789', 'ahmad@contoh.com', 2, 'Hadir', 'Tahniah!']);
            fputcsv($out, ['Siti Aminah', '+60198765432', '', 1, 'Tidak Hadir', '']);
            fclose($out);
        }, 'templat-senarai-tetamu.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Match the header row to our fields in either language, ignoring case and
     * spacing — a host should not have to preserve our exact wording.
     *
     * @param  array<int, string>  $header
     * @return array<string, int>
     */
    private static function mapColumns(array $header): array
    {
        $aliases = [
            'name' => ['nama', 'name', 'guest', 'tetamu'],
            'phone' => ['telefon', 'phone', 'no. telefon', 'no telefon', 'mobile'],
            'email' => ['e-mel', 'emel', 'email', 'e-mail'],
            'pax' => ['bilangan', 'pax', 'jumlah', 'guests'],
            'status' => ['status', 'kehadiran', 'attendance'],
            'message' => ['ucapan', 'message', 'nota', 'note'],
        ];

        $cols = [];
        foreach ($header as $i => $raw) {
            $key = strtolower(trim((string) $raw));
            foreach ($aliases as $field => $names) {
                if (in_array($key, $names, true)) {
                    $cols[$field] = $i;
                    break;
                }
            }
        }

        return $cols;
    }

    /**
     * Capability gate, separate from the ownership gate above.
     *
     * Owning the card is not the same as being allowed to use every tool on it:
     * a normal user owns their invitation and sees its RSVP list, but check-in
     * and QR passes are subscription features.
     */
    private function requireFeature(Request $request, string $feature): void
    {
        abort_unless(
            $request->user()->hasFeature($feature),
            403,
            'Ciri ini tersedia untuk akaun Vendor dan Affiliate.'
        );
    }

    /** Attending-guest allowance for a card's owner (premium vs free); 0 = unlimited. */
    private function attendingLimit(Invitation $invitation): int
    {
        $owner = $invitation->user;

        return ($owner && $owner->isPremium())
            ? (int) \App\Models\Setting::get('premium_guest_limit', 0)
            : \App\Models\Setting::freeGuestLimit();
    }

    private function guard(Request $request, Invitation $invitation): void
    {
        abort_unless(
            $invitation->user_id === $request->user()->id || $request->user()->isAdmin(),
            403
        );
    }
}
