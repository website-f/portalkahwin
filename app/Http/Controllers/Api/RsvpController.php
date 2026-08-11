<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RsvpConfirmation;
use App\Models\Invitation;
use App\Models\RsvpGuest;
use App\Models\Seat;
use App\Services\SeatingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RsvpController extends Controller
{
    public function __construct(private SeatingService $seating) {}

    /** PUBLIC — a guest submits their RSVP + ucapan on the live card. */
    public function store(Request $request, string $slug)
    {
        $invitation = Invitation::where('slug', $slug)
            ->where('status', 'published')
            ->where('rsvp_enabled', true)
            ->firstOrFail();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'pax' => ['required', 'integer', 'min:1', 'max:20'],
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

        // Email the guest their confirmation (+ seat, if assigned). Never let mail block the RSVP.
        if (! empty($data['email'])) {
            try {
                Mail::to($data['email'])->send(new RsvpConfirmation($guest->fresh(), $invitation, $this->seatInfo($invitation, $guest)));
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

    /** Human-readable seat location for a guest, e.g. "Meja 2 (kerusi 3, 4)" — null if unseated. */
    private function seatInfo(Invitation $invitation, RsvpGuest $guest): ?string
    {
        $seats = Seat::with('table:id,label')
            ->whereHas('table', fn ($q) => $q->where('invitation_id', $invitation->id))
            ->where('rsvp_guest_id', $guest->id)
            ->orderBy('seat_index')
            ->get();

        if ($seats->isEmpty()) {
            return null;
        }

        $label = optional($seats->first()->table)->label ?? 'Meja';
        $nums = $seats->map(fn ($s) => $s->seat_index + 1)->implode(', ');

        return "{$label} (kerusi {$nums})";
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
        $attended = ! $guest->attended;
        $guest->update(['attended' => $attended, 'checked_in_at' => $attended ? now() : null]);

        return response()->json($guest);
    }

    /** Owner — QR scan check-in: idempotently mark a guest as attended. */
    public function scan(Request $request, Invitation $invitation)
    {
        $this->guard($request, $invitation);
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

    private function guard(Request $request, Invitation $invitation): void
    {
        abort_unless(
            $invitation->user_id === $request->user()->id || $request->user()->isAdmin(),
            403
        );
    }
}
