<?php

namespace Database\Seeders;

use App\Models\Template;
use Illuminate\Database\Seeder;

/**
 * Non-wedding EVENT designs. One poster-forward base component (`eventposter`)
 * powers many visually-distinct designs via palette + name. Idempotent: keyed on
 * `key`, so re-running updates in place.
 *
 * Palette convention for EventPoster: primary/bg = dark ground (poster pops),
 * accent/secondary = the vivid neon, text = light.
 */
class EventTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $designs = [
            ['event-neon', 'Neon Nights', ['primary' => '#12061f', 'secondary' => '#23d5ff', 'accent' => '#ff3d81', 'bg' => '#1b0b2e', 'text' => '#f6f3fb']],
            ['event-gala', 'Golden Gala', ['primary' => '#17140d', 'secondary' => '#c99a3a', 'accent' => '#e8c25a', 'bg' => '#241d10', 'text' => '#f7f1e2']],
            ['event-festival', 'Festival Sunset', ['primary' => '#2a0f2b', 'secondary' => '#ff477e', 'accent' => '#ff7a3d', 'bg' => '#3a1330', 'text' => '#fff0e6']],
            ['event-summit', 'Tech Summit', ['primary' => '#06121f', 'secondary' => '#6ef2c8', 'accent' => '#35c2ff', 'bg' => '#0b1e33', 'text' => '#eaf6ff']],
            ['event-jazz', 'Midnight Jazz', ['primary' => '#0a0f24', 'secondary' => '#b98bff', 'accent' => '#f0a63a', 'bg' => '#12183a', 'text' => '#f2f0ff']],
            ['event-launch', 'Bold Launch', ['primary' => '#140708', 'secondary' => '#ffb03a', 'accent' => '#ff4245', 'bg' => '#200a0c', 'text' => '#fdeeee']],
            ['event-emerald', 'Emerald Night', ['primary' => '#06170f', 'secondary' => '#e8c25a', 'accent' => '#4fd18b', 'bg' => '#0c2418', 'text' => '#eafff2']],
            ['event-retro', 'Retro Wave', ['primary' => '#100a2e', 'secondary' => '#4f9bff', 'accent' => '#ff4fd8', 'bg' => '#1b1147', 'text' => '#f2eeff']],
            ['event-mono', 'Mono Bold', ['primary' => '#0c0c0d', 'secondary' => '#9aa0a6', 'accent' => '#ffffff', 'bg' => '#1a1a1c', 'text' => '#f4f4f6']],
            ['event-coral', 'Coral Pop', ['primary' => '#1a0f14', 'secondary' => '#ffd166', 'accent' => '#ff6f61', 'bg' => '#2a1620', 'text' => '#fff2ee']],
        ];

        foreach ($designs as $i => [$key, $name, $palette]) {
            Template::updateOrCreate(
                ['key' => $key],
                [
                    'base_key' => 'eventposter',
                    'name' => $name,
                    'category' => 'event',
                    'kind' => 'event',
                    'description' => 'Rekaan acara — konsert, gala, seminar & majlis berbayar.',
                    'tier' => 'free',
                    'price_myr' => 0,
                    'palette' => $palette,
                    'is_active' => true,
                    'status' => 'approved',
                    'sort_order' => 100 + $i,
                ],
            );
        }
    }
}
