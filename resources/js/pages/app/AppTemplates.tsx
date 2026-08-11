import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, Lock, ShoppingCart, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { TemplateThumb } from '../../components/TemplateThumb';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
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
    const { setItem } = useCart();
    // Per-template ownership: a design is usable if it's free, the user bought it, or they're premium/admin.
    const owns = (t: Tpl) => t.tier === 'free' || user?.role === 'admin' || user?.plan === 'premium' || !!user?.owned_templates?.includes(t.key);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');

    const C = {
        bm: { title: 'Rekaan Kad', subtitle: 'Pilih rekaan yang sejiwa dengan majlis anda, kemudian mula mengolah kad.', free: 'Percuma', owned: 'Dimiliki', preview: 'Pratonton', use: 'Gunakan', addToCart: 'Tambah ke Troli', tabAll: 'Semua', tabFree: 'Percuma', tabPaid: 'Berbayar' },
        en: { title: 'Templates', subtitle: 'Browse the collection — pick one to create your card', free: 'Free', owned: 'Owned', preview: 'Preview', use: 'Use template', addToCart: 'Add to cart', tabAll: 'All', tabFree: 'Free', tabPaid: 'Paid' },
    }[lang];

    useEffect(() => {
        api.get<Tpl[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
    }, []);

    function addToCart(t: Tpl) {
        setItem({ key: t.key, name: t.name, price: Number(t.price_myr), thumbnail: t.thumbnail ?? null });
        nav('/app/checkout');
    }

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
                                <div className="spread">
                                    <h3>{t.name}</h3>
                                    {t.tier === 'free'
                                        ? <span className="badge badge-free">{C.free}</span>
                                        : mine
                                            ? <span className="badge badge-ok"><Check size={11} style={{ marginRight: 3 }} />{C.owned}</span>
                                            : <span className="badge badge-gold"><Lock size={11} style={{ marginRight: 3 }} />RM{Number(t.price_myr)}</span>}
                                </div>
                                <p className="muted" style={{ fontSize: 13, margin: '4px 0 14px', minHeight: 34 }}>{t.description}</p>
                                <div className="row">
                                    <a href={`/templates/${t.key}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm grow">
                                        <Eye size={15} /> {C.preview}
                                    </a>
                                    {locked ? (
                                        <button className="btn btn-gold btn-sm grow" onClick={() => addToCart(t)}>
                                            <ShoppingCart size={15} /> {C.addToCart}
                                        </button>
                                    ) : (
                                        <button className="btn btn-primary btn-sm grow" onClick={() => nav(`/app?tpl=${t.key}`)}>
                                            <Plus size={15} /> {C.use}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
