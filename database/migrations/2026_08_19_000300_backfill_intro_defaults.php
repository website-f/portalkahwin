<?php

use App\Models\Invitation;
use Illuminate\Database\Migrations\Migration;

/**
 * Backfill the intro defaults onto EXISTING wedding cards.
 *
 * New cards get these from InvitationController::store(), but cards created
 * before these fields existed have null values, so the editor shows empty
 * fields the host would otherwise have to fill from scratch. This one-time
 * pass fills each field ONLY when it is currently blank (host-entered content
 * is never overwritten), and lifts any legacy free-text parents string into the
 * structured father/mother shape so the editor shows it too.
 */
return new class extends Migration
{
    public function up(): void
    {
        $walimah = 'Jemputan Walimatulurus';
        $hostsIntro = "Assalamualaikum W.B.T & Salam Sejahtera\nDengan penuh kesyukuran ke hadrat Ilahi dan izin Allah SWT, kami";
        $opening = "Dengan penuh kesyukuran, kami mempersilakan\nDato' | Datin | Tuan | Puan | Encik | Cik\nseisi keluarga hadir ke majlis perkahwinan anakanda kami";
        $prayer = "﷽\nYa Allah ya Tuhan Kami, Sempena meraikan majlis perkahwinan, kami memohon restu-Mu agar berkatilah majlis ini, limpahkan berkat dan rahmatilah pasangan suami isteri ini. Jadikanlah rumah tangga mereka bahagia dalam ketaatan terhadap-Mu. Kurniakanlah kepada mereka zuriat yang sempurna, beriman dan beramal soleh. Ya Allah, murahkanlah rezeki kedua mereka, panjangkan umur mereka, dekatkanlah mereka kepada kebaikan, jauhkanlah mereka dari keburukan, kurniakanlah mereka kesenangan di dunia dan akhirat. Sempurnakanlah agama mereka dan berkat ikatan ini. Amin Ya Rabbal Alamin";

        // Split a legacy "Father & Mother" string into structured parents.
        $mk = function (?string $s): ?array {
            $parts = array_values(array_filter(array_map('trim', preg_split('/\s+&\s+/', (string) $s))));
            if (! $parts) return null;
            return ['father' => $parts[0] ?? '', 'mother' => $parts[1] ?? '', 'show' => count($parts) > 1 ? 'both' : 'father'];
        };

        Invitation::query()
            ->where(fn ($q) => $q->whereNull('kind')->orWhere('kind', 'wedding'))
            ->chunkById(200, function ($cards) use ($walimah, $hostsIntro, $opening, $prayer, $mk) {
                foreach ($cards as $inv) {
                    $dirty = false;

                    if (blank($inv->walimah_label)) { $inv->walimah_label = $walimah; $dirty = true; }
                    if (blank($inv->hosts_intro)) { $inv->hosts_intro = $hostsIntro; $dirty = true; }
                    if (blank($inv->opening_line)) { $inv->opening_line = $opening; $dirty = true; }
                    if (blank($inv->prayer)) { $inv->prayer = $prayer; $dirty = true; }

                    if (empty($inv->parents) && (filled($inv->groom_parents) || filled($inv->bride_parents))) {
                        $parents = [];
                        if (filled($inv->groom_parents)) $parents['groom'] = $mk($inv->groom_parents);
                        if (filled($inv->bride_parents)) $parents['bride'] = $mk($inv->bride_parents);
                        $parents = array_filter($parents);
                        if ($parents) { $inv->parents = $parents; $dirty = true; }
                    }

                    if ($dirty) $inv->saveQuietly();
                }
            });
    }

    public function down(): void
    {
        // One-way data backfill; nothing to reverse safely.
    }
};
