import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, Plus, Lock, ShoppingCart, Check, Palette as PaletteIcon, Sparkles, ArrowRight, X } from 'lucide-react';
import { api } from '../../lib/api';
import { TemplateThumb } from '../../components/TemplateThumb';
import { useLang } from '../../context/LangContext';
import { useAuth, isStaff } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface Tpl {
    id: string; key: string; name: string; category: string;
    description?: string; tier: 'free' | 'premium'; price_myr: string | number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
}

type Filter = 'all' | 'free' | 'paid';

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

    const C = {
        bm: { title: 'Rekaan Kad', subtitle: 'Pilih rekaan yang sejiwa dengan majlis anda, kemudian mula mengolah kad.', free: 'Percuma', owned: 'Dimiliki', preview: 'Pratonton', use: 'Gunakan', addToCart: 'Tambah ke Troli', inCart: 'Dalam troli', added: 'Rekaan ditambah ke troli', viewCart: 'Lihat troli', dismiss: 'Tutup', tabAll: 'Semua', tabFree: 'Percuma', tabPaid: 'Berbayar', contributeTitle: 'Reka Rekaan Anda Sendiri', contributeSub: 'Bina kad dari mula — warna, kulit, kesan & hiasan pilihan anda — dan kongsikannya dengan komuniti.', contributeCta: 'Mula Mereka' },
        en: { title: 'Templates', subtitle: 'Browse the collection — pick one to create your card', free: 'Free', owned: 'Owned', preview: 'Preview', use: 'Use template', addToCart: 'Add to cart', inCart: 'In cart', added: 'Added to cart', viewCart: 'View cart', dismiss: 'Dismiss', tabAll: 'All', tabFree: 'Free', tabPaid: 'Paid', contributeTitle: 'Design your own', contributeSub: 'Build a card from scratch — your colours, cover, effects & ornaments — and share it with the community.', contributeCta: 'Start designing' },
    }[lang];

    useEffect(() => {
        api.get<Tpl[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
        api.get<{ allow_user_templates?: boolean }>('/settings')
            .then((r) => setAllowContribute(!!r.data?.allow_user_templates))
            .catch(() => setAllowContribute(false));
    }, []);

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
    ];
    const filtered = templates.filter((t) =>
        filter === 'all' ? true : filter === 'free' ? t.tier === 'free' : t.tier === 'premium',
    );

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {allowContribute && (
                <Link to="/panel/designer" className="panel" style={ctaStyle}>
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

            <div className="tpl-grid">
                {filtered.map((t) => {
                    const mine = owns(t);
                    const locked = t.tier === 'premium' && !mine;
                    return (
                        <div className="tpl-card" key={t.id}>
                            <div className="tpl-thumb"><TemplateThumb name={t.name} category={t.category} palette={t.palette} thumbnail={t.thumbnail} /></div>
                            <div className="tpl-body">
                                <div className="tpl-head">
                                    <h3>{t.name}</h3>
                                    {t.tier === 'free'
                                        ? <span className="badge badge-free">{C.free}</span>
                                        : mine
                                            ? <span className="badge badge-ok"><Check size={11} style={{ marginRight: 3 }} />{C.owned}</span>
                                            : <span className="badge badge-gold"><Lock size={11} style={{ marginRight: 3 }} />RM{Number(t.price_myr)}</span>}
                                </div>
                                <p className="muted" style={{ fontSize: 13, margin: '4px 0 14px', minHeight: 34 }}>{t.description}</p>
                                <div className="tpl-actions">
                                    <a href={`/templates/${t.key}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                                        <Eye size={15} /> {C.preview}
                                    </a>
                                    {locked ? (
                                        has(t.key) ? (
                                            <Link to="/panel/cart" className="btn btn-gold btn-sm">
                                                <Check size={15} /> {C.inCart}
                                            </Link>
                                        ) : (
                                            <button className="btn btn-gold btn-sm" onClick={() => addToCart(t)}>
                                                <ShoppingCart size={15} /> {C.addToCart}
                                            </button>
                                        )
                                    ) : (
                                        <button className="btn btn-primary btn-sm" onClick={() => nav(`/panel?tpl=${t.key}`)}>
                                            <Plus size={15} /> {C.use}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
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
