<?php

namespace Database\Seeders;

use App\Models\Template;
use Illuminate\Database\Seeder;

/**
 * 20 ORIGINAL config-driven designs rendered by the `custom` engine:
 *   • 6 Chinese  — authentic red/gold/jade 囍 wedding cards (tagged `zh` so they
 *                  float to the top when the UI language is Chinese)
 *   • 4 Indian   — saffron / maroon / teal, mandala & floral framing
 *   • 10 universal — each with a rich full-card gradient + a floral / oval frame
 *
 * Every row is an original palette + gradient + ambient-effect + decoration
 * composition — no third-party artwork is copied. Idempotent: safe to re-run.
 */
class StyleTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->rows() as $r) {
            Template::updateOrCreate(['key' => $r['key']], $r);
        }
    }

    /** @return array<int,string> the keys this seeder owns (for migration rollback). */
    public function keys(): array
    {
        return array_map(fn ($s) => $s['key'], $this->specs());
    }

    /** Build one template row from a compact spec. */
    private function row(array $s): array
    {
        [$primary, $secondary, $accent, $bg, $text] = $s['palette'];
        $palette = compact('primary', 'secondary', 'accent', 'bg', 'text');

        // Whole-card background (gradient / tint / image).
        $bgType = $s['bg'] ?? 'none';
        $background = ['type' => $bgType];
        if ($bgType === 'gradient') {
            $background['color'] = $s['bgColor'] ?? $bg;
            $background['color2'] = $s['bgColor2'] ?? $bg;
            $background['angle'] = $s['bgAngle'] ?? 155;
        } elseif ($bgType === 'color') {
            $background['color'] = $s['bgColor'] ?? $bg;
        } elseif ($bgType === 'image') {
            $background['image'] = $s['bgImage'] ?? '';
            $background['overlay'] = $s['overlay'] ?? 0.34;
            $background['blur'] = $s['blur'] ?? 0;
        }

        $config = [
            'palette' => $palette,
            'heading' => $s['heading'],
            'background' => $background,
            'cover' => ['reveal' => $s['reveal'], 'accentColor' => $s['coverColor'] ?? $accent],
            'effect' => ['type' => $s['effect'], 'color' => $s['effectColor'] ?? $accent, 'density' => $s['density'] ?? 14],
            'decoration' => ['style' => $s['deco'], 'color' => $s['decoColor'] ?? $accent],
            'motion' => $s['motion'] ?? 'lively',
        ];

        // Dark designs need a uniform translucent panel behind every section so
        // light text never lands on the engine's default white veil.
        if (isset($s['panel'])) {
            $sections = [];
            foreach (['opening', 'couple', 'date', 'program', 'location', 'wishes', 'wishlist', 'contacts', 'gift', 'gallery'] as $k) {
                $sections[$k] = ['enabled' => true, 'bg' => ['type' => 'color', 'color' => $s['panel']], 'animation' => 'fade'];
            }
            $config['sections'] = $sections;
        }

        return [
            'key' => $s['key'],
            'base_key' => 'custom',
            'name' => $s['name'],
            'category' => $s['category'],
            'languages' => $s['langs'] ?? null,
            'description' => $s['desc'] ?? null,
            'tier' => $s['tier'],
            'price_myr' => $s['price'],
            'sort_order' => $s['sort'],
            'is_active' => true,
            'status' => 'approved',
            'palette' => $palette,
            'config' => $config,
        ];
    }

    /** @return array<int,array<string,mixed>> */
    private function rows(): array
    {
        return array_map(fn ($s) => $this->row($s), $this->specs());
    }

    /** @return array<int,array<string,mixed>> */
    private function specs(): array
    {
        return [
            // ================= Chinese (float to top when language = zh) =================
            ['key' => 'zh-shuangxi', 'name' => 'Shuang Xi Merah', 'category' => 'chinese', 'langs' => ['zh'], 'tier' => 'premium', 'price' => 69, 'sort' => 21,
                'desc' => 'Deep crimson & gold with the 囍 double-happiness crest and drifting gold dust.',
                'palette' => ['#f7e2a6', '#f0c0b6', '#f2c85a', '#7d0d12', '#f8ecd6'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#8c1016', 'bgColor2' => '#57070b', 'bgAngle' => 160, 'panel' => 'rgba(52,7,10,0.5)',
                'reveal' => 'curtain', 'coverColor' => '#7d0d12', 'effect' => 'dust', 'effectColor' => '#f2c85a', 'density' => 14,
                'deco' => 'doubleHappiness', 'decoColor' => '#f2c85a', 'motion' => 'lively'],

            ['key' => 'zh-tanglung', 'name' => 'Tanglung Emas', 'category' => 'chinese', 'langs' => ['zh'], 'tier' => 'premium', 'price' => 79, 'sort' => 22,
                'desc' => 'A deep-red night strung with golden lanterns and glowing fireflies.',
                'palette' => ['#f6d98a', '#e0a3a3', '#ffd166', '#240a0c', '#f6e6c9'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#3a0e10', 'bgColor2' => '#140506', 'bgAngle' => 150, 'panel' => 'rgba(30,8,10,0.52)',
                'reveal' => 'zoom', 'effect' => 'fireflies', 'effectColor' => '#ffd166', 'density' => 16,
                'deco' => 'lantern', 'decoColor' => '#ffd166', 'motion' => 'lively'],

            ['key' => 'zh-peoni', 'name' => 'Peoni Diraja', 'category' => 'chinese', 'langs' => ['zh'], 'tier' => 'premium', 'price' => 69, 'sort' => 23,
                'desc' => 'Royal peony red & gold framed in an ornate oval, with falling petals.',
                'palette' => ['#a01722', '#9a5a4a', '#c99a3a', '#fff3ef', '#4a1414'], 'heading' => 'script',
                'bg' => 'gradient', 'bgColor' => '#fff3ef', 'bgColor2' => '#f6dcd4', 'bgAngle' => 160,
                'reveal' => 'envelope', 'effect' => 'petals', 'effectColor' => '#d98c9d', 'density' => 12,
                'deco' => 'ovalFrame', 'decoColor' => '#c99a3a', 'motion' => 'lively'],

            ['key' => 'zh-delima', 'name' => 'Merah Delima', 'category' => 'chinese', 'langs' => ['zh'], 'tier' => 'premium', 'price' => 69, 'sort' => 24,
                'desc' => 'Classic red & gold art-deco luxe with a shimmer of sparkles.',
                'palette' => ['#f4d58a', '#e6a9a0', '#f0c74c', '#6e0d12', '#f8ecd6'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#7d0f14', 'bgColor2' => '#4d080c', 'bgAngle' => 160, 'panel' => 'rgba(48,7,10,0.5)',
                'reveal' => 'blinds', 'coverColor' => '#6e0d12', 'effect' => 'sparkles', 'effectColor' => '#f0c74c', 'density' => 12,
                'deco' => 'artdeco', 'decoColor' => '#f0c74c', 'motion' => 'lively'],

            ['key' => 'zh-jade', 'name' => 'Zamrud Cina', 'category' => 'chinese', 'langs' => ['zh'], 'tier' => 'premium', 'price' => 69, 'sort' => 25,
                'desc' => 'Auspicious jade green & gold in an oval frame with a soft golden glow.',
                'palette' => ['#f2e2b0', '#bfe0cf', '#e8c65a', '#0e3b30', '#eef7f0'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#124a3b', 'bgColor2' => '#08251e', 'bgAngle' => 155, 'panel' => 'rgba(8,32,26,0.5)',
                'reveal' => 'curtain', 'coverColor' => '#0e3b30', 'effect' => 'bokeh', 'effectColor' => '#e8c65a', 'density' => 12,
                'deco' => 'ovalFrame', 'decoColor' => '#e8c65a', 'motion' => 'calm'],

            ['key' => 'zh-sakura', 'name' => 'Bunga Sakura', 'category' => 'chinese', 'langs' => ['zh'], 'tier' => 'premium', 'price' => 69, 'sort' => 26,
                'desc' => 'Soft pink & gold with a full floral frame and a gentle sakura fall.',
                'palette' => ['#b81e46', '#b3697e', '#c99a3a', '#fff4f6', '#46101f'], 'heading' => 'script',
                'bg' => 'gradient', 'bgColor' => '#fff4f6', 'bgColor2' => '#f7d9e0', 'bgAngle' => 160,
                'reveal' => 'zoom', 'effect' => 'sakura', 'effectColor' => '#f4b8c6', 'density' => 16,
                'deco' => 'floralCorners', 'decoColor' => '#d98aa0', 'motion' => 'lively'],

            // ============================== Indian ==============================
            ['key' => 'in-marigold', 'name' => 'Marigold Mahal', 'category' => 'indian', 'tier' => 'premium', 'price' => 69, 'sort' => 27,
                'desc' => 'Saffron & maroon with a full marigold frame and drifting petals.',
                'palette' => ['#b8341b', '#7a1f3d', '#e8a33d', '#fff6ec', '#3a1e14'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#fff6ec', 'bgColor2' => '#f6dcc4', 'bgAngle' => 160,
                'reveal' => 'envelope', 'effect' => 'petals', 'effectColor' => '#f2a71b', 'density' => 14,
                'deco' => 'floralCorners', 'decoColor' => '#e8952b', 'motion' => 'lively'],

            ['key' => 'in-mandala', 'name' => 'Mandala Diraja', 'category' => 'indian', 'tier' => 'premium', 'price' => 69, 'sort' => 28,
                'desc' => 'Deep maroon & gold mandala lattice with a shimmer of sparkles.',
                'palette' => ['#7a1f3d', '#b8341b', '#d4af37', '#fdf2ee', '#35141f'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#fdf2ee', 'bgColor2' => '#f3d8cf', 'bgAngle' => 160,
                'reveal' => 'zoom', 'effect' => 'sparkles', 'effectColor' => '#d4af37', 'density' => 14,
                'deco' => 'moroccan', 'decoColor' => '#d4af37', 'motion' => 'lively'],

            ['key' => 'in-teal', 'name' => 'Teal & Emas', 'category' => 'indian', 'tier' => 'premium', 'price' => 69, 'sort' => 29,
                'desc' => 'South-Indian teal, magenta & gold in an ornate oval with confetti.',
                'palette' => ['#0e6b6b', '#b0227a', '#e0a92e', '#f0f8f7', '#123a3a'], 'heading' => 'serif',
                'bg' => 'gradient', 'bgColor' => '#eef8f7', 'bgColor2' => '#d2ebe8', 'bgAngle' => 160,
                'reveal' => 'blinds', 'effect' => 'confetti', 'effectColor' => '#e0a92e', 'density' => 12,
                'deco' => 'ovalFrame', 'decoColor' => '#e0a92e', 'motion' => 'lively'],

            ['key' => 'in-paisley', 'name' => 'Paisley Senja', 'category' => 'indian', 'tier' => 'premium', 'price' => 69, 'sort' => 30,
                'desc' => 'Royal purple & saffron paisley with a fall of golden dust.',
                'palette' => ['#6a2c91', '#c85a2b', '#e8a33d', '#faf4fb', '#2e1738'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#faf4fb', 'bgColor2' => '#ece0f6', 'bgAngle' => 160,
                'reveal' => 'envelope', 'effect' => 'dust', 'effectColor' => '#e8a33d', 'density' => 10,
                'deco' => 'moroccan', 'decoColor' => '#6a2c91', 'motion' => 'lively'],

            // ============================= Universal =============================
            ['key' => 'u-garden', 'name' => 'Taman Bahagia', 'category' => 'floral', 'tier' => 'free', 'price' => 0, 'sort' => 31,
                'desc' => 'Fresh garden greenery & blush blooms with drifting leaves.',
                'palette' => ['#2f5d3a', '#7c8a6b', '#cf7d8e', '#f4f9f1', '#24331f'], 'heading' => 'script',
                'bg' => 'gradient', 'bgColor' => '#f4f9f1', 'bgColor2' => '#dfeed6', 'bgAngle' => 160,
                'reveal' => 'plain', 'effect' => 'leaves', 'effectColor' => '#7fa06b', 'density' => 12,
                'deco' => 'floralCorners', 'decoColor' => '#cf7d8e', 'motion' => 'calm'],

            ['key' => 'u-blush', 'name' => 'Blush Romantik', 'category' => 'floral', 'tier' => 'premium', 'price' => 59, 'sort' => 32,
                'desc' => 'Blush & rose-gold in an ornate oval with falling petals.',
                'palette' => ['#a85567', '#c2929c', '#cba15f', '#fff5f3', '#3a2429'], 'heading' => 'script',
                'bg' => 'gradient', 'bgColor' => '#fff5f3', 'bgColor2' => '#f6ddd8', 'bgAngle' => 160,
                'reveal' => 'zoom', 'effect' => 'petals', 'effectColor' => '#e6b8c2', 'density' => 12,
                'deco' => 'ovalFrame', 'decoColor' => '#cba15f', 'motion' => 'lively'],

            ['key' => 'u-midnight', 'name' => 'Malam Berbintang', 'category' => 'celestial', 'tier' => 'premium', 'price' => 69, 'sort' => 33,
                'desc' => 'Starlit navy & gold in a golden oval with a slow drift of stars.',
                'palette' => ['#ecd9a0', '#9aa6d4', '#e6c866', '#0f1430', '#eef1ff'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#141a3e', 'bgColor2' => '#080b1c', 'bgAngle' => 160, 'panel' => 'rgba(10,14,34,0.5)',
                'reveal' => 'zoom', 'effect' => 'stars', 'effectColor' => '#ffe9a8', 'density' => 16,
                'deco' => 'ovalFrame', 'decoColor' => '#e6c866', 'motion' => 'lively'],

            ['key' => 'u-emerald', 'name' => 'Zamrud Mewah', 'category' => 'luxe', 'tier' => 'premium', 'price' => 79, 'sort' => 34,
                'desc' => 'Emerald & gold luxe in an oval frame with a soft golden bokeh.',
                'palette' => ['#ecd9a0', '#8fb3a2', '#e0c063', '#0c3b2c', '#eef7f0'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#114a38', 'bgColor2' => '#06231a', 'bgAngle' => 155, 'panel' => 'rgba(6,32,24,0.5)',
                'reveal' => 'blinds', 'effect' => 'bokeh', 'effectColor' => '#e0c063', 'density' => 12,
                'deco' => 'ovalFrame', 'decoColor' => '#e0c063', 'motion' => 'calm'],

            ['key' => 'u-terracotta', 'name' => 'Terakota Boho', 'category' => 'boho', 'tier' => 'premium', 'price' => 59, 'sort' => 35,
                'desc' => 'Warm terracotta & sand boho with a full floral frame and floating dust.',
                'palette' => ['#a5522f', '#9a7b5a', '#c98a4b', '#fbf3ea', '#3a281c'], 'heading' => 'serif',
                'bg' => 'gradient', 'bgColor' => '#fbf3ea', 'bgColor2' => '#f0dcc6', 'bgAngle' => 160,
                'reveal' => 'plain', 'effect' => 'dust', 'effectColor' => '#c98a4b', 'density' => 10,
                'deco' => 'floralCorners', 'decoColor' => '#c9784b', 'motion' => 'calm'],

            ['key' => 'u-monoline', 'name' => 'Mono Elegan', 'category' => 'modern', 'tier' => 'free', 'price' => 0, 'sort' => 36,
                'desc' => 'Ultra-minimal off-white with a thin gold geometric rule.',
                'palette' => ['#1a1a1a', '#6b6b6b', '#b8975a', '#ffffff', '#222222'], 'heading' => 'modern',
                'bg' => 'gradient', 'bgColor' => '#ffffff', 'bgColor2' => '#f2f0ea', 'bgAngle' => 160,
                'reveal' => 'plain', 'effect' => 'none', 'deco' => 'geometric', 'decoColor' => '#b8975a', 'motion' => 'calm'],

            ['key' => 'u-lavender', 'name' => 'Lavender Lembut', 'category' => 'floral', 'tier' => 'premium', 'price' => 59, 'sort' => 37,
                'desc' => 'Soft lavender & silver with a full floral frame and rising bubbles.',
                'palette' => ['#6b5aa8', '#9a92b8', '#b9a7d6', '#f8f5fd', '#2e2740'], 'heading' => 'script',
                'bg' => 'gradient', 'bgColor' => '#f8f5fd', 'bgColor2' => '#e7defa', 'bgAngle' => 160,
                'reveal' => 'zoom', 'effect' => 'bubbles', 'effectColor' => '#c9bce6', 'density' => 10,
                'deco' => 'floralCorners', 'decoColor' => '#8f7ec2', 'motion' => 'lively'],

            ['key' => 'u-ocean', 'name' => 'Gerimis Laut', 'category' => 'modern', 'tier' => 'premium', 'price' => 59, 'sort' => 38,
                'desc' => 'Ocean blue & sand under a gentle fall of rain, framed by an arch.',
                'palette' => ['#1c6a86', '#6aa0b0', '#dda15e', '#f0f8fa', '#143844'], 'heading' => 'serif',
                'bg' => 'gradient', 'bgColor' => '#eef7fa', 'bgColor2' => '#d4ebf1', 'bgAngle' => 160,
                'reveal' => 'blinds', 'effect' => 'rain', 'effectColor' => '#7fbdd4', 'density' => 14,
                'deco' => 'arch', 'decoColor' => '#1c6a86', 'motion' => 'calm'],

            ['key' => 'u-butterfly', 'name' => 'Rama-Rama', 'category' => 'floral', 'tier' => 'premium', 'price' => 59, 'sort' => 39,
                'desc' => 'Fresh mint & gold with a full floral frame and drifting butterflies.',
                'palette' => ['#2f7d69', '#a8607a', '#cba15f', '#f3faf6', '#1f3a33'], 'heading' => 'script',
                'bg' => 'gradient', 'bgColor' => '#f3faf6', 'bgColor2' => '#dcefe6', 'bgAngle' => 160,
                'reveal' => 'zoom', 'effect' => 'butterflies', 'effectColor' => '#d98c9d', 'density' => 10,
                'deco' => 'floralCorners', 'decoColor' => '#c98aa0', 'motion' => 'lively'],

            ['key' => 'u-fiesta', 'name' => 'Pesta Ceria', 'category' => 'modern', 'tier' => 'premium', 'price' => 59, 'sort' => 40,
                'desc' => 'Bright, festive confetti in an oval frame — perfect for joyful celebrations.',
                'palette' => ['#d84a86', '#4aa3d4', '#f2b705', '#fffdf5', '#33203a'], 'heading' => 'sans',
                'bg' => 'gradient', 'bgColor' => '#fff7fb', 'bgColor2' => '#eaf5fb', 'bgAngle' => 160,
                'reveal' => 'zoom', 'effect' => 'confetti', 'effectColor' => '#f2b705', 'density' => 12,
                'deco' => 'ovalFrame', 'decoColor' => '#e0518d', 'motion' => 'lively'],
        ];
    }
}
