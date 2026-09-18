<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Template;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The app is a client-rendered SPA, so everything a crawler ever sees of /app is
 * what PHP puts in the shell before any JavaScript runs. These cover the two
 * halves of that: the public pages must carry real, indexable metadata, and the
 * private ones must carry noindex — the second half being the one where a
 * mistake leaks a couple's invitation or a QR pass token into Google.
 *
 * @see \App\Support\AppSeo
 */
class AppSeoTest extends TestCase
{
    use RefreshDatabase;

    private function template(array $overrides = []): Template
    {
        return Template::create(array_merge([
            'key' => 'songket', 'name' => 'Songket', 'category' => 'tradisional',
            'tier' => 'free', 'price_myr' => 0, 'is_active' => true,
            'status' => 'approved', 'sort_order' => 1,
        ], $overrides));
    }

    private function card(array $overrides = []): Invitation
    {
        $user = User::factory()->create(['role' => 'user', 'is_active' => true]);

        return Invitation::create(array_merge([
            'user_id' => $user->id,
            'template_key' => 'songket',
            'slug' => 'adam-hawa',
            'status' => 'published',
            'groom_name' => 'Adam',
            'bride_name' => 'Hawa',
            'venue_name' => 'Dewan Seri Melati',
            'is_trial' => false,
            'is_paid' => true,
        ], $overrides));
    }

    // ---- public pages ------------------------------------------------------

    public function test_home_is_indexable_and_lists_designs_for_crawlers(): void
    {
        $this->template(['key' => 'songket', 'name' => 'Songket']);
        $this->template(['key' => 'khat', 'name' => 'Khat', 'sort_order' => 2]);

        $response = $this->get('/');

        $response->assertOk();
        $response->assertSee('<meta name="robots" content="index, follow', false);
        $response->assertSee('<link rel="canonical"', false);
        $response->assertSee('Kad Kahwin', false);

        // Body text a non-JS crawler can actually read, not just meta tags.
        $response->assertSee('Songket', false);
        $response->assertSee('Khat', false);

        // JSON-LD listing the collection.
        $response->assertSee('application/ld+json', false);
        $response->assertSee('ItemList', false);
    }

    public function test_template_page_carries_its_own_title_and_canonical(): void
    {
        $this->template(['key' => 'songket', 'name' => 'Songket', 'description' => 'Reka bentuk tenunan klasik.']);

        $response = $this->get('/templates/songket');

        $response->assertOk();
        $response->assertSee('<title>Songket — Reka Bentuk Kad Jemputan</title>', false);
        $response->assertSee('Reka bentuk tenunan klasik.', false);
        $response->assertSee('index, follow', false);
    }

    public function test_published_card_is_indexable_with_event_schema(): void
    {
        $this->template();
        $this->card();

        $response = $this->get('/e/adam-hawa');

        $response->assertOk();
        $response->assertSee('Adam &amp; Hawa', false);
        $response->assertSee('Dewan Seri Melati', false);
        $response->assertSee('"@type":"Event"', false);
        $response->assertSee('index, follow', false);
    }

    // ---- pages that must never be indexed ----------------------------------

    public function test_a_trial_card_is_not_indexed(): void
    {
        $this->template();
        $this->card(['is_trial' => true, 'is_paid' => false]);

        // A watermarked, view-limited preview must not become the search result
        // for that couple's name.
        $this->get('/e/adam-hawa')->assertSee('noindex, nofollow', false);
    }

    public function test_an_unpublished_card_is_not_indexed(): void
    {
        $this->template();
        $this->card(['status' => 'draft']);

        $this->get('/e/adam-hawa')->assertSee('noindex, nofollow', false);
    }

    public function test_a_seat_page_is_not_indexed_when_the_host_hid_guest_names(): void
    {
        $this->template();
        $this->card(['seat_names_private' => true]);

        $this->get('/e/adam-hawa/meja/some-guest-id')->assertSee('noindex, nofollow', false);
    }

    /**
     * The token in a pass URL *is* the credential, so the page must never be
     * indexed regardless of what else on the site is public.
     */
    public function test_private_and_credential_paths_are_never_indexed(): void
    {
        foreach ([
            '/pass/some-secret-token',
            '/panel',
            '/panel/cards/1/guests',
            '/admin',
            '/admin/users',
            '/login',
            '/register',
            '/register-vendor',
            '/forgot-password',
            '/try/songket',
            '/entry/return',
        ] as $path) {
            $response = $this->get($path);

            $response->assertOk();
            $response->assertSee('noindex, nofollow', false);
            $response->assertDontSee('<link rel="canonical"', false);
        }
    }

    public function test_an_unknown_path_is_not_indexed_as_a_duplicate_of_home(): void
    {
        // React redirects these to "/" client-side; they must not be indexed as
        // near-duplicates of the home page.
        $this->get('/no-such-page')->assertSee('noindex, nofollow', false);
    }

    // ---- the iframed catalog ------------------------------------------------

