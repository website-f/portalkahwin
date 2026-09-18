<?php

namespace App\Support;

use App\Models\Invitation;
use App\Models\Template;
use Illuminate\Support\Str;

/**
 * Server-side SEO for the React app at /app.
 *
 * The app is a client-rendered SPA: every path returns the same shell and React
 * Router decides what to draw. A crawler that doesn't run JavaScript therefore
 * saw one title ("Portal Kahwin") and an empty <div id="app"> for the whole
 * site — which, together with the blanket X-Robots-Tag that used to sit in
 * public/.htaccess, is why nothing under /app could be crawled.
 *
 * So the shell is no longer static. This class maps the request path back onto
 * the route table in resources/js/AppRouter.tsx and produces, before any
 * JavaScript runs:
 *
 *   * a real <title> and meta description,
 *   * a canonical URL,
 *   * per-path robots directives — the important half, since only PHP knows
 *     whether a /e/<slug> card is actually published,
 *   * Open Graph + Twitter tags so a WhatsApp/Facebook share unfurls,
 *   * JSON-LD, which is also what AI crawlers read in preference to prose,
 *   * and the page's text in a <noscript> block, so there is body content to
 *     index and not just metadata.
 *
 * There is no Node/SSR on this host, which is why this is hand-built rather
 * than a real server render. It mirrors App\Support\SeoManager on DropRSVP.
 *
 * Paths here are WITHOUT the /app mount prefix — Laravel's $request->path()
 * already strips it, and url() adds it back.
 */
class AppSeo
{
    /** Longest-match-first path patterns that must never be indexed. */
    private const PRIVATE_PREFIXES = [
        'panel',            // the signed-in app
        'admin',            // back office
        'login',
        'register',
        'register-new-user',
        'register-vendor',
        'register-affiliate',
        'forgot-password',
        'reset-password',
        'change-password',
        'entry',            // payment return legs
        'try',              // trial editor: the same design as /templates/<key>
        'pass',             // a QR pass — the token IN the URL is the credential
        'api',
    ];

    public function __construct(
        private readonly string $path,
        private readonly array $query = [],
    ) {}

    public static function forPath(?string $path, array $query = []): self
    {
        return new self(trim((string) $path, '/'), $query);
    }

    /**
     * Everything the shell needs, as plain view data:
     * title, description, canonical, robots, image, schema (array|null), body.
     */
    public function resolve(): array
    {
        $site = 'Portal Kahwin';

        // Global kill switch (APP_NOINDEX=true) still wins over everything.
        if (config('app.noindex')) {
            return $this->page(
                title: $site,
                description: null,
                index: false,
            );
        }

        foreach (self::PRIVATE_PREFIXES as $prefix) {
            if ($this->path === $prefix || str_starts_with($this->path, $prefix.'/')) {
                return $this->page(
                    title: $this->privateTitle($prefix, $site),
                    description: null,
                    index: false,
                );
            }
        }

        return match (true) {
            $this->path === '' => $this->home($site),
            (bool) preg_match('~^templates/([^/]+)$~', $this->path, $m) => $this->template(urldecode($m[1]), $site),
            (bool) preg_match('~^e/([^/]+)/meja/([^/]+)$~', $this->path, $m) => $this->guestSeat(urldecode($m[1]), $site),
            (bool) preg_match('~^e/([^/]+)$~', $this->path, $m) => $this->card(urldecode($m[1]), $site),
            $this->path === 'embed', $this->path === 'embed/templates' => $this->embed(),

            // Anything unrecognised is a client-side 404 that redirects to "/".
            // Never let it be indexed as a near-duplicate of the home page.
            default => $this->page(title: $site, description: null, index: false),
        };
    }

    // ---- individual pages --------------------------------------------------

