<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Template;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * A ceiling on the MySQL queries one anonymous page view may cost.
 *
 * Added after the host suspended the account for MySQL overload. The shell is
 * served for EVERY path, and it is now also open to crawlers, so any query added
 * to it is multiplied across all the traffic on the site — that is the number
 * worth guarding.
 *
 * Only CONTENT queries are counted. The sessions and cache tables are excluded
 * because their cost is a driver choice rather than a property of this code —
 * and on this app they dominate: with SESSION_DRIVER=database even /login and
 * /panel, which need no data at all, cost three queries each. See DEPLOY.md.
 */
class QueryBudgetTest extends TestCase
{
    use RefreshDatabase;

    /** Tables whose traffic is a driver choice, not a property of our code. */
    private const INFRASTRUCTURE = ['sessions', 'cache', 'cache_locks', 'jobs'];

    private function seedData(int $templates = 65): void
    {
        for ($i = 0; $i < $templates; $i++) {
            Template::create([
                'key' => 'tpl-'.$i, 'name' => 'Template '.$i, 'category' => 'floral',
                'kind' => 'wedding', 'tier' => 'free', 'price_myr' => 0,
                'is_active' => true, 'status' => 'approved', 'sort_order' => $i,
            ]);
        }

        $user = User::factory()->create(['role' => 'user', 'is_active' => true]);
        Invitation::create([
            'user_id' => $user->id, 'template_key' => 'tpl-0', 'slug' => 'adam-hawa',
            'status' => 'published', 'groom_name' => 'Adam', 'bride_name' => 'Hawa',
            'is_trial' => false, 'is_paid' => true,
        ]);
    }

    private function measure(string $path): int
    {
        $count = 0;

        DB::listen(function ($query) use (&$count) {
            if (! preg_match('~(?:from|into|update)\s+"?([a-z_]+)"?~i', $query->sql, $m)) {
                return;
            }
            if (! in_array($m[1], self::INFRASTRUCTURE, true)) {
                $count++;
            }
        });

        $this->get($path)->assertOk();
        DB::getEventDispatcher()->forget(\Illuminate\Database\Events\QueryExecuted::class);

        return $count;
    }

    public function test_the_shell_stays_cheap_on_every_path(): void
    {
        $this->seedData();

        // The shell answers every path, so each of these is paid on all traffic.
        // One query for the page's own data is the intent; the auth screens and
        // the signed-in app should need no content query at all.
        $budgets = [
            '/' => 2,
            '/embed' => 2,
            '/templates/tpl-0' => 2,
            '/e/adam-hawa' => 2,
            '/login' => 0,
            '/panel' => 0,
            '/sitemap.xml' => 3,
        ];

        $over = [];

        foreach ($budgets as $path => $budget) {
            $count = $this->measure($path);

            if ($count > $budget) {
                $over[] = "  {$path}: {$count} content queries, budget {$budget}";
            }
        }

        $this->assertSame([], $over, implode("\n", [
            'The SPA shell got more expensive. It is returned for every path on the',
            'site, so a query added here is multiplied across all traffic including',
            'crawlers. Cache it, or raise the budget and say why.',
            '',
            ...$over,
            '',
        ]));
    }

    /** The catalog is 65 rows — fetched once, never once per design. */
    public function test_the_catalog_is_one_query_not_one_per_design(): void
    {
        $this->seedData(65);

        $this->assertLessThanOrEqual(2, $this->measure('/'));
        $this->assertLessThanOrEqual(2, $this->measure('/embed'));
    }
}
