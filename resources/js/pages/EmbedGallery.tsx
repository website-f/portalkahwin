import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TemplateCard } from '../components/TemplateCard';
import { api } from '../lib/api';
import { absoluteUrl } from '../lib/base';
import { useLang, dict } from '../context/LangContext';

/**
 * A chromeless, public template TEASER meant to be dropped into an <iframe> on
 * the admin's own WordPress site (generated in Admin → Settings → Embed).
 *
 * It shows only the first N designs (default 10) — a promotional showcase, not
 * the whole catalogue — and every action opens the LIVE PortalKahwin site in a
 * NEW TAB (absolute href) so a visitor is handed off cleanly to try/order a
 * design or browse the full collection via the "See all designs" link.
 *
 * Query params (set by the embed generator): ?kind=wedding|event|all,
 * ?limit=<1..50>, ?lang=. No app nav / login CTA / footer chrome.
 */
interface TemplateRow {
    id: string;
    key: string;
    name: string;
    category: string;
    kind?: string | null;
    tier: 'free' | 'premium';
    price_myr: string | number;
    discount_price_myr?: string | number | null;
    languages?: string[] | null;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
    config?: Record<string, unknown> | null;
    usage_count?: number;
    created_at?: string;
}

function langRank(t: TemplateRow, lang: string): number {
    const langs = t.languages ?? [];
    if (langs.includes(lang)) return 0;
    if (langs.length === 0) return 1;
    return 2;
}

export function EmbedGallery() {
    const { lang } = useLang();
    const [params] = useSearchParams();
    // ?kind scopes the teaser; ?limit caps how many designs show (default 10).
    const kind = (['wedding', 'event', 'all'] as const).find((k) => k === params.get('kind')) ?? 'all';
    const limit = Math.max(1, Math.min(50, Number(params.get('limit')) || 10));

    const [templates, setTemplates] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [flow, setFlow] = useState<'trial' | 'buy'>('trial');

    const C = dict({
        bm: { free: 'Percuma', preview: 'Pratonton', order: 'Tempah', test: 'Cuba', none: 'Tiada rekaan.', popular: 'POPULAR', save: 'Jimat', poweredBy: 'Dikuasakan oleh PortalKahwin', cta: 'Lihat semua rekaan' },
        en: { free: 'Free', preview: 'Preview', order: 'Order', test: 'Test', none: 'No designs.', popular: 'POPULAR', save: 'Save', poweredBy: 'Powered by PortalKahwin', cta: 'See all designs' },
        zh: { free: '免费', preview: '预览', order: '订购', test: '试用', none: '暂无设计。', popular: '热门', save: '省', poweredBy: '由 PortalKahwin 提供', cta: '查看全部设计' },
    }, lang);

    useEffect(() => {
        api.get<TemplateRow[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
        api.get<{ signup_flow?: string }>('/settings')
            .then((r) => setFlow(r.data?.signup_flow === 'buy' ? 'buy' : 'trial'))
            .catch(() => { /* keep the trial default */ });
    }, []);

    const kindOf = (t: TemplateRow) => (t.kind ?? 'wedding');

    // The first `limit` designs of the chosen kind, in the site's own order
    // (language-matched designs first, then the API's sort order).
    const visible = templates
        .filter((t) => kind === 'all' || kindOf(t) === kind)
        .map((t, i) => ({ t, i }))
        .sort((a, b) => (langRank(a.t, lang) - langRank(b.t, lang)) || (a.i - b.i))
        .slice(0, limit)
        .map((x) => x.t);

    // Keep the viewer's language on the hand-off links.
    const q = lang && lang !== 'bm' ? `?lang=${lang === 'zh' ? 'zh' : 'en'}` : '';
    const link = (path: string) => absoluteUrl(path) + q;

    return (
        <div style={page}>
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 16px 8px' }}>
                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : visible.length === 0 ? (
                    <p className="muted center" style={{ padding: '40px 0' }}>{C.none}</p>
                ) : (
                    <div className="gal-grid">
                        {visible.map((t) => (
                            <TemplateCard
                                key={t.id}
                                t={t}
                                deviceHref={link(`/templates/${t.key}`)}
                                labels={{ free: C.free, popular: C.popular, save: C.save }}
                                actions={[
                                    flow === 'trial'
                                        ? { label: C.test, href: link(`/try/${t.key}`) }
                                        : { label: C.order, href: link(`/register-new-user?tpl=${t.key}`), tone: 'gold' },
                                    { label: C.preview, href: link(`/templates/${t.key}`) },
                                ]}
                            />
                        ))}
                    </div>
                )}

                {/* Subtle attribution + a hand-off to the full collection. */}
                <div style={footer}>
                    <a href={link('/')} target="_blank" rel="noreferrer" style={ctaLink}>{C.cta} →</a>
                    <a href={link('/')} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>{C.poweredBy}</a>
                </div>
            </div>
        </div>
    );
}

const page: React.CSSProperties = {
    background: 'var(--bg, #fff)',
    minHeight: '100vh',
    color: 'var(--ink)',
};
const footer: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, padding: '20px 4px 26px', marginTop: 8, borderTop: '1px solid var(--line)', fontSize: 13,
};
const ctaLink: React.CSSProperties = {
    fontWeight: 700, color: 'var(--plum)', textDecoration: 'none',
};
