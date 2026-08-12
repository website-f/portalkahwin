import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { useLang, dict } from '../../context/LangContext';
import { useCart } from '../../context/CartContext';

export function Cart() {
    const { lang } = useLang();
    const { items, remove, count, total } = useCart();
    const nav = useNavigate();
    // Track which thumbnails failed to load so we can swap in the Sparkles placeholder.
    const [broken, setBroken] = useState<Record<string, boolean>>({});

    const C = dict({
        bm: {
            title: 'Troli',
            subtitle: 'Semak rekaan pilihan anda sebelum meneruskan ke pembayaran.',
            emptyTitle: 'Troli anda kosong',
            emptyText: 'Anda belum menambah apa-apa rekaan lagi. Terokai koleksi kami dan tambah rekaan pilihan.',
            browse: 'Lihat Rekaan',
            summary: 'Ringkasan',
            designs: 'rekaan',
            total: 'Jumlah',
            premiumDesign: 'Rekaan Premium',
            remove: 'Buang',
            removeAria: 'Buang rekaan dari troli',
            checkout: 'Teruskan ke Pembayaran',
        },
        en: {
            title: 'Cart',
            subtitle: 'Review your picks before continuing to payment.',
            emptyTitle: 'Your cart is empty',
            emptyText: "You haven't added any designs yet. Explore the collection and add your favourites.",
            browse: 'Browse designs',
            summary: 'Summary',
            designs: 'designs',
            total: 'Total',
            premiumDesign: 'Premium design',
            remove: 'Discard',
            removeAria: 'Remove design from cart',
            checkout: 'Proceed to checkout',
        },
        zh: {
            title: '购物车',
            subtitle: '结账前请确认您选择的设计。',
            emptyTitle: '购物车是空的',
            emptyText: '您尚未添加任何设计。浏览作品集，把喜欢的加进来吧。',
            browse: '浏览设计',
            summary: '订单摘要',
            designs: '款设计',
            total: '合计',
            premiumDesign: '付费设计',
            remove: '移除',
            removeAria: '从购物车移除此设计',
            checkout: '前往结账',
        },
    }, lang);

    if (items.length === 0) {
        return (
            <div>
                <div className="page-head"><h1>{C.title}</h1></div>
                <motion.div
                    className="panel center"
                    style={{ padding: 48 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div style={emptyIcon}><ShoppingCart size={30} color="var(--plum)" /></div>
                    <h3 style={{ marginTop: 14, marginBottom: 4 }}>{C.emptyTitle}</h3>
                    <p className="muted" style={{ maxWidth: 380, margin: '0 auto 18px' }}>{C.emptyText}</p>
                    <Link to="/panel/templates" className="btn btn-primary"><Sparkles size={16} /> {C.browse}</Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <motion.div
                style={grid}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
            >
                {/* Left: item list */}
                <div style={{ display: 'grid', gap: 12 }}>
                    {items.map((it) => {
                        const cover = it.thumbnail || `/thumbnails/${it.key}.png`;
                        return (
                            <div className="panel" key={it.key} style={{ padding: 12 }}>
                                <div className="row" style={{ gap: 14, alignItems: 'center' }}>
                                    <div style={coverWrap}>
                                        {broken[it.key] ? (
                                            <div style={coverFallback}><Sparkles size={20} color="var(--gold)" /></div>
                                        ) : (
                                            <img
                                                src={cover}
                                                alt={it.name}
                                                onError={() => setBroken((b) => ({ ...b, [it.key]: true }))}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                                            />
                                        )}
                                    </div>
                                    <div className="grow" style={{ minWidth: 0 }}>
                                        <span className="badge badge-gold" style={{ marginBottom: 6 }}>{C.premiumDesign}</span>
                                        <h3 style={{ margin: '2px 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</h3>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--plum)' }}>RM{it.price}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => remove(it.key)}
                                        aria-label={C.removeAria}
                                        style={{ color: 'var(--bad)', flexShrink: 0 }}
                                    >
                                        <Trash2 size={15} /> {C.remove}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right: summary */}
                <div className="panel" style={{ alignSelf: 'start' }}>
                    <h3 style={{ marginTop: 0 }}>{C.summary}</h3>
                    <div className="spread" style={{ margin: '14px 0', fontSize: 14 }}>
                        <span className="muted">{count} {C.designs}</span>
                        <span>RM{total}</span>
                    </div>
                    <div style={{ height: 1, background: 'var(--line)', margin: '4px 0 14px' }} />
                    <div className="spread" style={{ marginBottom: 18, fontWeight: 700, fontSize: 16 }}>
                        <span>{C.total}</span>
                        <span style={{ color: 'var(--plum)' }}>RM{total}</span>
                    </div>
                    <button className="btn btn-primary btn-block" onClick={() => nav('/panel/checkout')}>
                        {C.checkout} <ArrowRight size={16} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

const grid: React.CSSProperties = {
    display: 'grid', gap: 18, alignItems: 'start', maxWidth: 820,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
};
const emptyIcon: React.CSSProperties = {
    width: 64, height: 64, borderRadius: 18, background: 'var(--cream)',
    display: 'grid', placeItems: 'center', margin: '0 auto',
};
const coverWrap: React.CSSProperties = {
    position: 'relative', width: 68, height: 90, borderRadius: 10, overflow: 'hidden',
    background: 'var(--cream)', border: '1px solid var(--line)', flexShrink: 0,
};
const coverFallback: React.CSSProperties = {
    width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--cream)',
};
