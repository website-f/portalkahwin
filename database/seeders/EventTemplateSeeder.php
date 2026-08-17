<?php

namespace Database\Seeders;

use App\Models\Template;
use Illuminate\Database\Seeder;

/**
 * Non-wedding EVENT designs. The one poster-forward base component
 * (`eventposter`) renders a THEME (colour/ground/motif) + a TYPE (content, hero
 * art & copy) per template — carried in config as {eventTheme, eventType}. So an
 * open house shows ketupat + "Rumah Terbuka", a birthday shows a cake + "Hari
 * Jadi", a concert shows the equaliser, etc. — genuinely distinct, not one
 * concert poster recoloured. Idempotent on `key` (20 stable keys).
 *
 * Themes: neon | gala | sunset | noir | geo (dark) · bloom | pop | marble (light)
 * Types:  concert | gala | corporate | openhouse | birthday | aqiqah
 */
class EventTemplateSeeder extends Seeder
{
    public function run(): void
    {
        // [key, name, theme, type, stage, palette]
        // `stage` is the bespoke animated cover layout (eventStages.tsx). It varies
        // WITHIN each type so no two templates share a look — a concert can be a
        // marquee, a spinning vinyl or a swept spotlight; corporate can be an
        // aurora launch or a deco awards night; etc.
        $designs = [
            // Concerts — marquee / vinyl / spotlight / marquee(warm)
            ['event-neon', 'Neon Nights', 'neon', 'concert', 'marquee', ['primary' => '#12061f', 'secondary' => '#23d5ff', 'accent' => '#ff3d81', 'bg' => '#1b0b2e', 'text' => '#f6f3fb']],
            ['event-retro', 'Retro Wave', 'neon', 'concert', 'vinyl', ['primary' => '#100a2e', 'secondary' => '#4f9bff', 'accent' => '#ff4fd8', 'bg' => '#1b1147', 'text' => '#f2eeff']],
            ['event-festival', 'Festival Sunset', 'sunset', 'concert', 'spotlight', ['primary' => '#3a0f2b', 'secondary' => '#ff477e', 'accent' => '#ff7a3d', 'bg' => '#5a1738', 'text' => '#fff0e6']],
            ['event-lava', 'Lava Festival', 'sunset', 'concert', 'marquee', ['primary' => '#2a1206', 'secondary' => '#ffb03a', 'accent' => '#ff5722', 'bg' => '#3a1808', 'text' => '#ffeee6']],
            // Galas — deco / vinyl(jazz) / deco / spotlight
            ['event-gala', 'Golden Gala', 'gala', 'gala', 'deco', ['primary' => '#0e0e12', 'secondary' => '#c9a24b', 'accent' => '#e8c25a', 'bg' => '#15151b', 'text' => '#f7f1e2']],
            ['event-jazz', 'Midnight Jazz', 'gala', 'gala', 'vinyl', ['primary' => '#0c0a1a', 'secondary' => '#b98bff', 'accent' => '#e6b04a', 'bg' => '#161232', 'text' => '#f2f0ff']],
            ['event-crimson', 'Crimson Affair', 'gala', 'gala', 'deco', ['primary' => '#150608', 'secondary' => '#e8b45a', 'accent' => '#d43b52', 'bg' => '#220a0e', 'text' => '#ffeef0']],
            ['event-royal', 'Royal Night', 'noir', 'gala', 'spotlight', ['primary' => '#060a1f', 'secondary' => '#9fb0d8', 'accent' => '#4d7cff', 'bg' => '#0b1233', 'text' => '#eaf0ff']],
            // Corporate — launch / deco / spotlight / launch (Perasmian = aurora, NOT black)
            ['event-summit', 'Tech Summit', 'noir', 'corporate', 'launch', ['primary' => '#0a0f1e', 'secondary' => '#4f7cff', 'accent' => '#35c2ff', 'bg' => '#0c1430', 'text' => '#eef1f5']],
            ['event-mono', 'Mono Corporate', 'gala', 'corporate', 'deco', ['primary' => '#101014', 'secondary' => '#9aa0a6', 'accent' => '#d6dae0', 'bg' => '#1a1a20', 'text' => '#f4f4f6']],
            ['event-launch', 'Bold Launch', 'sunset', 'corporate', 'spotlight', ['primary' => '#2a0a0c', 'secondary' => '#ffb03a', 'accent' => '#ff4245', 'bg' => '#3a1010', 'text' => '#fdeeee']],
            ['event-aurora', 'Majlis Perasmian', 'geo', 'corporate', 'launch', ['primary' => '#06231a', 'secondary' => '#4fd18b', 'accent' => '#e8c25a', 'bg' => '#0a2e22', 'text' => '#eafff2']],
            // Open house — arch(ketupat) / arch / garden / garden
            ['event-emerald', 'Rumah Terbuka', 'geo', 'openhouse', 'arch', ['primary' => '#0c3b30', 'secondary' => '#cdae6a', 'accent' => '#e2c079', 'bg' => '#0f2c3a', 'text' => '#eef3ec']],
            ['event-teal', 'Kenduri Terbuka', 'geo', 'openhouse', 'arch', ['primary' => '#04161a', 'secondary' => '#e8c25a', 'accent' => '#2fd4c0', 'bg' => '#082227', 'text' => '#eafcfb']],
            ['event-sunrise', 'Rumah Terbuka Taman', 'bloom', 'openhouse', 'garden', ['primary' => '#3f5540', 'secondary' => '#7d9464', 'accent' => '#c98a63', 'bg' => '#f6f1e7', 'text' => '#3a352c']],
            ['event-mint', 'Jamuan Mint', 'bloom', 'openhouse', 'garden', ['primary' => '#2f6b52', 'secondary' => '#8fbf9e', 'accent' => '#3ea77a', 'bg' => '#eef7f0', 'text' => '#26382e']],
            // Birthdays — pop (bright / vivid / pastel) · Aqiqah — arch
            ['event-coral', 'Hari Jadi Ceria', 'pop', 'birthday', 'pop', ['primary' => '#ff5aa7', 'secondary' => '#5ad0ff', 'accent' => '#ff7a59', 'bg' => '#fff6f2', 'text' => '#4a2b3a']],
            ['event-magenta', 'Pesta Hari Jadi', 'pop', 'birthday', 'pop', ['primary' => '#c8399b', 'secondary' => '#7b5dff', 'accent' => '#ff3db4', 'bg' => '#fdf2fb', 'text' => '#41224a']],
            ['event-berry', 'Sambutan Manis', 'marble', 'birthday', 'pop', ['primary' => '#5a2740', 'secondary' => '#b98aa0', 'accent' => '#c05a7d', 'bg' => '#f7eef2', 'text' => '#3a2530']],
            ['event-slate', 'Aqiqah Suci', 'marble', 'aqiqah', 'arch', ['primary' => '#3a4a52', 'secondary' => '#b7c4c9', 'accent' => '#7fa8b0', 'bg' => '#eef4f5', 'text' => '#2c3a40']],
        ];

        foreach ($designs as $i => [$key, $name, $theme, $type, $stage, $palette]) {
            Template::updateOrCreate(
                ['key' => $key],
                [
                    'base_key' => 'eventposter',
                    'name' => $name,
                    'category' => 'event',
                    'kind' => 'event',
                    'description' => 'Rekaan acara — konsert, gala, rumah terbuka, hari jadi, aqiqah & majlis rasmi.',
                    'tier' => 'free',
                    'price_myr' => 0,
                    'palette' => $palette,
                    'config' => ['eventTheme' => $theme, 'eventType' => $type, 'eventStage' => $stage],
                    'is_active' => true,
                    'status' => 'approved',
                    'sort_order' => 100 + $i,
                ],
            );
        }
    }
}
