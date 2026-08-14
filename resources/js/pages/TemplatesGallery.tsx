import { useEffect, useState } from 'react';
import { SiteNav } from '../components/SiteNav';
import { TemplateCard } from '../components/TemplateCard';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

interface TemplateRow {
    id: string;
    key: string;
    name: string;
    category: string;
    description?: string;
    tier: 'free' | 'premium';
    price_myr: string | number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
    config?: Record<string, unknown> | null;
    /** Incremented each time a card is created from this design. */
    usage_count?: number;
    created_at?: string;
}

export function TemplatesGallery() {
    const { lang } = useLang();
    const [templates, setTemplates] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [cat, setCat] = useState<string>('all');
    const [sort, setSort] = useState<'default' | 'popular' | 'latest'>('default');
    // Which primary CTA to show: 'trial' → Test (fill it in first), 'buy' → Order.
    const [flow, setFlow] = useState<'trial' | 'buy'>('trial');
    const C = dict({
        bm: {
            title: 'Koleksi Kad Kahwin',
            subtitle: 'Setiap rekaan hadir dengan gerak halus dan suasana tersendiri. Buka pratonton untuk melihat keseluruhan jemputan.',
            free: 'Percuma',
            preview: 'Pratonton',
            use: 'Gunakan', order: 'Tempah', test: 'Cuba',
            category: 'Kategori', all: 'Semua',
            sortDefault: 'Default', sortPopular: 'Popular', sortLatest: 'Terkini',
            popular: 'POPULAR', none: 'Tiada rekaan dalam kategori ini.',
        },
        en: {
            title: 'Wedding Card Templates',
            subtitle: 'Every template is designed with elegant scroll animation. Open a full preview before choosing.',
            free: 'Free',
            preview: 'Preview',
            use: 'Use', order: 'Order', test: 'Test',
            category: 'Category', all: 'All',
            sortDefault: 'Default', sortPopular: 'Popular', sortLatest: 'Latest',
            popular: 'POPULAR', none: 'No designs in this category.',
        },
        zh: {
            title: '婚礼请柬设计',
            subtitle: '每款设计都配有细腻的滚动动画与独特氛围。选择前可先浏览完整预览。',
            free: '免费',
            preview: '预览',
            use: '使用', order: '订购', test: '试用',
            category: '分类', all: '全部',
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

    // Categories come from the data, so adding one in admin needs no code change.
    const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))].sort();

    const visible = templates
        .filter((t) => cat === 'all' || t.category === cat)
        .slice()
        .sort((a, b) => {
            // Real data: usage_count is bumped whenever a card is created from a
            // design, and created_at is the row's own timestamp.
            if (sort === 'popular') return (b.usage_count ?? 0) - (a.usage_count ?? 0);
            if (sort === 'latest') return (b.created_at ?? '').localeCompare(a.created_at ?? '');
            return 0;
        });

    return (
        <div>
            <SiteNav />
            <section className="section">
                <div className="container">
                    <h2>{C.title}</h2>
                    <p className="sub">{C.subtitle}</p>

                    {/* Filter bar: category on the left, sort tabs on the right.
                        Same controls on mobile and desktop — it wraps rather than
                        turning into a different UI. */}
                    <div className="gal-filters">
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
                                    labels={{ free: C.free, popular: C.popular }}
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