    /** "/" — the template collection, and the app's main landing page. */
    private function home(string $site): array
    {
        // A page must never 500 because its SEO metadata couldn't be built. If
        // the lookup fails the static copy below still renders, just without the
        // design list and the ItemList schema.
        $templates = $this->publishedTemplates();

        $body = '<h1>Kad Kahwin & Kad Jemputan Digital</h1>'
            .'<p>Pilih daripada '.$templates->count().' reka bentuk kad jemputan digital — '
            .'kad kahwin, majlis dan acara — lengkap dengan RSVP, senarai tetamu dan pas QR.</p>';

        if ($templates->isNotEmpty()) {
            $body .= '<h2>Koleksi reka bentuk</h2><ul>';
            foreach ($templates as $t) {
                $body .= '<li><a href="'.e(url('/templates/'.$t->key)).'">'.e($t->name).'</a>'
                    .($t->category ? ' — '.e($t->category) : '').'</li>';
            }
            $body .= '</ul>';
        }

        return $this->page(
            title: 'Kad Kahwin & Kad Jemputan Digital',
            description: 'Pilih reka bentuk kad kahwin dan kad jemputan digital Portal Kahwin. '
                .'Sunting sendiri, kongsi pautan, dan urus RSVP, senarai tetamu, pelan meja dan pas QR.',
            index: true,
            canonical: url('/'),
            schema: [
                '@type' => 'CollectionPage',
                'name' => 'Koleksi Kad Kahwin Digital',
                'url' => url('/'),
                'inLanguage' => 'ms-MY',
                'mainEntity' => [
                    '@type' => 'ItemList',
                    'numberOfItems' => $templates->count(),
                    'itemListElement' => $templates->values()->map(fn ($t, $i) => [
                        '@type' => 'ListItem',
                        'position' => $i + 1,
                        'name' => $t->name,
                        'url' => url('/templates/'.$t->key),
                    ])->all(),
                ],
            ],
            body: $body,
        );
    }

    /**
     * "/embed" and "/embed/templates" — the chromeless teaser gallery framed on
     * the WordPress site (the homepage's "Kad Kahwin Digital Paling Popular"
     * section and /kad/), rendered by resources/js/pages/EmbedGallery.tsx.
     *
     * noindex, FOLLOW, and no canonical:
     *   * noindex — it is a deliberately partial, chrome-free duplicate of "/":
     *     the same designs, in the same order, capped at ?limit. Indexing it
     *     would put a second thinner URL in the index competing with the real
     *     gallery. It would not help /kad/ or the homepage rank either way,
     *     because Google never credits iframe content to the page doing the
     *     framing — it crawls the iframe src as its own URL.
     *   * follow + body — the links are still a path to every /templates/<key>
     *     page. sitemap.xml is the dependable route in (a noindexed page's links
     *     lose weight over time), but this costs nothing and means a crawler
     *     that reaches the iframe src finds the catalog, not a dead end.
     *   * no canonical — a page must not both refuse indexing and nominate a
     *     canonical; those are contradictory signals.
     *
     * The ?kind / ?limit handling mirrors EmbedGallery so the server-rendered
     * list is the same set of designs the page actually draws.
     */
    private function embed(): array
    {
        $kind = in_array($this->query['kind'] ?? null, ['wedding', 'event'], true)
            ? $this->query['kind']
            : null;

        // Same clamp as the component: 1..50, default 10.
        $limit = (int) ($this->query['limit'] ?? 0);
        $limit = $limit > 0 ? min(50, $limit) : 10;

        $templates = $this->publishedTemplates()
            ->when($kind, fn ($c) => $c->filter(fn ($t) => ($t->kind ?: 'wedding') === $kind))
            ->take($limit);

        $body = '<h1>Koleksi Kad Kahwin & Kad Jemputan Digital</h1>';

        if ($templates->isNotEmpty()) {
            $body .= '<ul>';
            foreach ($templates as $t) {
                $body .= '<li><a href="'.e(url('/templates/'.$t->key)).'">'.e($t->name).'</a>'
                    .($t->category ? ' — '.e($t->category) : '').'</li>';
            }
            $body .= '</ul>';
        }

        // The component's own "see all designs" hand-off, so the full gallery is
        // one hop away for a crawler too.
        $body .= '<p><a href="'.e(url('/')).'">Lihat semua rekaan</a></p>';

        return $this->page(
            title: 'Koleksi Kad Jemputan — Portal Kahwin',
            description: null,
            index: false,
            follow: true,
            body: $body,
        );
    }

