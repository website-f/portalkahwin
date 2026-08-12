import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ShoppingCart, ShieldCheck, ArrowRight, Sparkles, Info, Ticket, X, CheckCircle2, LayoutGrid } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, dict } from '../../context/LangContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

interface VoucherResp {
    ok: boolean;
    message?: string;
    discounted: number;
    kind?: string;
    value?: number;
}

export function Checkout() {
    const { lang } = useLang();
    const { items, clear, total } = useCart();
    const { refresh } = useAuth();
    const [busy, setBusy] = useState(false);
    // Track which per-item thumbnails failed to load so we can swap in the Sparkles placeholder.
    const [broken, setBroken] = useState<Record<string, boolean>>({});
    const [notice, setNotice] = useState<string | null>(null);
    const [paid, setPaid] = useState(false); // set when a full-discount voucher settles instantly

    // Voucher state
    const [code, setCode] = useState('');
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [discounted, setDiscounted] = useState<number | null>(null);
    const [vBusy, setVBusy] = useState(false);
    const [vError, setVError] = useState<string | null>(null);

    const C = dict({
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
            discount: 'Diskaun',
            premiumDesign: 'Rekaan Premium',
            proceed: 'Teruskan ke Pembayaran',
            preparing: 'Menyediakan pembayaran…',
            secure: 'Pembayaran selamat melalui ToyyibPay (FPX & e-Wallet)',
            notConfigured: 'Gerbang pembayaran belum disediakan. Sila cuba sebentar lagi atau hubungi kami.',
            payFail: 'Pembayaran belum berjaya dimulakan. Sila cuba sekali lagi.',
            voucherLabel: 'Kod Baucar',
            voucherPlaceholder: 'Masukkan kod',
            apply: 'Guna',
            applying: 'Menyemak…',
            voucherApplied: 'Baucar digunakan',
            voucherRemove: 'Buang baucar',
            voucherInvalid: 'Kod baucar tidak sah.',
            paidTitle: 'Pembayaran Berjaya!',
            paidText: 'Baucar penuh telah digunakan — rekaan ini kini menjadi milik anda dan pengurusan susun atur meja telah dibuka. Selamat mengolah kad!',
            createCard: 'Cipta Kad Anda',
            viewDesigns: 'Lihat Rekaan',
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
            discount: 'Discount',
            premiumDesign: 'Premium design',
            proceed: 'Continue to payment',
            preparing: 'Preparing payment…',
            secure: 'Secure payment via ToyyibPay (FPX & e-Wallet)',
            notConfigured: "The payment gateway isn't set up yet. Please try again shortly or contact us.",
            payFail: 'Failed to start payment. Please try again.',
            voucherLabel: 'Voucher code',
            voucherPlaceholder: 'Enter code',
            apply: 'Apply',
            applying: 'Checking…',
            voucherApplied: 'Voucher applied',
            voucherRemove: 'Remove voucher',
            voucherInvalid: 'Invalid voucher code.',
            paidTitle: 'Payment Successful!',
            paidText: 'A full-value voucher was applied — this design is now yours and table management is unlocked. Enjoy building your card!',
            createCard: 'Create your card',
            viewDesigns: 'View designs',
        },
        zh: {
            title: '订单确认',
            subtitle: '付款前请确认您的选择。',
            emptyTitle: '购物车是空的',
            emptyText: '您尚未选择任何设计。浏览作品集，把喜欢的加进来吧。',
            browse: '浏览设计',
            unlockTitle: '您将解锁',
            unlock: [
                '此设计永久归您所有',
                '可用它创建不限数量的请柬',
                '解锁座位安排管理功能',
            ],
            summary: '订单摘要',
            subtotal: '小计',
            total: '合计',
            discount: '折扣',
            premiumDesign: '付费设计',
            proceed: '前往付款',
            preparing: '正在准备付款…',
            secure: '通过 ToyyibPay 安全付款（FPX 与电子钱包）',
            notConfigured: '支付网关尚未设置完成。请稍后再试或联系我们。',
            payFail: '无法启动付款，请重试。',
            voucherLabel: '优惠码',
            voucherPlaceholder: '输入优惠码',
            apply: '使用',
            applying: '验证中…',
            voucherApplied: '优惠码已生效',
            voucherRemove: '移除优惠码',
            voucherInvalid: '优惠码无效。',
            paidTitle: '付款成功！',
            paidText: '已使用全额抵扣优惠码 — 此设计现已归您所有，桌位管理功能同时解锁。祝您制作愉快！',
            createCard: '创建请柬',
            viewDesigns: '浏览设计',
        },
    }, lang);

    async function applyVoucher() {
        if (items.length === 0) return;
        const trimmed = code.trim();
        if (!trimmed) return;
        setVBusy(true);
        setVError(null);
        try {
            const res = await api.post<VoucherResp>('/vouchers/validate', { code: trimmed, amount: total });
            if (res.data.ok) {
                setAppliedCode(trimmed);
                setDiscounted(res.data.discounted);
                setVError(null);
            } else {
                setAppliedCode(null);
                setDiscounted(null);
                setVError(res.data.message ?? C.voucherInvalid);
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setAppliedCode(null);
            setDiscounted(null);
            setVError(e?.response?.data?.message ?? C.voucherInvalid);
        } finally {
            setVBusy(false);
        }
    }

    function removeVoucher() {
        setAppliedCode(null);
        setDiscounted(null);
        setVError(null);
        setCode('');
    }

    async function proceed() {
        if (items.length === 0) return;
        setBusy(true);
        setNotice(null);
        try {
            const res = await api.post<{ url?: string; paid?: boolean }>('/billing/checkout', {
                template_keys: items.map((i) => i.key),
                voucher_code: appliedCode,
            });
            if (res.data.paid) {
                // Full-discount voucher settled the order instantly — no gateway hop.
                clear();
                await refresh();
                setPaid(true);
                return;
            }
            if (res.data.url) {
                window.location.href = res.data.url; // → ToyyibPay
                return;
            }
            setNotice(C.payFail);
            setBusy(false);
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

    if (paid) {
        return (
            <div className="auth-wrap" style={{ minHeight: '70vh' }}>
                <div className="auth-card center">
                    <motion.div
                        style={{ display: 'grid', placeItems: 'center', minHeight: 60 }}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    >
                        <CheckCircle2 size={54} color="var(--ok)" />
                    </motion.div>
                    <h2 style={{ marginBottom: 6 }}>{C.paidTitle}</h2>
                    <p className="muted">{C.paidText}</p>
                    <div className="row" style={{ gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                        <Link to="/panel" className="btn btn-primary"><Sparkles size={16} /> {C.createCard}</Link>
                        <Link to="/panel/templates" className="btn btn-ghost"><LayoutGrid size={16} /> {C.viewDesigns}</Link>
                    </div>
                </div>
            </div>
        );
    }

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

    const effective = discounted ?? total;
    const saved = Math.round((total - effective) * 100) / 100;
    const hasVoucher = appliedCode !== null && discounted !== null;

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
                {/* Left: items + perks */}
                <div style={{ display: 'grid', gap: 18 }}>
                    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                        {items.map((it, idx) => {
                            const cover = it.thumbnail || `/thumbnails/${it.key}.png`;
                            return (
                                <div
                                    key={it.key}
                                    className="row"
                                    style={{ gap: 16, padding: 16, alignItems: 'center', borderTop: idx > 0 ? '1px solid var(--line)' : 'none' }}
                                >
                                    <div style={coverWrap}>
                                        {broken[it.key] ? (
                                            <div style={coverFallback}><Sparkles size={22} color="var(--gold)" /></div>
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
                                        <span className="badge badge-gold" style={{ marginBottom: 8 }}>{C.premiumDesign}</span>
                                        <h3 style={{ margin: '2px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</h3>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--plum)' }}>RM{it.price}</div>
                                    </div>
                                </div>
                            );
                        })}
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
                        <span>RM{total}</span>
                    </div>

                    {hasVoucher && (
                        <div className="spread" style={{ margin: '0 0 14px', fontSize: 14 }}>
                            <span className="muted">{C.discount} ({appliedCode})</span>
                            <span style={{ color: 'var(--ok)' }}>−RM{saved}</span>
                        </div>
                    )}

                    <div style={{ height: 1, background: 'var(--line)', margin: '4px 0 14px' }} />
                    <div className="spread" style={{ marginBottom: 18, fontWeight: 700, fontSize: 16 }}>
                        <span>{C.total}</span>
                        {hasVoucher ? (
                            <span className="row" style={{ gap: 8 }}>
                                <s className="muted" style={{ fontWeight: 500 }}>RM{total}</s>
                                <span style={{ color: 'var(--plum)' }}>RM{effective}</span>
                            </span>
                        ) : (
                            <span style={{ color: 'var(--plum)' }}>RM{total}</span>
                        )}
                    </div>

                    {/* Voucher redemption */}
                    <div style={{ marginBottom: 18 }}>
                        {appliedCode ? (
                            <div className="row" style={voucherChip}>
                                <Ticket size={14} color="var(--plum)" style={{ flexShrink: 0 }} />
                                <span className="grow" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, fontSize: 13, color: 'var(--plum)' }}>
                                    {C.voucherApplied}: {appliedCode}
                                </span>
                                <button type="button" onClick={removeVoucher} aria-label={C.voucherRemove} style={chipRemove}>
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <label htmlFor="voucher" className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>{C.voucherLabel}</label>
                                <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
                                    <input
                                        id="voucher"
                                        className="grow"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void applyVoucher(); } }}
                                        placeholder={C.voucherPlaceholder}
                                        disabled={vBusy}
                                        autoComplete="off"
                                        style={{ minWidth: 0, textTransform: 'uppercase' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        disabled={vBusy || !code.trim()}
                                        onClick={applyVoucher}
                                        style={{ flexShrink: 0 }}
                                    >
                                        {vBusy ? C.applying : C.apply}
                                    </button>
                                </div>
                                {vError && (
                                    <p className="row" style={voucherErr}>
                                        <Info size={14} style={{ flexShrink: 0 }} /> <span>{vError}</span>
                                    </p>
                                )}
                            </>
                        )}
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
const voucherChip: React.CSSProperties = {
    gap: 8, alignItems: 'center', background: 'var(--cream)', border: '1px solid var(--line)',
    borderRadius: 10, padding: '8px 10px',
};
const chipRemove: React.CSSProperties = {
    display: 'grid', placeItems: 'center', flexShrink: 0, width: 24, height: 24,
    border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
};
const voucherErr: React.CSSProperties = {
    gap: 6, alignItems: 'flex-start', color: 'var(--bad)', fontSize: 13, margin: '8px 0 0', lineHeight: 1.4,
};
