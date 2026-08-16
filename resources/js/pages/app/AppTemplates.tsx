import { useEffect, useRef, useState } from 'react';
import { url as appUrl } from '../../lib/base';
import { Link } from 'react-router-dom';
import { Palette as PaletteIcon, Sparkles, ArrowRight, X, ShoppingCart } from 'lucide-react';
import { api } from '../../lib/api';
import { TemplateCard } from '../../components/TemplateCard';
import { UseTemplateModal } from '../../components/UseTemplateModal';
import { useLang, dict } from '../../context/LangContext';
import { useAuth, isStaff } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface Tpl {
    id: string; key: string; name: string; category: string; kind?: string | null;
    description?: string; tier: 'free' | 'premium'; price_myr: string | number;
    languages?: string[] | null;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
    config?: Record<string, unknown> | null;
    usage_count?: number;
}

type Filter = 'all' | 'free' | 'paid' | 'owned';

/** Ranking so designs tagged for the viewer's current language float to the top. */
function langRank(t: Tpl, lang: string): number {
    const langs = t.languages ?? [];
    if (langs.includes(lang)) return 0;   // made for this language
    if (langs.length === 0) return 1;     // universal
    return 2;                              // tagged for other languages only
}

export function AppTemplates() {
    const { lang } = useLang();
    const { user } = useAuth();
    const { add, has } = useCart();
    const [toast, setToast] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Per-template ownership: a design is usable if it's free, the user bought it, or they're premium/admin.
    const owns = (t: Tpl) => t.tier === 'free' || isStaff(user) || user?.plan === 'premium' || !!user?.owned_templates?.includes(t.key);
    // Subscription accounts (vendors, staff, premium) get EVERY design free & unlimited —
    // the credit / buy-again / cart flow is only for normal users & affiliates.
    const unlimited = isStaff(user) || user?.role === 'vendor' || user?.plan === 'premium';
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [kindF, setKindF] = useState<'all' | 'wedding' | 'event'>('all');
    const [cat, setCat] = useState('all');
    const [langFilter, setLangFilter] = useState('all');
    const [allowContribute, setAllowContribute] = useState(false);
    // Saved / favourite template keys for the logged-in user (any role).
    const [favs, setFavs] = useState<Set<string>>(new Set());
    // "Use" opens the shared create modal (names for THIS event, design pre-picked).
    const [useTpl, setUseTpl] = useState<Tpl | null>(null);

    const C = dict({
        bm: { title: 'Rekaan Kad', subtitle: 'Pilih rekaan yang sejiwa dengan majlis anda, kemudian mula mengolah kad.', free: 'Percuma', owned: 'Dimiliki', preview: 'Pratonton', use: 'Gunakan', addToCart: 'Tambah ke Troli', popular: 'POPULAR', inCart: 'Dalam troli', added: 'Rekaan ditambah ke troli', viewCart: 'Lihat troli', dismiss: 'Tutup', tabAll: 'Semua', tabFree: 'Percuma', tabPaid: 'Berbayar', tabOwned: 'Dimiliki', kAll: 'Semua', weddings: 'Kad Kahwin', events: 'Acara', save: 'Simpan', unsave: 'Buang simpanan', contributeTitle: 'Reka Rekaan Anda Sendiri', contributeSub: 'Bina kad dari mula — warna, kulit, kesan & hiasan pilihan anda — dan kongsikannya dengan komuniti.', contributeCta: 'Mula Mereka', catAll: 'Semua kategori', langAll: 'Semua bahasa', empty: 'Tiada rekaan sepadan dengan tapisan ini.', creditAvailable: 'Kredit tersedia', creditsLabel: (n: number) => `✓ ${n} kredit`, buyAgain: 'Beli lagi', included: '✓ Termasuk pelan', createTitle: 'Cipta kad', groomName: 'Nama pengantin lelaki', brideName: 'Nama pengantin perempuan', groomPh: 'cth. Adam', bridePh: 'cth. Hawa', create: 'Cipta Kad', creating: 'Mencipta…', cancel: 'Batal', createFailed: 'Kad belum berjaya dicipta. Sila cuba lagi.', useHint: 'Setiap kad untuk satu majlis. Masukkan nama pasangan untuk mula.' },
        en: { title: 'Templates', subtitle: 'Browse the collection — pick one to create your card', free: 'Free', owned: 'Owned', preview: 'Preview', use: 'Use template', addToCart: 'Add to cart', popular: 'POPULAR', inCart: 'In cart', added: 'Added to cart', viewCart: 'View cart', dismiss: 'Dismiss', tabAll: 'All', tabFree: 'Free', tabPaid: 'Paid', tabOwned: 'Owned', kAll: 'All', weddings: 'Weddings', events: 'Events', save: 'Save', unsave: 'Unsave', contributeTitle: 'Design your own', contributeSub: 'Build a card from scratch — your colours, cover, effects & ornaments — and share it with the community.', contributeCta: 'Start designing', catAll: 'All categories', langAll: 'All languages', empty: 'No designs match these filters.', creditAvailable: 'Credit available', creditsLabel: (n: number) => `✓ ${n} credit${n === 1 ? '' : 's'}`, buyAgain: 'Buy again', included: '✓ Included in plan', createTitle: 'Create a card', groomName: "Groom's name", brideName: "Bride's name", groomPh: 'e.g. Adam', bridePh: 'e.g. Hawa', create: 'Create card', creating: 'Creating…', cancel: 'Cancel', createFailed: 'Failed to create card. Please try again.', useHint: "Each card is for one event. Enter the couple's names to start." },
        zh: { title: '请柬设计', subtitle: '浏览作品集 — 选一款开始制作您的请柬', free: '免费', owned: '已拥有', preview: '预览', use: '使用设计', addToCart: '加入购物车', popular: '热门', inCart: '已在购物车', added: '已加入购物车', viewCart: '查看购物车', dismiss: '关闭', tabAll: '全部', tabFree: '免费', tabPaid: '付费', tabOwned: '已拥有', kAll: '全部', weddings: '婚礼', events: '活动', save: '收藏', unsave: '取消收藏', contributeTitle: '设计属于你的作品', contributeSub: '从零开始制作请柬 — 自选配色、封面、动效与装饰 — 并分享给社区。', contributeCta: '开始设计', catAll: '所有分类', langAll: '所有语言', empty: '没有符合筛选条件的设计。', creditAvailable: '可用额度', creditsLabel: (n: number) => `✓ ${n} 个额度`, buyAgain: '再次购买', included: '✓ 已含于套餐', createTitle: '创建请柬', groomName: '男方姓名', brideName: '女方姓名', groomPh: '例如 Adam', bridePh: '例如 Hawa', create: '创建请柬', creating: '创建中…', cancel: '取消', createFailed: '请柬创建失败，请重试。', useHint: '每张请柬用于一个婚礼。输入新人姓名即可开始。' },
    }, lang);

    useEffect(() => {
        api.get<Tpl[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
        api.get<{ allow_user_templates?: boolean }>('/settings')
            .then((r) => setAllowContribute(!!r.data?.allow_user_templates))
            .catch(() => setAllowContribute(false));
    }, []);

    // Load this user's saved designs (any logged-in role has favourites).
    useEffect(() => {
        if (!user) return;
        api.get<{ keys: string[] }>('/me/favorites')
            .then((r) => setFavs(new Set(r.data.keys)))
            .catch(() => setFavs(new Set()));
    }, [user]);

    // Toggle a favourite optimistically; revert to the previous state if the request fails.
    async function toggleFav(t: Tpl) {
        const key = t.key;
        const wasFav = favs.has(key);
        setFavs((prev) => {
            const next = new Set(prev);
            if (wasFav) next.delete(key); else next.add(key);
            return next;
        });
        try {
            await api.post('/me/favorites/toggle', { key });
        } catch {
            setFavs((prev) => {
                const next = new Set(prev);
                if (wasFav) next.add(key); else next.delete(key);
                return next;
            });
        }
    }

    // Add to cart (idempotent) and surface a transient toast — do NOT navigate away.
    function addToCart(t: Tpl) {
        add({ key: t.key, name: t.name, price: Number(t.price_myr), thumbnail: t.thumbnail ?? null });
        setToast(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(false), 2500);
    }

    function dismissToast() {
        setToast(false);
        if (toastTimer.current) clearTimeout(toastTimer.current);
    }

    // Clear any pending toast timer on unmount.
    useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    const tabs: { id: Filter; label: string }[] = [
        { id: 'all', label: C.tabAll },
        { id: 'free', label: C.tabFree },
        { id: 'paid', label: C.tabPaid },
        { id: 'owned', label: C.tabOwned },
    ];
    // Wedding vs event split (defaults to wedding).
    const kindOf = (t: Tpl) => (t.kind ?? 'wedding');
    // Categories present in the catalogue (within the chosen kind), for the dropdown.
    const categories = Array.from(new Set(templates.filter((t) => kindF === 'all' || kindOf(t) === kindF).map((t) => t.category).filter(Boolean))).sort();
    const filtered = templates
        .filter((t) => {
            if (kindF !== 'all' && kindOf(t) !== kindF) return false;
            if (filter === 'free' && t.tier !== 'free') return false;
            if (filter === 'paid' && t.tier !== 'premium') return false;
            if (filter === 'owned' && !owns(t)) return false;
            if (cat !== 'all' && t.category !== cat) return false;
            if (langFilter !== 'all') {
                const langs = t.languages ?? [];
                // A language filter matches that language OR a universal (untagged) design.
                if (langs.length > 0 && !langs.includes(langFilter)) return false;
            }
            return true;
        })
        // Stable sort: designs made for the viewer's current language come first.
        .map((t, i) => ({ t, i }))
        .sort((a, b) => langRank(a.t, lang) - langRank(b.t, lang) || a.i - b.i)
        .map((x) => x.t);

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {allowContribute && (
                <Link to="/panel/designs" className="panel" style={ctaStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                        <div style={ctaIcon}><PaletteIcon size={22} /></div>
                        <div style={{ minWidth: 0 }}>
                            <strong style={{ display: 'block' }}>{C.contributeTitle}</strong>
                            <span className="muted" style={{ fontSize: 13 }}>{C.contributeSub}</span>
                        </div>
                    </div>
                    <span className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                        <Sparkles size={15} /> {C.contributeCta} <ArrowRight size={15} />
                    </span>
                </Link>
            )}

            {/* Wedding vs event kind — primary split above the free/paid tabs. */}
            <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {([['all', C.kAll], ['wedding', C.weddings], ['event', C.events]] as const).map(([id, label]) => (
                    <button
                        key={id}
                        className={`btn btn-sm ${kindF === id ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setKindF(id); setCat('all'); }}
                        aria-pressed={kindF === id}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {tabs.map((tb) => (
                    <button
                        key={tb.id}
                        className={`btn btn-sm ${filter === tb.id ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setFilter(tb.id)}
                        aria-pressed={filter === tb.id}
                    >
                        {tb.label}
                    </button>
                ))}
            </div>

            <div className="row" style={{ gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                <select value={cat} onChange={(e) => setCat(e.target.value)} style={filterSelect} aria-label={C.catAll}>
                    <option value="all">{C.catAll}</option>
                    {categories.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                </select>
                <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} style={filterSelect} aria-label={C.langAll}>
                    <option value="all">{C.langAll}</option>
                    <option value="bm">BM</option>
                    <option value="en">EN</option>
                    <option value="zh">中文</option>
                </select>
            </div>

            {/* Same card as the public gallery — a design should look the same
                wherever it is listed; only the actions differ by page. */}
            {filtered.length === 0 ? (
                <div className="panel center muted" style={{ padding: 40 }}>{C.empty}</div>
            ) : (
            <div className="gal-grid">
                {filtered.map((t) => {
                    const mine = owns(t);
                    // Subscription accounts use everything free (no cart / credit / buy-again).
                    // Normal users & affiliates follow the consumable model: 1 purchase = 1 card,
                    // "Use" when usable now (free, or a held credit), else buy; owned paid → Buy again.
                    const credits = user?.template_credits?.[t.key] ?? 0;
                    const ownedLabel = unlimited ? C.included : (credits > 0 ? C.creditsLabel(credits) : C.creditAvailable);
                    const buyAction = has(t.key)
                        ? { label: C.inCart, to: '/panel/cart', tone: 'gold' as const }
                        : { label: mine ? C.buyAgain : C.addToCart, onClick: () => addToCart(t), tone: 'gold' as const };
                    const useAction = { label: C.use, onClick: () => setUseTpl(t) };
                    const previewAction = { label: C.preview, href: appUrl(`/templates/${t.key}`) };
                    const actions = (unlimited || t.tier === 'free')
                        ? [useAction, previewAction]
                        : mine ? [useAction, buyAction] : [buyAction, previewAction];
                    return (
                        <TemplateCard
                            key={t.id}
                            t={t}
                            owned={unlimited ? t.tier === 'premium' : (mine && t.tier === 'premium')}
                            labels={{ free: C.free, popular: C.popular, owned: ownedLabel }}
                            deviceHref={appUrl(`/templates/${t.key}`)}
                            favorite={{
                                on: favs.has(t.key),
                                onToggle: () => toggleFav(t),
                                saveLabel: C.save,
                                unsaveLabel: C.unsave,
                            }}
                            actions={actions}
                        />
                    );
                })}
            </div>
            )}

            <UseTemplateModal template={useTpl} onClose={() => setUseTpl(null)} />

            {toast && (
                <div role="status" aria-live="polite" style={toastStyle}>
                    <span style={toastIcon}><ShoppingCart size={16} /></span>
                    <span className="grow" style={{ minWidth: 0, fontSize: 14, fontWeight: 600 }}>{C.added}</span>
                    <Link to="/panel/cart" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={dismissToast}>
                        {C.viewCart}
                    </Link>
                    <button type="button" onClick={dismissToast} aria-label={C.dismiss} style={toastClose}>
                        <X size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}

const filterSelect: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 9, border: '1px solid var(--line)',
    background: '#fff', color: 'var(--ink)', fontSize: 13.5, minWidth: 150,
};
const toastStyle: React.CSSProperties = {
    position: 'fixed', bottom: 20, right: 20, zIndex: 200,
    display: 'flex', alignItems: 'center', gap: 10,
    maxWidth: 'calc(100vw - 32px)', width: 360,
    background: '#fff', border: '1px solid var(--line)', borderRadius: 14,
    boxShadow: '0 16px 40px -14px rgba(30,26,51,0.45)', padding: '10px 12px',
    animation: 'pop 0.18s ease',
};
const toastIcon: React.CSSProperties = {
    display: 'grid', placeItems: 'center', flexShrink: 0, width: 32, height: 32,
    borderRadius: 10, background: 'var(--cream)', color: 'var(--plum)',
};
const toastClose: React.CSSProperties = {
    display: 'grid', placeItems: 'center', flexShrink: 0, width: 28, height: 28,
    border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
};
const ctaStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    flexWrap: 'wrap', padding: '14px 18px', marginBottom: 18, textDecoration: 'none',
    color: 'inherit', background: 'linear-gradient(120deg, #fff 0%, var(--cream) 100%)',
};
const ctaIcon: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 12, background: 'var(--cream)', color: 'var(--plum)',
    display: 'grid', placeItems: 'center', flexShrink: 0,
};
