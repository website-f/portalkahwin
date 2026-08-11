import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ShoppingCart, ShieldCheck, ArrowRight, Sparkles, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../context/LangContext';
import { useCart } from '../../context/CartContext';

export function Checkout() {
    const { lang } = useLang();
    const nav = useNavigate();
    const { item } = useCart();
    const [busy, setBusy] = useState(false);
    const [imgOk, setImgOk] = useState(true);
    const [notice, setNotice] = useState<string | null>(null);

    const C = ({
        bm: {
            title: 'Pengesahan Pesanan',
            subtitle: 'Semak pilihan anda sebelum meneruskan ke pembayaran.',
            emptyTitle: 'Troli anda kosong',
            emptyText: 'Anda belum memilih apa-apa rekaan lagi. Terokai koleksi kami dan tambah rekaan pilihan.',
            browse: 'Lihat Rekaan',
            unlockTitle: 'Anda akan buka',
            unlock: [
                'Rekaan ini kekal menjadi milik anda',
                'Cipta kad tanpa had dengan rekaan ini',
                'Pengurusan susun atur meja terbuka',
            ],
            summary: 'Ringkasan Pesanan',
            subtotal: 'Subtotal',
            total: 'Jumlah',
            premiumDesign: 'Rekaan Premium',
            proceed: 'Teruskan ke Pembayaran',
            preparing: 'Menyediakan pembayaran…',
            secure: 'Pembayaran selamat melalui ToyyibPay (FPX & e-Wallet)',
            notConfigured: 'Gerbang pembayaran belum disediakan. Sila cuba sebentar lagi atau hubungi kami.',
            payFail: 'Pembayaran belum berjaya dimulakan. Sila cuba sekali lagi.',
        },
        en: {
            title: 'Order Confirmation',
            subtitle: 'Review your selection before continuing to payment.',
            emptyTitle: 'Your cart is empty',
            emptyText: "You haven't picked a design yet. Explore the collection and add your favourite.",
            browse: 'Browse designs',
            unlockTitle: "What you'll unlock",
            unlock: [
                'This design is yours to keep',
                'Create unlimited cards with it',
                'Seating plan management unlocked',
            ],
            summary: 'Order summary',
            subtotal: 'Subtotal',
            total: 'Total',
            premiumDesign: 'Premium design',
            proceed: 'Continue to payment',
            preparing: 'Preparing payment…',
            secure: 'Secure payment via ToyyibPay (FPX & e-Wallet)',
            notConfigured: "The payment gateway isn't set up yet. Please try again shortly or contact us.",
            payFail: 'Failed to start payment. Please try again.',
        },
    })[lang];

    async function proceed() {
        if (!item) return;
        setBusy(true);
        setNotice(null);
        try {
            const res = await api.post<{ url: string }>('/billing/checkout', { template_key: item.key });
            window.location.href = res.data.url; // → ToyyibPay
        } catch (err: unknown) {
            const e = err as { response?: { status?: number; data?: { configured?: boolean; message?: string } } };
            if (e?.response?.status === 422 && e.response.data?.configured === false) {
                setNotice(C.notConfigured);
            } else {
                setNotice(e?.response?.data?.message ?? C.payFail);
            }
            setBusy(false);
        }
    }

    if (!item) {
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
                    <Link to="/app/templates" className="btn btn-primary"><Sparkles size={16} /> {C.browse}</Link>
                </motion.div>
            </div>
        );
    }

    const cover = item.thumbnail || `/thumbnails/${item.key}.png`;

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
                {/* Left: item + perks */}
                <div style={{ display: 'grid', gap: 18 }}>
                    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="row" style={{ gap: 16, padding: 16, alignItems: 'center' }}>
                            <div style={coverWrap}>
                                {imgOk ? (
                                    <img
                                        src={cover}
                                        alt={item.name}
                                        onError={() => setImgOk(false)}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                                    />
                                ) : (
                                    <div style={coverFallback}><Sparkles size={22} color="var(--gold)" /></div>
                                )}
                            </div>
                            <div className="grow" style={{ minWidth: 0 }}>
                                <span className="badge badge-gold" style={{ marginBottom: 8 }}>{C.premiumDesign}</span>
                                <h3 style={{ margin: '2px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--plum)' }}>RM{item.price}</div>
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <h3 style={{ marginTop: 0, marginBottom: 12 }}>{C.unlockTitle}</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {C.unlock.map((u) => (
                                <li key={u} className="row" style={{ gap: 10, marginBottom: 10, fontSize: 14 }}>
                                    <Check size={16} color="var(--ok)" /> {u}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right: order summary */}
                <div className="panel" style={{ alignSelf: 'start' }}>
                    <h3 style={{ marginTop: 0 }}>{C.summary}</h3>
                    <div className="spread" style={{ margin: '14px 0', fontSize: 14 }}>
                        <span className="muted">{C.subtotal}</span>
                        <span>RM{item.price}</span>
                    </div>
                    <div style={{ height: 1, background: 'var(--line)', margin: '4px 0 14px' }} />
                    <div className="spread" style={{ marginBottom: 18, fontWeight: 700, fontSize: 16 }}>
                        <span>{C.total}</span>
                        <span style={{ color: 'var(--plum)' }}>RM{item.price}</span>
                    </div>

                    {notice && (
                        <div className="row" style={noticeBox}>
                            <Info size={16} style={{ flexShrink: 0 }} /> <span>{notice}</span>
                        </div>
                    )}

                    <button className="btn btn-primary btn-block" disabled={busy} onClick={proceed}>
                        {busy ? C.preparing : <>{C.proceed} <ArrowRight size={16} /></>}
                    </button>
                    <p className="muted center row" style={{ gap: 6, justifyContent: 'center', fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                        <ShieldCheck size={14} /> {C.secure}
                    </p>
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
    position: 'relative', width: 92, height: 120, borderRadius: 12, overflow: 'hidden',
    background: 'var(--cream)', border: '1px solid var(--line)', flexShrink: 0,
};
const coverFallback: React.CSSProperties = {
    width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--cream)',
};
const noticeBox: React.CSSProperties = {
    gap: 8, alignItems: 'flex-start', background: '#fbf1d8', color: '#8a6a1e',
    padding: '10px 12px', borderRadius: 10, fontSize: 13, marginBottom: 14, lineHeight: 1.4,
};
