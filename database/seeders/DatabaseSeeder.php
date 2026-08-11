<?php

namespace Database\Seeders;

use App\Models\Invitation;
use App\Models\Template;
use App\Models\User;
use App\Models\VisitorEvent;
use App\Models\Wish;
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
                'description' => 'Bunga lembut bersulam emas — mekar perlahan saat jemputan ditatal.',
                'palette' => ['primary' => '#5b3a2e', 'secondary' => '#8a6d5f', 'accent' => '#c9a24b', 'bg' => '#f6efe6', 'text' => '#4a3b33']],
            ['key' => 'curtain', 'name' => 'Grand Reveal', 'category' => 'motion', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 2,
                'description' => 'Tirai megah terbuka perlahan, menyingkap nama pengantin dalam suasana sinematik.',
                'palette' => ['primary' => '#f4e9c8', 'secondary' => '#caa24a', 'accent' => '#d4af37', 'bg' => '#140f0a', 'text' => '#efe6d0']],
            ['key' => 'khat', 'name' => 'Khat Zamrud', 'category' => 'khat', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 3,
                'description' => 'Khat dan geometri Islam bernuansa zamrud-emas, terlukis halus di hadapan mata.',
                'palette' => ['primary' => '#f4ecd0', 'secondary' => '#c9a24b', 'accent' => '#d4af37', 'bg' => '#0f3d2e', 'text' => '#eaf3ea']],
            ['key' => 'songket', 'name' => 'Songket Diraja', 'category' => 'songket', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 4,
                'description' => 'Tenunan songket dan pucuk rebung Melayu, diseri merah marun dan kilau emas.',
                'palette' => ['primary' => '#f6e3c8', 'secondary' => '#e0b24a', 'accent' => '#d4af37', 'bg' => '#5b1620', 'text' => '#f7e9dc']],
            ['key' => 'batik', 'name' => 'Batik Nusantara', 'category' => 'batik', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 5,
                'description' => 'Corak batik nusantara indigo-emas dalam sampul yang terbuka perlahan.',
                'palette' => ['primary' => '#f3ead2', 'secondary' => '#d9b25a', 'accent' => '#d4af37', 'bg' => '#20304a', 'text' => '#f0e7d6']],
            ['key' => 'sampul', 'name' => 'Sampul Diraja', 'category' => 'modern', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 6,
                'description' => 'Sampul bermaterai lilin — ketik untuk membukanya dan kad menjelma.',
                'palette' => ['primary' => '#5b4a2e', 'secondary' => '#9c8659', 'accent' => '#c9a24b', 'bg' => '#f4ecdd', 'text' => '#4a3d2a']],
            ['key' => 'tirai', 'name' => 'Tirai Mawar', 'category' => 'motion', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 7,
                'description' => 'Tirai berlabuh lalu tersingkap dengan taburan mawar dan zum lembut.',
                'palette' => ['primary' => '#5b2a3a', 'secondary' => '#a86d7e', 'accent' => '#c98aa0', 'bg' => '#f7ecef', 'text' => '#4a2b34']],
            ['key' => 'bungaraya', 'name' => 'Bunga Raya', 'category' => 'floral', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 8,
                'description' => 'Bunga raya merah menyala dengan dedaun tropika yang mekar bertenaga.',
                'palette' => ['primary' => '#7a1f2b', 'secondary' => '#3f7d4f', 'accent' => '#e0483f', 'bg' => '#fbf3ec', 'text' => '#4a2a25']],
            ['key' => 'minimalis', 'name' => 'Minimalis Moden', 'category' => 'modern', 'tier' => 'free', 'price_myr' => 0, 'sort_order' => 9,
                'description' => 'Bersih, moden dan lapang — huruf halus dengan zum yang tenang.',
                'palette' => ['primary' => '#2a2a2e', 'secondary' => '#7a7a80', 'accent' => '#c9a24b', 'bg' => '#faf7f2', 'text' => '#33333a']],
            ['key' => 'pastel', 'name' => 'Pastel Impian', 'category' => 'floral', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 10,
                'description' => 'Warna air pastel lembut dalam sampul yang menyingkap dengan manja.',
                'palette' => ['primary' => '#6a5a7a', 'secondary' => '#c79fb0', 'accent' => '#d9a86a', 'bg' => '#f6f0f7', 'text' => '#4a3f52']],
            ['key' => 'kraf', 'name' => 'Kraf Rustik', 'category' => 'modern', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 11,
                'description' => 'Kertas kraf dan tali dengan sentuhan botani — hangat dan bersahaja.',
                'palette' => ['primary' => '#4a3b2a', 'secondary' => '#7d6b52', 'accent' => '#8a9a6b', 'bg' => '#efe7d8', 'text' => '#463829']],
            ['key' => 'seri', 'name' => 'Nikah Seri', 'category' => 'khat', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 12,
                'description' => 'Geometri Islam biru-hijau dan emas yang tersingkap dari sebalik tirai.',
                'palette' => ['primary' => '#f2ecd6', 'secondary' => '#bfa15a', 'accent' => '#d4af37', 'bg' => '#14494d', 'text' => '#e9f2ee']],
            ['key' => 'celestial', 'name' => 'Cakerawala', 'category' => 'celestial', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 13,
                'description' => 'Langit malam bertabur bintang dan bulan sabit emas — seindah cakerawala.',
                'palette' => ['primary' => '#f0d98a', 'secondary' => '#9fb3d8', 'accent' => '#e9c46a', 'bg' => '#0b1026', 'text' => '#dfe6f5']],
            ['key' => 'artdeco', 'name' => 'Deko Klasik', 'category' => 'luxe', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 14,
                'description' => 'Geometri Art Deco emas berlatar hitam pekat — mewah, klasik dan penuh gaya.',
                'palette' => ['primary' => '#e7cf8b', 'secondary' => '#b9a06a', 'accent' => '#d4af37', 'bg' => '#0e0e0c', 'text' => '#f2ead4']],
            ['key' => 'boho', 'name' => 'Boho Senja', 'category' => 'boho', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 15,
                'description' => 'Gerbang boho warna tanah dengan rumput pampas — santai namun anggun.',
                'palette' => ['primary' => '#a5522f', 'secondary' => '#c07a4e', 'accent' => '#b08453', 'bg' => '#f3e7db', 'text' => '#5c3d2e']],
            ['key' => 'marble', 'name' => 'Marmar Mewah', 'category' => 'luxe', 'tier' => 'premium', 'price_myr' => 79, 'sort_order' => 16,
                'description' => 'Marmar putih berurat emas — kemewahan senyap yang moden dan bersih.',
                'palette' => ['primary' => '#2b2a28', 'secondary' => '#8a877f', 'accent' => '#b89a5e', 'bg' => '#f5f4f2', 'text' => '#33312e']],
            ['key' => 'greenery', 'name' => 'Hijauan Segar', 'category' => 'floral', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 17,
                'description' => 'Untaian dedaun eukaliptus hijau segar — nyaman dan menyejukkan mata.',
                'palette' => ['primary' => '#2f4a34', 'secondary' => '#6f8c5f', 'accent' => '#9bad7f', 'bg' => '#f4f7f0', 'text' => '#33412f']],
            ['key' => 'typografi', 'name' => 'Tipografi Moden', 'category' => 'modern', 'tier' => 'free', 'price_myr' => 0, 'sort_order' => 18,
                'description' => 'Tipografi besar yang berani dan bersih — moden, editorial dan mudah dibaca.',
                'palette' => ['primary' => '#161616', 'secondary' => '#6b6b6b', 'accent' => '#c0553b', 'bg' => '#f7f5f1', 'text' => '#222222']],
            ['key' => 'pelamin', 'name' => 'Pelamin Diraja', 'category' => 'songket', 'tier' => 'premium', 'price_myr' => 79, 'sort_order' => 19,
                'description' => 'Pelamin diraja ungu dan emas dengan tenunan songket — bagai raja sehari.',
                'palette' => ['primary' => '#f0cf7e', 'secondary' => '#c9a9d8', 'accent' => '#e9c46a', 'bg' => '#2b1339', 'text' => '#f2e8f5']],
            ['key' => 'peranakan', 'name' => 'Pusaka Peranakan', 'category' => 'peranakan', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 20,
                'description' => 'Corak jubin Peranakan pirus, koral dan emas — warisan penuh warna.',
                'palette' => ['primary' => '#f6b352', 'secondary' => '#e8734f', 'accent' => '#f2c94c', 'bg' => '#0d5b58', 'text' => '#fdf3e3']],
        ];
        foreach ($templates as $t) {
            // Real cover screenshots live at public/thumbnails/<key>.png (generated from the live template).
            $t['thumbnail'] = $t['thumbnail'] ?? '/thumbnails/'.$t['key'].'.png';
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
            'maps_url' => 'https://www.google.com/maps/place/Dewan+Seri+Melati/@2.9931,101.7876,17z',
            'reception_at' => now()->addDays(60)->setTime(12, 0),
            'wishlist' => [
                ['title' => 'Set Pinggan Mangkuk Seramik', 'note' => 'Warna putih / krim', 'url' => ''],
                ['title' => 'Cadar & Set Tilam (Queen)', 'note' => 'Warna pastel lembut', 'url' => ''],
                ['title' => 'Periuk Nasi Elektrik', 'note' => 'Saiz sederhana', 'url' => ''],
                ['title' => 'Baucar Rumah Tangga', 'note' => 'Mana-mana kedai perabot', 'url' => ''],
            ],
        ], [
            ['Farah & keluarga', '+60111111111', 4, 'attending', 'Tahniah! Semoga cinta dipayungi rahmat hingga ke Jannah.'],
            ['Hakim', '+60122222222', 2, 'attending', 'Insya-Allah hadir.'],
            ['Sofia', '+60133333333', 1, 'declined', 'Maaf tidak dapat hadir, doa kami mengiringi dari jauh.'],
            ['Zulkifli sekeluarga', '+60144444444', 3, 'attending', 'Barakallah!'],
        ]);
        foreach ([['Meja 1', 70, 70], ['Meja 2', 330, 70]] as [$label, $x, $y]) {
            $t = $inv->tables()->create(['label' => $label, 'capacity' => 8, 'pos_x' => $x, 'pos_y' => $y, 'sort' => $inv->tables()->count()]);
            $t->syncSeats();
        }
        $seating->autoAssignAll($inv);

        // Guestbook speeches (ucapan) for the demo card.
        $inv->wishes()->delete();
        foreach ([
            ['Aunty Mardiah', 'Barakallahu lakuma wa baraka alaikuma. Semoga menjadi pasangan penyayang dunia dan akhirat.'],
            ['Zaid sekeluarga', 'Tahniah Danial & Aisyah! Semoga bahagia hingga ke Jannah, murah rezeki dan dikurniakan zuriat yang soleh.'],
            ['Cikgu Rohana', 'Selamat pengantin baharu. Semoga rumah tangga sentiasa sakinah, mawaddah dan warahmah.'],
            ['Farah & Hakim', 'Semoga cinta kalian dipayungi rahmat Ilahi selamanya. Tahniah!'],
        ] as [$name, $message]) {
            $inv->wishes()->create(['name' => $name, 'message' => $message]);
        }

        // Premium — khat, published
        $this->card($premium, [
            'slug' => 'nadia-firdaus', 'template_key' => 'khat', 'status' => 'published',
            'groom_name' => 'Ahmad Firdaus', 'bride_name' => 'Nadia Hana', 'groom_short' => 'Firdaus', 'bride_short' => 'Nadia',
            'groom_parents' => 'Bin Dato’ Ismail & Datin Sofia', 'bride_parents' => 'Binti Encik Rahman & Puan Aminah',
            'date_label' => 'Ahad, 8 November 2026', 'time_label' => '11:00 pagi – 3:00 petang', 'hijri_label' => '18 Jamadilawal 1448H',
            'venue_name' => 'Dewan Perdana Felda', 'venue_address' => 'Jalan Gurney, 54000 Kuala Lumpur',
            'reception_at' => now()->addDays(35)->setTime(11, 0),
        ], [
            ['Iman & pasangan', '+60155555555', 2, 'attending', 'Semoga rumah tangga kekal bahagia hingga ke syurga.'],
            ['Danish', '+60166666666', 1, 'attending', 'Tahniah buat kalian berdua!'],
        ]);

        // Planner — songket published + curtain draft
        $this->card($planner, [
            'slug' => 'majlis-warna', 'template_key' => 'songket', 'status' => 'published',
            'groom_name' => 'Tengku Arif', 'bride_name' => 'Puteri Balqis', 'groom_short' => 'Arif', 'bride_short' => 'Balqis',
            'date_label' => 'Sabtu, 20 Februari 2027', 'time_label' => '12:00 tengah hari – 5:00 petang',
            'venue_name' => 'Istana Hotel Grand Ballroom', 'venue_address' => 'Jalan Raja Chulan, 50200 Kuala Lumpur',
            'reception_at' => now()->addDays(120)->setTime(12, 0),
        ], [
            ['Keluarga Tengku', '+60188888888', 6, 'attending', 'Selamat pengantin baharu, semoga berbahagia selalu.'],
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
            'opening_line' => 'Dengan penuh rasa syukur, kami berbesar hati menjemput Dato’ / Datin / Tuan / Puan / Encik / Cik ke majlis perkahwinan anakanda kami',
            'program' => [
                ['time' => '11:00 pagi', 'title' => 'Kehadiran Tetamu'],
                ['time' => '12:00 tengah hari', 'title' => 'Majlis Menyambut Pengantin'],
                ['time' => '12:30 petang', 'title' => 'Santapan Beradab'],
                ['time' => '4:00 petang', 'title' => 'Majlis Beransur Selesai'],
            ],
            'contacts' => [
                ['name' => $user->name, 'role' => 'Tuan Rumah', 'phone' => $user->phone ?? '+60123456789'],
            ],
            'gift' => ['bankName' => 'Maybank', 'accountName' => $attrs['groom_name'] ?? 'Pengantin', 'accountNo' => '5123 4567 8901', 'note' => 'Setiap sumbangan dan doa restu amat kami hargai.'],
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
