import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TemplateCard } from '../components/TemplateCard';
import { api } from '../lib/api';
import { absoluteUrl } from '../lib/base';
import { useLang, dict } from '../context/LangContext';

/**
 * A chromeless, public template gallery meant to be dropped into an <iframe> on
 * the admin's own WordPress site (generated in Admin → Settings → Embed).
 *
 * It reuses the same TemplateCard as the real gallery, but every action opens
 * the LIVE PortalKahwin site in a NEW TAB (absolute href) rather than navigating
 * inside the little iframe — so a visitor browsing on the WordPress page is
 * handed off cleanly to try/order a design. No app nav, no login CTA, no
 * footer chrome — just the grid and a subtle "powered by" link.
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
    // ?kind=wedding|event|all sets the initial filter (from the embed generator).
    const initialKind = (['wedding', 'event', 'all'] as const).find((k) => k === params.get('kind')) ?? 'all';

    const [templates, setTemplates] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [kind, setKind] = useState<'all' | 'wedding' | 'event'>(initialKind);
    const [cat, setCat] = useState<string>('all');
    const [flow, setFlow] = useState<'trial' | 'buy'>('trial');

    const C = dict({
        bm: { free: 'Percuma', preview: 'Pratonton', order: 'Tempah', test: 'Cuba', all: 'Semua', weddings: 'Kad Kahwin', events: 'Acara', category: 'Kategori', none: 'Tiada rekaan.', popular: 'POPULAR', save: 'Jimat', poweredBy: 'Dikuasakan oleh PortalKahwin', cta: 'Lihat semua rekaan' },
        en: { free: 'Free', preview: 'Preview', order: 'Order', test: 'Test', all: 'All', weddings: 'Weddings', events: 'Events', category: 'Category', none: 'No designs.', popular: 'POPULAR', save: 'Save', poweredBy: 'Powered by PortalKahwin', cta: 'See all designs' },
        zh: { free: '免费', preview: '预览', order: '订购', test: '试用', all: '全部', weddings: '婚礼', events: '活动', category: '分类', none: '暂无设计。', popular: '热门', save: '省', poweredBy: '由 PortalKahwin 提供', cta: '查看全部设计' },
    }, lang);

    useEffect(() => {
        api.get<TemplateRow[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
        api.get<{ signup_flow?: string }>('/settings')
            .then((r) => setFlow(r.data?.signup_flow === 'buy' ? 'buy' : 'trial'))
            .catch(() => { /* keep the trial default */ });
    }, []);

    const kindOf = (t: TemplateRow) => (t.kind ?? 'wedding');
    const inKind = (t: TemplateRow) => kind === 'all' || kindOf(t) === kind;
    const categories = useMemo(
        () => [...new Set(templates.filter(inKind).map((t) => t.category).filter(Boolean))].sort(),
        [templates, kind],
    );

    const visible = templates
        .filter((t) => inKind(t) && (cat === 'all' || t.category === cat))
        .map((t, i) => ({ t, i }))
        .sort((a, b) => {
            const r = langRank(a.t, lang) - langRank(b.t, lang);
            if (r) return r;
            return a.i - b.i;
        })
        .map((x) => x.t);

    // Keep the viewer's language on the hand-off links so the live site opens
    // in the same language they were browsing in.
    const q = lang && lang !== 'bm' ? `?lang=${lang === 'zh' ? 'zh' : 'en'}` : '';
    const link = (path: string) => absoluteUrl(path) + q;

    return (
        <div style={page}>
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 16px 8px' }}>
                {/* Compact filter bar (same look as the site gallery). */}
                <div className="gal-filters" style={{ marginTop: 0 }}>
                    <div className="gal-tabs" role="tablist" style={{ marginRight: 'auto' }}>
                        {([['all', C.all], ['wedding', C.weddings], ['event', C.events]] as const).map(([id, label]) => (
                            <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? 'on' : ''} onClick={() => { setKind(id); setCat('all'); }}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <label className="gal-cat">
                        <span>{C.category}</span>
                        <select value={cat} onChange={(e) => setCat(e.target.value)}>
                            <option value="all">{C.all}</option>
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </label>
                </div>

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
