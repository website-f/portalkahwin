<?php

namespace Database\Seeders;

use App\Models\Template;
use Illuminate\Database\Seeder;

/**
 * Five additional wedding designs, rendered by the config-driven `custom` engine
 * (no new components). Each is an original palette + gradient + ambient effect +
 * decoration composition — no third-party artwork is copied.
 *
 * Three lead with the animated `floralCorners` frame (the swaying/breathing
 * floral corners), one carries a gold songket-weave border, one an ivory lace
 * frame — so the catalogue gains a richer floral presence. Idempotent
 * (updateOrCreate on key): safe to re-run.
 */
class FloralTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->specs() as $s) {
            Template::updateOrCreate(['key' => $s['key']], $this->row($s));
        }
    }

    /** @return array<int,string> the keys this seeder owns (for migration rollback). */
    public function keys(): array
    {
        return array_map(fn ($s) => $s['key'], $this->specs());
    }

    /** Build one template row from a compact spec (same shape as StyleTemplateSeeder). */
    private function row(array $s): array
    {
        [$primary, $secondary, $accent, $bg, $text] = $s['palette'];
        $palette = compact('primary', 'secondary', 'accent', 'bg', 'text');

        $bgType = $s['bg'] ?? 'gradient';
        $background = ['type' => $bgType];
        if ($bgType === 'gradient') {
            $background['color'] = $s['bgColor'] ?? $bg;
            $background['color2'] = $s['bgColor2'] ?? $bg;
            $background['angle'] = $s['bgAngle'] ?? 160;
        } elseif ($bgType === 'color') {
            $background['color'] = $s['bgColor'] ?? $bg;
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

        // Dark designs need a translucent panel behind every section so light text
        // never lands on the engine's default white veil.
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
            'kind' => 'wedding',
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
    private function specs(): array
    {
        return [
            // Classic blush-rose romance — swaying floral corners + falling petals.
            ['key' => 'u-rosa', 'name' => 'Rosa Klasik', 'category' => 'floral', 'tier' => 'premium', 'price' => 59, 'sort' => 41,
                'desc' => 'Classic blush & rose-gold romance with a full swaying floral frame and drifting petals.',
                'palette' => ['#a8455e', '#c98a99', '#c9a15f', '#fff5f4', '#3e2029'], 'heading' => 'script',
                'bg' => 'gradient', 'bgColor' => '#fff5f4', 'bgColor2' => '#f7dde1', 'bgAngle' => 160,
                'reveal' => 'envelope', 'effect' => 'petals', 'effectColor' => '#e2a6b3', 'density' => 12,
                'deco' => 'floralCorners', 'decoColor' => '#c98aa0', 'motion' => 'lively'],

            // Warm dusty-terracotta & plum dahlias — sunset botanical with gold dust.
            ['key' => 'u-dahlia', 'name' => 'Dahlia Senja', 'category' => 'floral', 'tier' => 'premium', 'price' => 59, 'sort' => 42,
                'desc' => 'Warm terracotta & plum dahlias with a lush swaying floral frame and a fall of golden dust.',
                'palette' => ['#8c3b4a', '#b06a54', '#c98a4b', '#fbf1ea', '#3d241f'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#fbf1ea', 'bgColor2' => '#f2ddc9', 'bgAngle' => 160,
                'reveal' => 'envelope', 'effect' => 'dust', 'effectColor' => '#c98a4b', 'density' => 12,
                'deco' => 'floralCorners', 'decoColor' => '#b0574f', 'motion' => 'calm'],

            // Traditional Malay songket — deep maroon & gold weave border with sparkle.
            ['key' => 'u-songket-warisan', 'name' => 'Songket Warisan', 'category' => 'songket', 'langs' => ['bm'], 'tier' => 'premium', 'price' => 79, 'sort' => 43,
                'desc' => 'Deep maroon & gold songket heritage with a woven gold border and a shimmer of sparkles.',
                'palette' => ['#f2d79b', '#e0b48a', '#e8c24f', '#5a1220', '#f7ecd6'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#6e1526', 'bgColor2' => '#400b18', 'bgAngle' => 155, 'panel' => 'rgba(50,10,18,0.5)',
                'reveal' => 'curtain', 'coverColor' => '#5a1220', 'effect' => 'sparkles', 'effectColor' => '#e8c24f', 'density' => 12,
                'deco' => 'moroccan', 'decoColor' => '#e8c24f', 'motion' => 'calm'],

            // Fresh eucalyptus greenery — free, botanical, with drifting leaves.
            ['key' => 'u-eucalyptus', 'name' => 'Kebun Eucalyptus', 'category' => 'floral', 'tier' => 'free', 'price' => 0, 'sort' => 44,
                'desc' => 'Fresh eucalyptus greenery with a swaying botanical frame and gently drifting leaves.',
                'palette' => ['#3a5a44', '#6f8a6a', '#b98a5e', '#f3f7f1', '#243528'], 'heading' => 'serif',
                'bg' => 'gradient', 'bgColor' => '#f3f7f1', 'bgColor2' => '#dfeeda', 'bgAngle' => 160,
                'reveal' => 'split', 'effect' => 'leaves', 'effectColor' => '#6f8a6a', 'density' => 12,
                // Blush blooms among the (always-green) leaves read as a real
                // greenery-and-flowers bouquet, not green flowers.
                'deco' => 'floralCorners', 'decoColor' => '#c99aa0', 'motion' => 'calm'],

            // Ivory & gold lace elegance — an ornate lace frame with golden dust.
            ['key' => 'u-renda', 'name' => 'Renda Emas', 'category' => 'luxe', 'tier' => 'premium', 'price' => 79, 'sort' => 45,
                'desc' => 'Ivory & gold lace elegance with an ornate filigree frame and a soft fall of golden dust.',
                'palette' => ['#8a6a2e', '#b89a5e', '#c9a24b', '#fdfbf5', '#3a3220'], 'heading' => 'elegant',
                'bg' => 'gradient', 'bgColor' => '#fdfbf5', 'bgColor2' => '#f2ebd8', 'bgAngle' => 160,
                'reveal' => 'door', 'effect' => 'dust', 'effectColor' => '#c9a24b', 'density' => 10,
                'deco' => 'lace', 'decoColor' => '#c9a24b', 'motion' => 'calm'],
        ];
    }
}