    /** "/templates/{key}" — one design's preview page. */
    private function template(string $key, string $site): array
    {
        $template = $this->attempt(fn () => Template::query()
            ->where('key', $key)
            ->where('is_active', true)
            ->where('status', 'approved')
            ->first(['key', 'name', 'category', 'kind', 'description', 'thumbnail']));

        // A pending or withdrawn submission still renders for staff, but it is
        // not a public page — don't advertise it. Same branch covers a failed
        // lookup: never claim a page is indexable without confirming it's public.
        if (! $template) {
            return $this->page(title: $site, description: null, index: false);
        }

        $description = $template->description
            ?: 'Reka bentuk '.$template->name.' — kad jemputan digital daripada Portal Kahwin, '
                .'lengkap dengan RSVP dan senarai tetamu.';

        return $this->page(
            title: $template->name.' — Reka Bentuk Kad Jemputan',
            description: $description,
            index: true,
            canonical: url('/templates/'.$template->key),
            image: $template->thumbnail,
            schema: [
                '@type' => 'Product',
                'name' => $template->name,
                'description' => $description,
                'url' => url('/templates/'.$template->key),
                'category' => $template->category,
                'brand' => ['@type' => 'Brand', 'name' => $site],
                'image' => $this->absolute($template->thumbnail),
            ],
            body: '<h1>'.e($template->name).'</h1>'
                .($template->category ? '<p>Kategori: '.e($template->category).'</p>' : '')
                .'<p>'.e($description).'</p>'
                .'<p><a href="'.e(url('/')).'">Lihat semua reka bentuk</a></p>',
        );
    }

    /** "/e/{slug}" — a live invitation card. */
    private function card(string $slug, string $site): array
    {
        $invitation = $this->attempt(fn () => Invitation::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first());

        // Unpublished, or the lookup failed — either way we cannot confirm this
        // is a public page, so it must not be indexed.
        if (! $invitation) {
            return $this->page(title: $site, description: null, index: false);
        }

        // A trial card is a watermarked, view-limited preview, not a finished
        // page — it must not be indexed, or the watermark becomes the search
        // result for that couple's name.
        $indexable = ! ($invitation->is_trial && ! $invitation->is_paid);

        $names = $this->coupleOrEventName($invitation);
        $when = $invitation->reception_at ?? $invitation->akad_at;
        $date = $invitation->date_label ?: $when?->translatedFormat('j F Y');

        $descriptionParts = array_filter([
            $names,
            $date,
            $invitation->venue_name,
        ]);

        return $this->page(
            title: $names,
            description: 'Jemputan '.implode(' · ', $descriptionParts).'. Sila hadir dan sahkan kehadiran anda.',
            index: $indexable,
            canonical: url('/e/'.$invitation->slug),
            image: $invitation->cover_image ?: $invitation->poster_image,
            schema: array_filter([
                '@type' => 'Event',
                'name' => $names,
                'url' => url('/e/'.$invitation->slug),
                'startDate' => $when?->toIso8601String(),
                'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
                'location' => $invitation->venue_name ? array_filter([
                    '@type' => 'Place',
                    'name' => $invitation->venue_name,
                    'address' => $invitation->venue_address,
                ]) : null,
                'image' => $this->absolute($invitation->cover_image ?: $invitation->poster_image),
            ]),
            body: '<h1>'.e($names).'</h1>'
                .($date ? '<p>'.e($date).'</p>' : '')
                .($invitation->venue_name ? '<p>'.e($invitation->venue_name).'</p>' : '')
                .($invitation->venue_address ? '<p>'.e($invitation->venue_address).'</p>' : ''),
        );
    }

