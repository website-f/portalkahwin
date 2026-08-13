import { useEffect, useRef, useState } from 'react';
import { url as appUrl } from '../../lib/base';
import { useNavigate, Link } from 'react-router-dom';
import { Palette as PaletteIcon, Sparkles, ArrowRight, X, ShoppingCart } from 'lucide-react';
import { api } from '../../lib/api';
import { TemplateCard } from '../../components/TemplateCard';
import { useLang, dict } from '../../context/LangContext';
import { useAuth, isStaff } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface Tpl {
    id: string; key: string; name: string; category: string;
    description?: string; tier: 'free' | 'premium'; price_myr: string | number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
    config?: Record<string, unknown> | null;
    usage_count?: number;
}

type Filter = 'all' | 'free' | 'paid' | 'owned';

export function AppTemplates() {
    const { lang } = useLang();
    const nav = useNavigate();
    const { user } = useAuth();
    const { add, has } = useCart();
    const [toast, setToast] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Per-template ownership: a design is usable if it's free, the user bought it, or they're premium/admin.
    const owns = (t: Tpl) => t.tier === 'free' || isStaff(user) || user?.plan === 'premium' || !!user?.owned_templates?.includes(t.key);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [allowContribute, setAllowContribute] = useState(false);
    // Saved / favourite template keys for the logged-in user (any role).
    const [favs, setFavs] = useState<Set<string>>(new Set());

    const C = dict({
        bm: { title: 'Rekaan Kad', subtitle: 'Pilih rekaan yang sejiwa dengan majlis anda, kemudian mula mengolah kad.', free: 'Percuma', owned: 'Dimiliki', preview: 'Pratonton', use: 'Gunakan', addToCart: 'Tambah ke Troli', popular: 'POPULAR', inCart: 'Dalam troli', added: 'Rekaan ditambah ke troli', viewCart: 'Lihat troli', dismiss: 'Tutup', tabAll: 'Semua', tabFree: 'Percuma', tabPaid: 'Berbayar', tabOwned: 'Dimiliki', save: 'Simpan', unsave: 'Buang simpanan', contributeTitle: 'Reka Rekaan Anda Sendiri', contributeSub: 'Bina kad dari mula — warna, kulit, kesan & hiasan pilihan anda — dan kongsikannya dengan komuniti.', contributeCta: 'Mula Mereka' },
        en: { title: 'Templates', subtitle: 'Browse the collection — pick one to create your card', free: 'Free', owned: 'Owned', preview: 'Preview', use: 'Use template', addToCart: 'Add to cart', popular: 'POPULAR', inCart: 'In cart', added: 'Added to cart', viewCart: 'View cart', dismiss: 'Dismiss', tabAll: 'All', tabFree: 'Free', tabPaid: 'Paid', tabOwned: 'Owned', save: 'Save', unsave: 'Unsave', contributeTitle: 'Design your own', contributeSub: 'Build a card from scratch — your colours, cover, effects & ornaments — and share it with the community.', contributeCta: 'Start designing' },
        zh: { title: '请柬设计', subtitle: '浏览作品集 — 选一款开始制作您的请柬', free: '免费', owned: '已拥有', preview: '预览', use: '使用设计', addToCart: '加入购物车', popular: '热门', inCart: '已在购物车', added: '已加入购物车', viewCart: '查看购物车', dismiss: '关闭', tabAll: '全部', tabFree: '免费', tabPaid: '付费', tabOwned: '已拥有', save: '收藏', unsave: '取消收藏', contributeTitle: '设计属于你的作品', contributeSub: '从零开始制作请柬 — 自选配色、封面、动效与装饰 — 并分享给社区。', contributeCta: '开始设计' },
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
    const filtered = templates.filter((t) => {
        if (filter === 'free') return t.tier === 'free';
        if (filter === 'paid') return t.tier === 'premium';
        if (filter === 'owned') return owns(t); // designs this user can actually use
        return true;
    });

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

            <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
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

            {/* Same card as the public gallery — a design should look the same
                wherever it is listed; only the actions differ by page. */}
            <div className="gal-grid">
                {filtered.map((t) => {
                    const mine = owns(t);
                    const locked = t.tier === 'premium' && !mine;
                    const buy = has(t.key)
                        ? { label: C.inCart, to: '/panel/cart', tone: 'gold' as const }
                        : { label: C.addToCart, onClick: () => addToCart(t), tone: 'gold' as const };
                    return (
                        <TemplateCard
                            key={t.id}
                            t={t}
                            owned={mine && t.tier === 'premium'}
                            labels={{ free: C.free, popular: C.popular, owned: C.owned }}
                            deviceHref={appUrl(`/templates/${t.key}`)}
                            favorite={{
                                on: favs.has(t.key),
                                onToggle: () => toggleFav(t),
                                saveLabel: C.save,
                                unsaveLabel: C.unsave,
                            }}
                            actions={[
                                locked ? buy : { label: C.use, onClick: () => nav(`/panel?tpl=${t.key}`) },
                                { label: C.preview, href: appUrl(`/templates/${t.key}`) },
                            ]}
                        />
                    );
                })}
            </div>

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
