import { useEffect, useState } from 'react';
import { url as appUrl } from '../../lib/base';
import { Link } from 'react-router-dom';
import { HeartOff, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { TemplateCard } from '../../components/TemplateCard';
import { UseTemplateModal } from '../../components/UseTemplateModal';
import { useLang, dict } from '../../context/LangContext';
import { useAuth, isStaff } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface Tpl {
    id: string; key: string; name: string; category: string; kind?: string | null;
    description?: string; tier: 'free' | 'premium'; price_myr: string | number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
    config?: Record<string, unknown> | null;
    usage_count?: number;
}

export function Saved() {
    const { lang } = useLang();
    const { user } = useAuth();
    const { add, has } = useCart();
    // A design is usable if it's free, the user bought it, or they're premium/admin.
    const owns = (t: Tpl) => t.tier === 'free' || isStaff(user) || user?.plan === 'premium' || !!user?.owned_templates?.includes(t.key);
    // Subscription accounts (vendor/staff/premium) get every design free — no cart/credit/buy-again.
    const unlimited = isStaff(user) || user?.role === 'vendor' || user?.plan === 'premium';
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [favs, setFavs] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [useTpl, setUseTpl] = useState<Tpl | null>(null);

    const C = dict({
        bm: { title: 'Rekaan Disimpan', subtitle: 'Rekaan yang anda simpan untuk dilihat semula.', free: 'Percuma', popular: 'POPULAR', owned: 'Dimiliki', creditAvailable: 'Kredit tersedia', creditsLabel: (n: number) => `✓ ${n} kredit`, buyAgain: 'Beli lagi', included: '✓ Termasuk pelan', preview: 'Pratonton', use: 'Gunakan', addToCart: 'Tambah ke Troli', inCart: 'Dalam troli', unsave: 'Buang simpanan', emptyTitle: 'Tiada rekaan disimpan lagi', emptySub: 'Tekan ikon hati pada mana-mana rekaan untuk menyimpannya di sini.', browse: 'Lihat Rekaan' },
        en: { title: 'Saved designs', subtitle: 'The designs you saved to revisit later.', free: 'Free', popular: 'POPULAR', owned: 'Owned', creditAvailable: 'Credit available', creditsLabel: (n: number) => `✓ ${n} credit${n === 1 ? '' : 's'}`, buyAgain: 'Buy again', included: '✓ Included in plan', preview: 'Preview', use: 'Use template', addToCart: 'Add to cart', inCart: 'In cart', unsave: 'Unsave', emptyTitle: 'No saved designs yet', emptySub: 'Tap the heart on any design to keep it here.', browse: 'Browse templates' },
        zh: { title: '已收藏的设计', subtitle: '您收藏起来稍后再看的设计。', free: '免费', popular: '热门', owned: '已拥有', creditAvailable: '可用额度', creditsLabel: (n: number) => `✓ ${n} 个额度`, buyAgain: '再次购买', included: '✓ 已含于套餐', preview: '预览', use: '使用设计', addToCart: '加入购物车', inCart: '已在购物车', unsave: '取消收藏', emptyTitle: '尚无收藏', emptySub: '点击任一设计上的爱心即可收藏到这里。', browse: '浏览设计' },
    }, lang);

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
                // Same card as the public gallery and the Templates page.
                <div className="gal-grid">
                    {saved.map((t) => {
                        const mine = owns(t);
                        // Subscription accounts → free/unlimited (Use only). Users & affiliates →
                        // consumable: Use when usable now (free / held credit), else buy; owned paid → Buy again.
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
                                favorite={{ on: true, onToggle: () => unsave(t), saveLabel: C.unsave, unsaveLabel: C.unsave }}
                                actions={actions}
                            />
                        );
                    })}
                </div>
            )}

            <UseTemplateModal template={useTpl} onClose={() => setUseTpl(null)} />
        </div>
    );
}

const emptyStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '48px 24px',
};
const emptyIcon: React.CSSProperties = {
    width: 56, height: 56, borderRadius: 16, background: 'var(--cream)', color: 'var(--plum)',
    display: 'grid', placeItems: 'center', marginBottom: 14,
};
