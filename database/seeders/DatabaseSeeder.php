<?php

namespace Database\Seeders;

use App\Models\Invitation;
use App\Models\Template;
use App\Models\User;
use App\Models\VisitorEvent;
use App\Services\SeatingService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ---------------- Templates ----------------
        $templates = [
            ['key' => 'floral', 'name' => 'Floral Serenity', 'category' => 'floral', 'tier' => 'free', 'price_myr' => 0, 'sort_order' => 1,
                'description' => 'Bunga-bungaan lembut dengan sentuhan emas — mekar perlahan ketika ditatal.',
                'palette' => ['primary' => '#5b3a2e', 'secondary' => '#8a6d5f', 'accent' => '#c9a24b', 'bg' => '#f6efe6', 'text' => '#4a3b33']],
            ['key' => 'curtain', 'name' => 'Grand Reveal', 'category' => 'motion', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 2,
                'description' => 'Tirai pentas terbuka mendedahkan nama pengantin — mewah & sinematik.',
                'palette' => ['primary' => '#f4e9c8', 'secondary' => '#caa24a', 'accent' => '#d4af37', 'bg' => '#140f0a', 'text' => '#efe6d0']],
            ['key' => 'khat', 'name' => 'Khat Zamrud', 'category' => 'khat', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 3,
                'description' => 'Kaligrafi & corak geometri Islam zamrud-emas yang melukis sendiri.',
                'palette' => ['primary' => '#f4ecd0', 'secondary' => '#c9a24b', 'accent' => '#d4af37', 'bg' => '#0f3d2e', 'text' => '#eaf3ea']],
            ['key' => 'songket', 'name' => 'Songket Diraja', 'category' => 'songket', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 4,
                'description' => 'Tenunan songket & pucuk rebung tradisi Melayu — merah marun & emas.',
                'palette' => ['primary' => '#f6e3c8', 'secondary' => '#e0b24a', 'accent' => '#d4af37', 'bg' => '#5b1620', 'text' => '#f7e9dc']],
        ];
        foreach ($templates as $t) {
            Template::updateOrCreate(['key' => $t['key']], $t);
        }

        // ---------------- Admins ----------------
        User::updateOrCreate(['email' => 'admin@portalkahwin.test'],
            ['name' => 'Super Admin', 'password' => 'password123', 'role' => 'admin', 'is_active' => true]);
        User::updateOrCreate(['email' => 'staff@portalkahwin.test'],
            ['name' => 'Admin Sokongan', 'password' => 'password123', 'role' => 'admin', 'is_active' => true]);

        // ---------------- Users ----------------
        $demo = User::updateOrCreate(['email' => 'demo@portalkahwin.test'],
            ['name' => 'Aisyah & Danial', 'password' => 'password123', 'role' => 'user', 'plan' => 'free', 'phone' => '+60123456789', 'is_active' => true]);
        $premium = User::updateOrCreate(['email' => 'premium@portalkahwin.test'],
            ['name' => 'Nadia & Firdaus', 'password' => 'password123', 'role' => 'user', 'plan' => 'premium', 'plan_expires_at' => now()->addYear(), 'phone' => '+60177778888', 'is_active' => true]);
        $planner = User::updateOrCreate(['email' => 'planner@portalkahwin.test'],
            ['name' => 'Studio Warna Events', 'password' => 'password123', 'role' => 'user', 'plan' => 'premium', 'plan_expires_at' => now()->addYear(), 'phone' => '+60199990000', 'is_active' => true]);
        $siti = User::updateOrCreate(['email' => 'siti@portalkahwin.test'],
            ['name' => 'Siti Sarah', 'password' => 'password123', 'role' => 'user', 'plan' => 'free', 'phone' => '+60161112222', 'is_active' => true]);

        // ---------------- Cards ----------------
        $seating = app(SeatingService::class);

        // Demo — floral, published, with RSVPs + seating
        $inv = $this->card($demo, [
            'slug' => 'aisyah-danial', 'template_key' => 'floral', 'status' => 'published',
            'groom_name' => 'Muhammad Danial', 'bride_name' => 'Nur Aisyah', 'groom_short' => 'Danial', 'bride_short' => 'Aisyah',
            'groom_parents' => 'Bin Encik Ahmad Faizal & Puan Rohana', 'bride_parents' => 'Binti Encik Kamarul & Puan Zaleha',
            'date_label' => 'Sabtu, 12 Disember 2026', 'time_label' => '12:00 tengah hari – 4:00 petang', 'hijri_label' => '22 Jamadilakhir 1448H',
            'venue_name' => 'Dewan Seri Melati', 'venue_address' => 'Jalan Mawar 3, Taman Indah, 43000 Kajang, Selangor',
            'reception_at' => now()->addDays(60)->setTime(12, 0),
        ], [
            ['Farah & keluarga', '+60111111111', 4, 'attending', 'Tahniah! Semoga berbahagia ke Jannah'],
            ['Hakim', '+60122222222', 2, 'attending', 'InsyaAllah hadir!'],
            ['Sofia', '+60133333333', 1, 'declined', 'Maaf tak dapat hadir, doakan dari jauh.'],
            ['Zulkifli sekeluarga', '+60144444444', 3, 'attending', 'Barakallah!'],
        ]);
        foreach ([['Meja 1', 70, 70], ['Meja 2', 330, 70]] as [$label, $x, $y]) {
            $t = $inv->tables()->create(['label' => $label, 'capacity' => 8, 'pos_x' => $x, 'pos_y' => $y, 'sort' => $inv->tables()->count()]);
            $t->syncSeats();
        }
        $seating->autoAssignAll($inv);

        // Premium — khat, published
        $this->card($premium, [
            'slug' => 'nadia-firdaus', 'template_key' => 'khat', 'status' => 'published',
            'groom_name' => 'Ahmad Firdaus', 'bride_name' => 'Nadia Hana', 'groom_short' => 'Firdaus', 'bride_short' => 'Nadia',
            'groom_parents' => 'Bin Dato’ Ismail & Datin Sofia', 'bride_parents' => 'Binti Encik Rahman & Puan Aminah',
            'date_label' => 'Ahad, 8 November 2026', 'time_label' => '11:00 pagi – 3:00 petang', 'hijri_label' => '18 Jamadilawal 1448H',
            'venue_name' => 'Dewan Perdana Felda', 'venue_address' => 'Jalan Gurney, 54000 Kuala Lumpur',
            'reception_at' => now()->addDays(35)->setTime(11, 0),
        ], [
            ['Iman & pasangan', '+60155555555', 2, 'attending', 'Semoga kekal bahagia hingga ke syurga.'],
            ['Danish', '+60166666666', 1, 'attending', 'Tahniah kalian!'],
        ]);

        // Planner — songket published + curtain draft
        $this->card($planner, [
            'slug' => 'majlis-warna', 'template_key' => 'songket', 'status' => 'published',
            'groom_name' => 'Tengku Arif', 'bride_name' => 'Puteri Balqis', 'groom_short' => 'Arif', 'bride_short' => 'Balqis',
            'date_label' => 'Sabtu, 20 Februari 2027', 'time_label' => '12:00 tengah hari – 5:00 petang',
            'venue_name' => 'Istana Hotel Grand Ballroom', 'venue_address' => 'Jalan Raja Chulan, 50200 Kuala Lumpur',
            'reception_at' => now()->addDays(120)->setTime(12, 0),
        ], [
            ['Keluarga Tengku', '+60188888888', 6, 'attending', 'Selamat pengantin baharu!'],
        ]);
        $this->card($planner, [
            'slug' => 'draf-planner-'.Str::lower(Str::random(4)), 'template_key' => 'curtain', 'status' => 'draft',
            'groom_name' => 'Haziq Danial', 'bride_name' => 'Alia Sofea', 'groom_short' => 'Haziq', 'bride_short' => 'Alia',
            'reception_at' => now()->addDays(90)->setTime(20, 0),
        ], []);

        // Siti — floral draft
        $this->card($siti, [
            'slug' => 'siti-draf-'.Str::lower(Str::random(4)), 'template_key' => 'floral', 'status' => 'draft',
            'groom_name' => 'Amir Hakim', 'bride_name' => 'Siti Sarah', 'groom_short' => 'Amir', 'bride_short' => 'Sarah',
            'reception_at' => now()->addDays(45)->setTime(11, 0),
        ], []);

        Template::where('key', 'floral')->update(['usage_count' => 3]);
        Template::where('key', 'khat')->update(['usage_count' => 1]);
        Template::where('key', 'songket')->update(['usage_count' => 1]);

        // ---------------- Sample traffic ----------------
        VisitorEvent::query()->delete();
        $rows = [];
        foreach (range(0, 6) as $d) {
            $count = [18, 42, 27, 61, 48, 73, 35][$d];
            foreach (range(1, $count) as $i) {
                $rows[] = [
                    'id' => (string) Str::uuid(),
                    'path' => ['/', '/templates', '/e/aisyah-danial', '/login', '/e/nadia-firdaus'][$i % 5],
                    'session_id' => 'sess-'.$d.'-'.intdiv($i, 3),
                    'ip' => '127.0.0.1',
                    'created_at' => now()->subDays(6 - $d)->setTime(rand(8, 22), rand(0, 59)),
                ];
            }
        }
        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('visitor_events')->insert($chunk);
        }
    }

    /** @param array<int, array{0:string,1:string,2:int,3:string,4:string}> $guests */
    private function card(User $user, array $attrs, array $guests): Invitation
    {
        $inv = Invitation::updateOrCreate(['slug' => $attrs['slug']], array_merge([
            'user_id' => $user->id,
            'bismillah' => true,
            'rsvp_enabled' => true,
            'opening_line' => 'Dengan penuh kesyukuran, kami menjemput Dato’ / Datin / Tuan / Puan / Encik / Cik ke majlis perkahwinan anakanda kami',
            'program' => [
                ['time' => '11:00 pagi', 'title' => 'Ketibaan Tetamu'],
                ['time' => '12:00 t/hari', 'title' => 'Ketibaan Pengantin'],
                ['time' => '12:30 petang', 'title' => 'Jamuan Makan Beradab'],
                ['time' => '4:00 petang', 'title' => 'Majlis Bersurai'],
            ],
            'contacts' => [
                ['name' => $user->name, 'role' => 'Tuan Rumah', 'phone' => $user->phone ?? '+60123456789'],
            ],
            'gift' => ['bankName' => 'Maybank', 'accountName' => $attrs['groom_name'] ?? 'Pengantin', 'accountNo' => '5123 4567 8901', 'note' => 'Sumbangan & doa restu amatlah dihargai'],
        ], $attrs));

        $inv->guests()->delete();
        foreach ($guests as [$name, $phone, $pax, $status, $msg]) {
            $inv->guests()->create([
                'name' => $name, 'phone' => $phone, 'pax' => $pax, 'status' => $status,
                'message' => $msg, 'responded_at' => now()->subDays(rand(1, 10)),
            ]);
        }

        return $inv;
    }
}