    /**
     * /embed is the chromeless teaser gallery the WordPress homepage and /kad/
     * frame (resources/js/pages/EmbedGallery.tsx).
     */
    public function test_the_embed_teaser_is_followable_and_links_its_designs(): void
    {
        $this->template(['key' => 'songket', 'name' => 'Songket']);
        $this->template(['key' => 'khat', 'name' => 'Khat', 'sort_order' => 2]);

        foreach (['/embed', '/embed/templates'] as $path) {
            $response = $this->get($path);

            $response->assertOk();

            // A partial, chrome-free duplicate of "/", so it must not compete
            // with it in the index — but its links must still be followed.
            $response->assertSee('<meta name="robots" content="noindex, follow">', false);

            // A page must never both refuse indexing and nominate a canonical.
            $response->assertDontSee('<link rel="canonical"', false);

            // The designs are present as real links, not an empty iframe shell.
            $response->assertSee('Songket', false);
            $response->assertSee('Khat', false);
            $response->assertSee(url('/templates/songket'), false);
            $response->assertSee(url('/templates/khat'), false);
        }
    }

    /**
     * The server-rendered list must be the same set the component draws, or the
     * two versions of the page disagree. EmbedGallery clamps ?limit to 1..50
     * (default 10) and scopes by ?kind.
     */
    public function test_the_embed_teaser_honours_limit_and_kind_like_the_component(): void
    {
        $this->template(['key' => 'songket', 'name' => 'Songket', 'kind' => 'wedding']);
        $this->template(['key' => 'khat', 'name' => 'Khat', 'kind' => 'wedding', 'sort_order' => 2]);
        $this->template(['key' => 'poster', 'name' => 'Poster', 'kind' => 'event', 'sort_order' => 3]);

        // ?limit=1 -> only the first design.
        $one = $this->get('/embed?limit=1');
        $one->assertSee('Songket', false);
        $one->assertDontSee('>Khat<', false);

        // ?kind=event -> only the event design.
        $events = $this->get('/embed?kind=event');
        $events->assertSee('Poster', false);
        $events->assertDontSee('>Songket<', false);
    }

    public function test_the_embed_catalog_is_not_in_the_sitemap(): void
    {
        $this->template();

        // It is a framed duplicate of "/" — the sitemap points at the real page.
        $this->get('/sitemap.xml')->assertOk()->assertDontSee('/embed', false);
    }

    // ---- sitemap -----------------------------------------------------------

    public function test_sitemap_lists_public_pages_and_omits_private_ones(): void
    {
        $this->template(['key' => 'songket']);
        $this->template(['key' => 'pending-one', 'status' => 'pending', 'sort_order' => 9]);
        $this->card();
        $this->card(['slug' => 'trial-card', 'is_trial' => true, 'is_paid' => false]);

        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/xml');
        $response->assertSee('/templates/songket', false);
        $response->assertSee('/e/adam-hawa', false);

        // Not public: an unapproved design, a trial card, or any seat/pass URL.
        $response->assertDontSee('pending-one', false);
        $response->assertDontSee('trial-card', false);
        $response->assertDontSee('/meja/', false);
        $response->assertDontSee('/pass/', false);
    }

    // ---- analytics ---------------------------------------------------------

    public function test_no_analytics_tags_render_outside_production(): void
    {
        // The test suite and local dev must never reach the real properties.
        $response = $this->get('/');

        $response->assertDontSee('googletagmanager.com', false);
        $response->assertDontSee('connect.facebook.net', false);
        $response->assertDontSee('clarity.ms', false);
    }

    public function test_analytics_tags_render_when_enabled(): void
    {
        config([
            'analytics.enabled' => true,
            'analytics.ga4' => 'G-TEST1234',
            'analytics.google_ads' => 'AW-9999',
            'analytics.clarity' => 'testclarity',
            'analytics.meta_pixel' => '1234567890',
            'analytics.adsense' => 'ca-pub-0000',
        ]);

        $response = $this->get('/');

        $response->assertSee('googletagmanager.com/gtag/js?id=G-TEST1234', false);
        $response->assertSee('"G-TEST1234"', false);
        $response->assertSee('"AW-9999"', false);
        $response->assertSee('clarity.ms', false);
        $response->assertSee('connect.facebook.net', false);
        $response->assertSee('adsbygoogle.js?client=ca-pub-0000', false);

        // The SPA fix: the snippets must NOT send their own page view, because
        // pkTrackPageView sends one per client-side route instead. Without this
        // every session would record exactly one page view — the landing page.
        $response->assertSee('send_page_view: false', false);
        $response->assertSee('window.pkTrackPageView', false);
    }

    public function test_a_disabled_tag_id_drops_only_that_script(): void
    {
        config([
            'analytics.enabled' => true,
            'analytics.ga4' => 'G-TEST1234',
            'analytics.google_ads' => '',
            'analytics.clarity' => '',
            'analytics.meta_pixel' => '',
            'analytics.adsense' => '',
        ]);

        $response = $this->get('/');

        $response->assertSee('G-TEST1234', false);
        $response->assertDontSee('clarity.ms', false);
        $response->assertDontSee('connect.facebook.net', false);
        $response->assertDontSee('adsbygoogle', false);
    }
}