    /**
     * "/e/{slug}/meja/{guest}" — a named guest's table assignment.
     *
     * Indexable only because the site owner asked for every public page to be,
     * and only when the host has NOT marked seat names private. It is kept out
     * of sitemap.xml either way: these URLs are handed to one guest at a time,
     * and there is no reason to hand the whole list to Google.
     */
    private function guestSeat(string $slug, string $site): array
    {
        $invitation = $this->attempt(fn () => Invitation::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first(['slug', 'seat_names_private', 'groom_name', 'bride_name', 'event_name', 'client_name', 'venue_name']));

        if (! $invitation || $invitation->seat_names_private) {
            return $this->page(title: $site, description: null, index: false);
        }

        $names = $this->coupleOrEventName($invitation);

        return $this->page(
            title: 'Meja Tetamu — '.$names,
            description: 'Maklumat meja tetamu untuk majlis '.$names.'.',
            index: true,
            // Canonical points at the card itself: a seat page is a per-guest
            // view of one invitation, not a page of its own that should compete
            // with it in the index.
            canonical: url('/e/'.$invitation->slug),
            body: '<h1>Meja tetamu</h1><p>'.e($names).'</p>'
                .'<p><a href="'.e(url('/e/'.$invitation->slug)).'">Lihat kad jemputan</a></p>',
        );
    }

    // ---- helpers -----------------------------------------------------------

    /** "Groom & Bride", or the event name for a non-wedding card. */
    private function coupleOrEventName(Invitation $invitation): string
    {
        if ($invitation->groom_name && $invitation->bride_name) {
            return $invitation->groom_name.' & '.$invitation->bride_name;
        }

        return $invitation->event_name
            ?: ($invitation->groom_name ?: $invitation->bride_name ?: $invitation->client_name ?: 'Jemputan');
    }

    /** A useful tab title for a noindexed app screen. */
    private function privateTitle(string $prefix, string $site): string
    {
        return match ($prefix) {
            'login' => 'Log Masuk — '.$site,
            'register', 'register-new-user', 'register-vendor', 'register-affiliate' => 'Daftar — '.$site,
            'forgot-password', 'reset-password', 'change-password' => 'Kata Laluan — '.$site,
            'admin' => 'Admin — '.$site,
            'panel' => 'Panel — '.$site,
            default => $site,
        };
    }

    /**
     * Build the view payload. `index: false` also drops the canonical and the
     * crawlable body — there's no point publishing either for a page we're
     * asking Google to forget.
     */
    private function page(
        string $title,
        ?string $description,
        bool $index,
        ?string $canonical = null,
        ?string $image = null,
        ?array $schema = null,
        ?string $body = null,
        ?bool $follow = null,
    ): array {
        // Links are followed on indexable pages; $follow only needs passing to
        // get the third state, "noindex but still a discovery path" (/embed).
        $follow ??= $index;

        return [
            'title' => $title,
            'description' => $description ? Str::limit(preg_replace('/\s+/', ' ', $description), 300, '') : null,
            'canonical' => $index ? $canonical : null,
            'robots' => ($index ? 'index' : 'noindex').', '.($follow ? 'follow' : 'nofollow')
                .($index ? ', max-snippet:-1, max-image-preview:large' : ''),
            'image' => $this->absolute($image) ?: $this->absolute('Portal-Kahwin-Header-2.webp'),
            'schema' => $index ? $schema : null,
            // A noindexed page keeps its body only when it's followable: the
            // text is there for the links in it, not to be indexed itself.
            'body' => ($index || $follow) ? $body : null,
        ];
    }

    /** The public catalog, in gallery order. Empty if the lookup fails. */
    private function publishedTemplates(): \Illuminate\Support\Collection
    {
        return $this->attempt(fn () => Template::query()
            ->where('is_active', true)
            ->where('status', 'approved')
            ->orderBy('sort_order')
            ->get(['key', 'name', 'category', 'kind', 'description', 'thumbnail'])) ?? collect();
    }

    /**
     * Run an SEO lookup, returning null if it throws.
     *
     * The shell is every page of the app, so a database hiccup here would be a
     * 500 on the entire site rather than a page with thinner metadata. Callers
     * treat null as "cannot confirm this page is public", which degrades to
     * noindex rather than to a wrong claim.
     */
    private function attempt(callable $query): mixed
    {
        try {
            return $query();
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    private function absolute(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return Str::startsWith($path, ['http://', 'https://']) ? $path : asset($path);
    }
}
