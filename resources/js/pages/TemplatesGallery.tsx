import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, QrCode, Sparkles, type LucideIcon } from 'lucide-react';
import { SiteNav } from '../components/SiteNav';
import { TemplateCard } from '../components/TemplateCard';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

/** Icons for the three hero "top features" (matched by index). */
const FEATURE_ICONS: LucideIcon[] = [Users, QrCode, Sparkles];

interface TemplateRow {
    id: string;
    key: string;
    name: string;
    category: string;
    kind?: string | null;
    description?: string;
    tier: 'free' | 'premium';
    price_myr: string | number;
    languages?: string[] | null;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
    config?: Record<string, unknown> | null;
    /** Incremented each time a card is created from this design. */
    usage_count?: number;
    created_at?: string;
}

/** Ranking so designs tagged for the viewer's current language float to the top. */
function langRank(t: TemplateRow, lang: string): number {
    const langs = t.languages ?? [];
    if (langs.includes(lang)) return 0;   // made for this language (e.g. Chinese in 中文)
    if (langs.length === 0) return 1;     // universal
    return 2;                              // tagged for other languages only
}

export function TemplatesGallery() {
    const { lang } = useLang();
    const [templates, setTemplates] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [cat, setCat] = useState<string>('all');
    const [kind, setKind] = useState<'all' | 'wedding' | 'event'>('all');
    const [sort, setSort] = useState<'default' | 'popular' | 'latest'>('default');
    // Which primary CTA to show: 'trial' → Test (fill it in first), 'buy' → Order.
    const [flow, setFlow] = useState<'trial' | 'buy'>('trial');
    const C = dict({
        bm: {
            title: 'Templat Jemputan Digital', titleEv: 'Templat Jemputan Digital',
            subtitle: 'Sesuai untuk majlis kahwin, hari jadi dan acara korporat. Reka jemputan animasi yang elegan tanpa risiko dengan janji “Buat Dahulu, Bayar Kemudian” kami.',
            featuresTitle: 'Ciri Utama',
            features: [
                { name: 'Susunan Tetamu Pintar', desc: 'Pengurusan meja yang mudah.' },
                { name: 'Daftar Masuk Kod QR', desc: 'Kemasukan pantas dan lancar di pintu.' },
                { name: 'Animasi Premium', desc: 'Pengalaman interaktif yang indah untuk tetamu anda.' },
            ],
            tryToday: 'Log masuk dan cuba hari ini!',
            free: 'Percuma',
            preview: 'Pratonton',
            use: 'Gunakan', order: 'Tempah', test: 'Cuba',
            category: 'Kategori', all: 'Semua', weddings: 'Kad Kahwin', events: 'Acara',
            sortDefault: 'Default', sortPopular: 'Popular', sortLatest: 'Terkini',
            popular: 'POPULAR', none: 'Tiada rekaan dalam kategori ini.',
        },
        en: {
            title: 'Digital Invitations Template', titleEv: 'Digital Invitations Template',
            subtitle: 'Perfect for weddings, birthdays, and corporate events. Design your elegant, animated invitations risk-free with our “Do First, Pay Later” promise.',
            featuresTitle: 'Top Features',
            features: [
                { name: 'Smart Guest Seating', desc: 'Easy table management.' },
                { name: 'QR Code Check-in', desc: 'Fast, seamless entry at the door.' },
                { name: 'Premium Animations', desc: 'A beautifully interactive experience for your guests.' },
            ],
            tryToday: 'Log in and try it today!',
            free: 'Free',
            preview: 'Preview',
            use: 'Use', order: 'Order', test: 'Test',
            category: 'Category', all: 'All', weddings: 'Weddings', events: 'Events',
            sortDefault: 'Default', sortPopular: 'Popular', sortLatest: 'Latest',
            popular: 'POPULAR', none: 'No designs in this category.',
        },
        zh: {
            title: '电子请柬模板', titleEv: '电子请柬模板',
            subtitle: '适合婚礼、生日与企业活动。用我们的“先做后付”承诺，零风险设计您优雅的动画请柬。',
            featuresTitle: '核心功能',
            features: [
                { name: '智能宾客座位', desc: '轻松管理餐桌。' },
                { name: '二维码签到', desc: '门口快速、顺畅入场。' },
                { name: '高级动画', desc: '为宾客带来精美的互动体验。' },
            ],
            tryToday: '立即登录试用！',
            free: '免费',
            preview: '预览',
            use: '使用', order: '订购', test: '试用',
            category: '分类', all: '全部', weddings: '婚礼', events: '活动',
            sortDefault: '默认', sortPopular: '热门', sortLatest: '最新',
            popular: '热门', none: '此分类暂无设计。',
        },
    }, lang);

    useEffect(() => {
        api.get<TemplateRow[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
        api.get<{ signup_flow?: string }>('/settings')
            .then((r) => setFlow(r.data?.signup_flow === 'buy' ? 'buy' : 'trial'))
            .catch(() => { /* keep the trial default */ });
    }, []);

    // Wedding vs event split — a card's kind defaults to wedding.
    const kindOf = (t: TemplateRow) => (t.kind ?? 'wedding');
    const inKind = (t: TemplateRow) => kind === 'all' || kindOf(t) === kind;
    // Categories come from the data (within the chosen kind), so adding one in admin needs no code change.
    const categories = [...new Set(templates.filter(inKind).map((t) => t.category).filter(Boolean))].sort();

    const visible = templates
        .filter((t) => inKind(t) && (cat === 'all' || t.category === cat))
        // Stable index so equal-rank designs keep the API's sort_order.
        .map((t, i) => ({ t, i }))
        .sort((a, b) => {
            // Designs made for the viewer's current language always come first —
            // switch to 中文 and the Chinese cards float to the top.
            const r = langRank(a.t, lang) - langRank(b.t, lang);
            if (r) return r;
            // Real data: usage_count is bumped whenever a card is created from a
            // design, and created_at is the row's own timestamp.
            if (sort === 'popular') { const d = (b.t.usage_count ?? 0) - (a.t.usage_count ?? 0); if (d) return d; }
            else if (sort === 'latest') { const d = (b.t.created_at ?? '').localeCompare(a.t.created_at ?? ''); if (d) return d; }
            return a.i - b.i;
        })
        .map((x) => x.t);

    return (
        <div>
            <SiteNav />
            <section className="section">
                <div className="container">
                    <h2>{C.title}</h2>
                    <p className="sub" style={{ marginBottom: 26 }}>{C.subtitle}</p>

                    {/* Top features + a log-in-and-try call to action. */}
                    <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
                        {C.featuresTitle}
                    </div>
                    <div style={heroFeatures}>
                        {(C.features as { name: string; desc: string }[]).map((f, i) => {
                            const Icon = FEATURE_ICONS[i] ?? Sparkles;
                            return (
                                <div key={i} style={heroFeatCard}>
                                    <span style={heroFeatIcon}><Icon size={19} /></span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={heroFeatName}>{f.name}</div>
                                        <div style={heroFeatDesc}>{f.desc}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ textAlign: 'center', margin: '0 0 40px' }}>
                        <Link to="/login" className="btn btn-gold">
                            <Sparkles size={16} /> {C.tryToday}
                        </Link>
                    </div>

                    {/* Filter bar: category on the left, sort tabs on the right.
                        Same controls on mobile and desktop — it wraps rather than
                        turning into a different UI. */}
                    <div className="gal-filters">
                        <div className="gal-tabs" role="tablist" style={{ marginRight: 'auto' }}>
                            {([['all', C.all], ['wedding', C.weddings], ['event', C.events]] as const).map(([id, label]) => (
                                <button
                                    key={id}
                                    role="tab"
                                    aria-selected={kind === id}
                                    className={kind === id ? 'on' : ''}
                                    onClick={() => { setKind(id); setCat('all'); }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <label className="gal-cat">
                            <span>{C.category}</span>
                            <select value={cat} onChange={(e) => setCat(e.target.value)}>
                                <option value="all">{C.all}</option>
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </label>

                        <div className="gal-tabs" role="tablist">
                            {([['default', C.sortDefault], ['popular', C.sortPopular], ['latest', C.sortLatest]] as const).map(([id, label]) => (
                                <button
                                    key={id}
                                    role="tab"
                                    aria-selected={sort === id}
                                    className={sort === id ? 'on' : ''}
                                    onClick={() => setSort(id)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
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
                                    labels={{ free: C.free, popular: C.popular, save: dict({ bm: 'Jimat', en: 'Save', zh: '省' }, lang) }}
                                    actions={[
                                        flow === 'trial'
                                            ? { label: C.test, to: `/try/${t.key}` }
                                            : { label: C.order, to: `/register-new-user?tpl=${t.key}` },
                                        { label: C.preview, to: `/templates/${t.key}` },
                                    ]}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>
            <MadeByPortalKahwin style={{ paddingBottom: 32 }} />
        </div>
    );
}

/* ---------------- Hero "top features" styles ---------------- */
const heroFeatures: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
    maxWidth: 820, margin: '0 auto 22px',
};
const heroFeatCard: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 11, textAlign: 'left',
    flex: '1 1 230px', maxWidth: 260, padding: '13px 15px',
    background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 14,
};
const heroFeatIcon: React.CSSProperties = {
    flexShrink: 0, width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center',
    background: '#fff', border: '1px solid var(--gold-soft)', color: 'var(--gold)',
};
const heroFeatName: React.CSSProperties = { fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' };
const heroFeatDesc: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 };
