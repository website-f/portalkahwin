import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Plus, Lock, ShoppingCart, Check, Heart, HeartOff } from 'lucide-react';
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

export function Saved() {
    const { lang } = useLang();
    const nav = useNavigate();
    const { user } = useAuth();
    const { add, has } = useCart();
    // A design is usable if it's free, the user bought it, or they're premium/admin.
    const owns = (t: Tpl) => t.tier === 'free' || isStaff(user) || user?.plan === 'premium' || !!user?.owned_templates?.includes(t.key);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [favs, setFavs] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const C = {
        bm: { title: 'Rekaan Disimpan', subtitle: 'Rekaan yang anda simpan untuk dilihat semula.', free: 'Percuma', owned: 'Dimiliki', preview: 'Pratonton', use: 'Gunakan', addToCart: 'Tambah ke Troli', inCart: 'Dalam troli', unsave: 'Buang simpanan', emptyTitle: 'Tiada rekaan disimpan lagi', emptySub: 'Tekan ikon hati pada mana-mana rekaan untuk menyimpannya di sini.', browse: 'Lihat Rekaan' },
        en: { title: 'Saved designs', subtitle: 'The designs you saved to revisit later.', free: 'Free', owned: 'Owned', preview: 'Preview', use: 'Use template', addToCart: 'Add to cart', inCart: 'In cart', unsave: 'Unsave', emptyTitle: 'No saved designs yet', emptySub: 'Tap the heart on any design to keep it here.', browse: 'Browse templates' },
    }[lang];

    // Load the catalog + this user's favourites, then intersect the two.
    useEffect(() => {
        let active = true;
        Promise.all([
            api.get<Tpl[]>('/templates'),
            api.get<{ keys: string[] }>('/me/favorites'),
        ])
            .then(([tpl, fav]) => {
                if (!active) return;
                setTemplates(tpl.data);
                setFavs(new Set(fav.data.keys));
            })
            .catch(() => { if (active) { setTemplates([]); setFavs(new Set()); } })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    // Unsave optimistically (removes the card from this list); revert if the request fails.
    async function unsave(t: Tpl) {
        const key = t.key;
        setFavs((prev) => { const next = new Set(prev); next.delete(key); return next; });
        try {
            await api.post('/me/favorites/toggle', { key });
        } catch {
            setFavs((prev) => { const next = new Set(prev); next.add(key); return next; });
        }
    }

    // Add to cart (idempotent) — mirrors the templates gallery action.
    function addToCart(t: Tpl) {
        add({ key: t.key, name: t.name, price: Number(t.price_myr), thumbnail: t.thumbnail ?? null });
    }

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    const saved = templates.filter((t) => favs.has(t.key));

    return (
        <div>
            <div className="page-head">
                <h1>{C.title} <span className="muted">/ Saved designs</span></h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {saved.length === 0 ? (
                <div className="panel" style={emptyStyle}>
                    <div style={emptyIcon}><HeartOff size={26} /></div>
                    <strong style={{ fontSize: 18 }}>{C.emptyTitle}</strong>
                    <p className="muted" style={{ margin: '4px 0 16px', maxWidth: 420 }}>{C.emptySub}</p>
                    <Link to="/panel/templates" className="btn btn-primary btn-sm">
                        <Plus size={15} /> {C.browse}
                    </Link>
                </div>
            ) : (
                <div className="tpl-grid">
                    {saved.map((t) => {
                        const mine = owns(t);
                        const locked = t.tier === 'premium' && !mine;
                        return (
                            <div className="tpl-card" key={t.id}>
                                <div className="tpl-thumb">
                                    <TemplateThumb name={t.name} category={t.category} palette={t.palette} thumbnail={t.thumbnail} />
                                    <button
                                        type="button"
                                        className="tpl-fav"
                                        style={heartBtn}
                                        aria-label={C.unsave}
                                        aria-pressed={true}
                                        title={`${C.unsave} / Unsave`}
                                        onClick={(e) => { e.stopPropagation(); unsave(t); }}
                                    >
                                        <Heart size={17} color="var(--gold)" fill="var(--gold)" />
                                    </button>
                                </div>
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
            )}
        </div>
    );
}

const heartBtn: React.CSSProperties = {
    position: 'absolute', top: 10, right: 10, zIndex: 2,
    display: 'grid', placeItems: 'center', width: 36, height: 36,
    padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer',
    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 10px -3px rgba(30,26,51,0.45)',
};
const emptyStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '48px 24px',
};
const emptyIcon: React.CSSProperties = {
    width: 56, height: 56, borderRadius: 16, background: 'var(--cream)', color: 'var(--plum)',
    display: 'grid', placeItems: 'center', marginBottom: 14,
};
