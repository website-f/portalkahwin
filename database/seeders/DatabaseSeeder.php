<?php

namespace Database\Seeders;

use App\Models\Package;
use App\Models\Template;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Seeder;

/**
 * Production seed.
 *
 * A fresh install gets exactly the catalogue + config it needs and ONE account:
 * the superadmin. Every other account (staff, vendors, affiliates, couples) is
 * created by hand or through normal signup — no demo users, demo cards or sample
 * traffic ship to production.
 *
 * All data is idempotent (updateOrCreate), so `db:seed` is safe to re-run.
 * The custom (`StyleTemplateSeeder`) and event (`EventTemplateSeeder`) designs are
 * also seeded by migrations, but we call them here too so `php artisan db:seed`
 * alone produces the full catalogue.
 */
class DatabaseSeeder extends Seeder
{
    /** The single superadmin created on a fresh install. */
    private const SUPERADMIN_EMAIL = 'contact@portalkahwin.com';

    private const SUPERADMIN_PASSWORD = 'portalkahwin2026';

    public function run(): void
    {
        $this->seedBuiltInTemplates();

        // Config-driven custom designs + non-wedding event designs.
        $this->call([
            StyleTemplateSeeder::class,
            EventTemplateSeeder::class,
        ]);

        $this->seedPackages();
        $this->seedVouchers();
        $this->seedSuperadmin();
    }

    /** The one account a fresh install ships with. Everyone else is created manually. */
    private function seedSuperadmin(): void
    {
        User::updateOrCreate(
            ['email' => self::SUPERADMIN_EMAIL],
            [
                'name' => 'Super Admin',
                'password' => self::SUPERADMIN_PASSWORD, // auto-hashed by the model cast
                'role' => 'superadmin',
                'status' => 'active',
                'is_active' => true,
            ],
        );
    }

    /** The 21 built-in bespoke designs (rendered by their own components). */
    private function seedBuiltInTemplates(): void
    {
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
            // Covers are captured in the browser from the real template
            // (Admin → Rekaan → "Jana Semua Thumbnail"); seeding leaves them null so
            // a card falls back to its palette artwork rather than a dead path.
            Template::updateOrCreate(['key' => $t['key']], $t);
        }
    }

    /** Subscription plans + add-ons the superadmin can edit or extend later. */
    private function seedPackages(): void
    {
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
    }

    /** Starter promo/bank-in vouchers (the superadmin manages these in the admin). */
    private function seedVouchers(): void
    {
        Voucher::updateOrCreate(['code' => 'RAYA2026'], ['kind' => 'percent', 'value' => 20, 'max_uses' => 100, 'is_active' => true, 'note' => 'Diskaun Raya 20%']);
        Voucher::updateOrCreate(['code' => 'BANKIN'], ['kind' => 'full', 'value' => 0, 'max_uses' => 50, 'is_active' => true, 'note' => 'Untuk pembayaran bank-in (100% diskaun, diberi manual)']);
    }
}
