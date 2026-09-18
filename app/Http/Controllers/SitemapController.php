<?php

namespace App\Http\Controllers;

use App\Models\Invitation;
use App\Models\Template;
use App\Support\AppSeo;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * XML sitemap for the app's public pages.
     *
     * Google will not find these on its own: the app is a client-rendered SPA
     * mounted at /app under a WordPress site, so there is no crawlable path of
     * <a href> links from the domain root into it. This file is that path — which
     * makes submitting it the step that actually gets /app indexed.
     *
     * Deliberately NOT listed:
     *   * /e/<slug>/meja/<guest> — a per-guest table assignment. Each URL is
     *     handed to one person; there is no reason to hand the whole list to
     *     Google, even though the page itself is indexable.
     *   * /pass/<token> — the token in the URL is the credential.
     *   * trial cards — watermarked, view-limited previews (noindexed in AppSeo).
     *   * /panel, /admin, auth screens — private.
     */
    public function __invoke(): Response
    {
        $urls = [['loc' => AppSeo::homeUrl(), 'lastmod' => null]];

        foreach (Template::query()
            ->where('is_active', true)
            ->where('status', 'approved')
            ->orderBy('sort_order')
            ->get(['key', 'updated_at']) as $template) {
            $urls[] = [
                'loc' => url('/templates/'.$template->key),
                'lastmod' => $template->updated_at?->toDateString(),
            ];
        }

        foreach (Invitation::query()
            ->where('status', 'published')
            ->where(fn ($q) => $q->where('is_trial', false)->orWhere('is_paid', true))
            ->get(['slug', 'updated_at']) as $invitation) {
            $urls[] = [
                'loc' => url('/e/'.$invitation->slug),
                'lastmod' => $invitation->updated_at?->toDateString(),
            ];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        foreach ($urls as $url) {
            $xml .= '  <url><loc>'.htmlspecialchars($url['loc'], ENT_XML1).'</loc>';
            if ($url['lastmod']) {
                $xml .= '<lastmod>'.$url['lastmod'].'</lastmod>';
            }
            $xml .= "</url>\n";
        }

        $xml .= '</urlset>';

        return response($xml, 200)->header('Content-Type', 'application/xml');
    }
}
