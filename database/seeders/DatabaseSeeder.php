<?php

namespace Database\Seeders;

use App\Models\Invitation;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Template;
use App\Models\User;
use App\Models\VisitorEvent;
use App\Models\Voucher;
use App\Services\SeatingService;
use Carbon\CarbonInterface;
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
                'palette' => ['primary' => '#4a5c43', 'secondary' => '#5f6e57', 'accent' => '#b9756b', 'bg' => '#f7f4ed', 'text' => '#3d4438']],
            ['key' => 'curtain', 'name' => 'Grand Reveal', 'category' => 'motion', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 2,
                'description' => 'Tirai megah terbuka perlahan, menyingkap nama pengantin dalam suasana sinematik.',
                'palette' => ['primary' => '#f3e5c0', 'secondary' => '#c9a961', 'accent' => '#d9b45c', 'bg' => '#120d14', 'text' => '#ece2d0']],
            ['key' => 'khat', 'name' => 'Khat Zamrud', 'category' => 'khat', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 3,
                'description' => 'Khat dan geometri Islam bernuansa zamrud-emas, terlukis halus di hadapan mata.',
                'palette' => ['primary' => '#f2ecd4', 'secondary' => '#c7b98a', 'accent' => '#cfa94a', 'bg' => '#0d3b2e', 'text' => '#e8f0e6']],
            ['key' => 'songket', 'name' => 'Songket Diraja', 'category' => 'songket', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 4,
                'description' => 'Tenunan songket dan pucuk rebung Melayu, diseri merah marun dan kilau emas.',
                'palette' => ['primary' => '#54121d', 'secondary' => '#8a4a3a', 'accent' => '#b07a1e', 'bg' => '#f7ecd6', 'text' => '#43241f']],
            ['key' => 'batik', 'name' => 'Batik Nusantara', 'category' => 'batik', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 5,
                'description' => 'Corak batik nusantara indigo-emas dalam sampul yang terbuka perlahan.',
                'palette' => ['primary' => '#1b2c45', 'secondary' => '#5a6a80', 'accent' => '#d08a4a', 'bg' => '#f4efe2', 'text' => '#2c3446']],
            ['key' => 'sampul', 'name' => 'Sampul Diraja', 'category' => 'modern', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 6,
                'description' => 'Sampul bermaterai lilin — ketik untuk membukanya dan kad menjelma.',
                'palette' => ['primary' => '#4f4128', 'secondary' => '#7a6a4c', 'accent' => '#a8763c', 'bg' => '#f5efe2', 'text' => '#413526']],
            ['key' => 'tirai', 'name' => 'Tirai Mawar', 'category' => 'motion', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 7,
                'description' => 'Tirai berlabuh lalu tersingkap dengan taburan mawar dan zum lembut.',
                'palette' => ['primary' => '#6b2440', 'secondary' => '#8a4a63', 'accent' => '#b06a86', 'bg' => '#fbf1f4', 'text' => '#4a2434']],
            ['key' => 'bungaraya', 'name' => 'Bunga Raya', 'category' => 'floral', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 8,
                'description' => 'Bunga raya merah menyala dengan dedaun tropika yang mekar bertenaga.',
                'palette' => ['primary' => '#8c1c26', 'secondary' => '#a8474a', 'accent' => '#c8642f', 'bg' => '#fdf6ef', 'text' => '#4a2320']],
            ['key' => 'minimalis', 'name' => 'Minimalis Moden', 'category' => 'modern', 'tier' => 'free', 'price_myr' => 0, 'sort_order' => 9,
                'description' => 'Bersih, moden dan lapang — huruf halus dengan zum yang tenang.',
                'palette' => ['primary' => '#1e1e22', 'secondary' => '#5a5a62', 'accent' => '#8a7d5a', 'bg' => '#fbfaf8', 'text' => '#2c2c31']],
            ['key' => 'pastel', 'name' => 'Pastel Impian', 'category' => 'floral', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 10,
                'description' => 'Warna air pastel lembut dalam sampul yang menyingkap dengan manja.',
                'palette' => ['primary' => '#6d5b7d', 'secondary' => '#736180', 'accent' => '#c07a8f', 'bg' => '#faf5f8', 'text' => '#4e4356']],
            ['key' => 'kraf', 'name' => 'Kraf Rustik', 'category' => 'modern', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 11,
                'description' => 'Kertas kraf dan tali dengan sentuhan botani — hangat dan bersahaja.',
                'palette' => ['primary' => '#413324', 'secondary' => '#6d5b41', 'accent' => '#6b7d4a', 'bg' => '#efe6d5', 'text' => '#3b3125']],
            ['key' => 'seri', 'name' => 'Nikah Seri', 'category' => 'khat', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 12,
                'description' => 'Geometri Islam biru-hijau dan emas yang tersingkap dari sebalik tirai.',
                'palette' => ['primary' => '#f0ead2', 'secondary' => '#bcae86', 'accent' => '#d0a24a', 'bg' => '#123f46', 'text' => '#e6efee']],
            ['key' => 'celestial', 'name' => 'Cakerawala', 'category' => 'celestial', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 13,
                'description' => 'Langit malam bertabur bintang dan bulan sabit emas — seindah cakerawala.',
                'palette' => ['primary' => '#efd68f', 'secondary' => '#8fa3cc', 'accent' => '#c3a6e0', 'bg' => '#080d20', 'text' => '#e4e8f5']],
            ['key' => 'artdeco', 'name' => 'Deko Klasik', 'category' => 'luxe', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 14,
                'description' => 'Geometri Art Deco emas berlatar hitam pekat — mewah, klasik dan penuh gaya.',
                'palette' => ['primary' => '#e9d49a', 'secondary' => '#b99a5e', 'accent' => '#cbb173', 'bg' => '#0d0d0f', 'text' => '#e8e3d6']],
            ['key' => 'boho', 'name' => 'Boho Senja', 'category' => 'boho', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 15,
                'description' => 'Gerbang boho warna tanah dengan rumput pampas — santai namun anggun.',
                'palette' => ['primary' => '#8a4526', 'secondary' => '#7b5d3f', 'accent' => '#b07f3f', 'bg' => '#f6ece0', 'text' => '#4c3524']],
            ['key' => 'marble', 'name' => 'Marmar Mewah', 'category' => 'luxe', 'tier' => 'premium', 'price_myr' => 79, 'sort_order' => 16,
                'description' => 'Marmar putih berurat emas — kemewahan senyap yang moden dan bersih.',
                'palette' => ['primary' => '#26251f', 'secondary' => '#5c584d', 'accent' => '#96783f', 'bg' => '#f6f5f2', 'text' => '#2b2a25']],
            ['key' => 'greenery', 'name' => 'Hijauan Segar', 'category' => 'floral', 'tier' => 'premium', 'price_myr' => 59, 'sort_order' => 17,
                'description' => 'Untaian dedaun eukaliptus hijau segar — nyaman dan menyejukkan mata.',
                'palette' => ['primary' => '#28453a', 'secondary' => '#4d6b57', 'accent' => '#7d9464', 'bg' => '#f3f6f1', 'text' => '#2c3b32']],
            ['key' => 'typografi', 'name' => 'Tipografi Moden', 'category' => 'modern', 'tier' => 'free', 'price_myr' => 0, 'sort_order' => 18,
                'description' => 'Tipografi besar yang berani dan bersih — moden, editorial dan mudah dibaca.',
                'palette' => ['primary' => '#121212', 'secondary' => '#4d4d4d', 'accent' => '#b8442c', 'bg' => '#f8f6f2', 'text' => '#1c1c1c']],
            ['key' => 'pelamin', 'name' => 'Pelamin Diraja', 'category' => 'songket', 'tier' => 'premium', 'price_myr' => 79, 'sort_order' => 19,
                'description' => 'Pelamin diraja ungu dan emas dengan tenunan songket — bagai raja sehari.',
                'palette' => ['primary' => '#efd08a', 'secondary' => '#c9a267', 'accent' => '#d8a0c0', 'bg' => '#2a1236', 'text' => '#ede3ef']],
            ['key' => 'peranakan', 'name' => 'Pusaka Peranakan', 'category' => 'peranakan', 'tier' => 'premium', 'price_myr' => 69, 'sort_order' => 20,
                'description' => 'Corak jubin Peranakan pirus, koral dan emas — warisan penuh warna.',
                'palette' => ['primary' => '#f4b23f', 'secondary' => '#f0a988', 'accent' => '#4bb3a8', 'bg' => '#0c4f4d', 'text' => '#f0efe4']],
        ];
        foreach ($templates as $t) {
            // Covers are captured in the browser from the real template — see
            // Admin → Rekaan → "Jana Semua Thumbnail". Seeding leaves them null so
            // a card falls back to its palette artwork rather than a dead path.
            Template::updateOrCreate(['key' => $t['key']], $t);
        }

        // ---------------- Admins ----------------
        User::updateOrCreate(['email' => 'admin@portalkahwin.test'],
            ['name' => 'Super Admin', 'password' => 'password123', 'role' => 'superadmin', 'status' => 'active', 'is_active' => true]);
        User::updateOrCreate(['email' => 'staff@portalkahwin.test'],
            ['name' => 'Admin Sokongan', 'password' => 'password123', 'role' => 'admin', 'status' => 'active', 'is_active' => true]);

        // ---------------- Vendor / Affiliate ----------------
        User::updateOrCreate(['email' => 'vendor@portalkahwin.test'],
            ['name' => 'Kedai Kad Seri', 'password' => 'password123', 'role' => 'vendor', 'status' => 'active',
                'company_name' => 'Seri Kad Enterprise', 'plan' => 'premium', 'plan_expires_at' => now()->addYear(),
                'storage_quota_mb' => 500, 'phone' => '+60125551234', 'is_active' => true]);
        User::updateOrCreate(['email' => 'affiliate@portalkahwin.test'],
            ['name' => 'Aiman Affiliate', 'password' => 'password123', 'role' => 'affiliate', 'status' => 'active',
                'company_name' => 'Aiman Digital', 'storage_quota_mb' => 300, 'phone' => '+60135556789', 'is_active' => true]);
        // A pending vendor to demo the approval inbox.
        User::updateOrCreate(['email' => 'pending@portalkahwin.test'],
            ['name' => 'Vendor Menunggu', 'password' => 'password123', 'role' => 'vendor', 'status' => 'pending',
                'company_name' => 'Baru Kahwin Studio', 'phone' => '+60145550000', 'is_active' => true]);

        // ---------------- Packages ----------------
        foreach ([
            ['name' => 'Vendor Bulanan', 'role_target' => 'vendor', 'price_myr' => 49, 'interval' => 'monthly', 'sort' => 1,
                'features' => ['Kad tanpa had', 'Susun atur meja', 'Logo & profil syarikat', 'Semua rekaan premium', 'Sokongan keutamaan']],
            ['name' => 'Vendor Tahunan', 'role_target' => 'vendor', 'price_myr' => 490, 'interval' => 'yearly', 'sort' => 2,
                'features' => ['Semua dalam pelan Bulanan', 'Jimat 2 bulan', 'Storan 1GB']],
            ['name' => 'Affiliate Bulanan', 'role_target' => 'affiliate', 'price_myr' => 39, 'interval' => 'monthly', 'sort' => 3,
                'features' => ['Cipta & reka kad', 'Pautan 24 jam', 'Kod baucar', 'Logo & profil syarikat']],
        ] as $pkg) {
            Package::updateOrCreate(['name' => $pkg['name']], $pkg + ['is_active' => true]);
        }

        // ---------------- Vouchers ----------------
        Voucher::updateOrCreate(['code' => 'RAYA2026'], ['kind' => 'percent', 'value' => 20, 'max_uses' => 100, 'is_active' => true, 'note' => 'Diskaun Raya 20%']);
        Voucher::updateOrCreate(['code' => 'BANKIN'], ['kind' => 'full', 'value' => 0, 'max_uses' => 50, 'is_active' => true, 'note' => 'Untuk pembayaran bank-in (100% diskaun, diberi manual)']);

        // ---------------- Community template contribution ----------------
        Setting::put('allow_user_templates', 'true'); // feature ON for demo

        // ---------------- Users ----------------
        $demo = User::updateOrCreate(['email' => 'demo@portalkahwin.test'],
            ['name' => 'Hawa & Adam', 'password' => 'password123', 'role' => 'user', 'plan' => 'free', 'phone' => '+60123456789', 'is_active' => true]);
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
            'slug' => 'hawa-adam', 'template_key' => 'floral', 'status' => 'published',
            'groom_name' => 'Adam', 'bride_name' => 'Hawa', 'groom_short' => 'Adam', 'bride_short' => 'Hawa',
            'groom_parents' => 'Bin Encik Ahmad Faizal & Puan Rohana', 'bride_parents' => 'Binti Encik Kamarul & Puan Zaleha',
            'date_label' => $this->dateLabel(now()->addDays(60)), 'time_label' => '12:00 tengah hari – 4:00 petang',
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
            ['Zaid sekeluarga', 'Tahniah Adam & Hawa! Semoga bahagia hingga ke Jannah, murah rezeki dan dikurniakan zuriat yang soleh.'],
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
            'groom_name' => 'Haziq Iskandar', 'bride_name' => 'Alia Sofea', 'groom_short' => 'Haziq', 'bride_short' => 'Alia',
            'reception_at' => now()->addDays(90)->setTime(20, 0),
        ], []);

        // Siti — floral draft
        $this->card($siti, [
            'slug' => 'siti-draf-'.Str::lower(Str::random(4)), 'template_key' => 'floral', 'status' => 'draft',
            'groom_name' => 'Amir Hakim', 'bride_name' => 'Siti Sarah', 'groom_short' => 'Amir', 'bride_short' => 'Sarah',
            'reception_at' => now()->addDays(45)->setTime(11, 0),
        ], []);

        // Per-template ownership demo: Siti (free plan) has BOUGHT the 'artdeco' design,
        // so she owns that design + gets paid features (seating). Demo user owns nothing.
        Payment::where('user_id', $siti->id)->where('purpose', 'template')->delete();
        Payment::create([
            'user_id' => $siti->id,
            'purpose' => 'template',
            'template_key' => 'artdeco',
            'reference' => 'SEED-'.Str::upper(Str::random(8)),
            'amount_myr' => 69,
            'status' => 'paid',
            'paid_at' => now(),
            'meta' => ['template_key' => 'artdeco', 'template_name' => 'Deko Klasik'],
        ]);

        // A pending community submission (Siti re-skinned Floral in lavender) to demo the review inbox.
        Template::updateOrCreate(['key' => 'c-lavender-impian'], [
            'base_key' => 'floral', 'name' => 'Lavender Impian', 'category' => 'floral',
            'description' => 'Sumbangan komuniti — floral bernuansa lavender lembut.',
            'tier' => 'free', 'price_myr' => 0, 'is_active' => false, 'status' => 'pending',
            'submitted_by' => $siti->id, 'sort_order' => 900,
            'palette' => ['primary' => '#5b3a6e', 'secondary' => '#9a7fb0', 'accent' => '#b08fd0', 'bg' => '#f6f1fb', 'text' => '#4a3b52'],
        ]);

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

    /** "Sabtu, 12 Disember 2026" — the Malay long form hosts type by hand. */
    private function dateLabel(CarbonInterface $when): string
    {
        $days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
        $months = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

        return sprintf('%s, %d %s %d', $days[(int) $when->dayOfWeek], $when->day, $months[$when->month - 1], $when->year);
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
