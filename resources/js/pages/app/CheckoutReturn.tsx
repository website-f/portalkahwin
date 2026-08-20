import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, RefreshCw, Sparkles, LayoutGrid, RotateCcw, Receipt, MessageCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, dict } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { waLink } from '../../lib/whatsapp';

type Status = 'checking' | 'paid' | 'pending' | 'failed' | 'unknown';

export function CheckoutReturn() {
    const [params] = useSearchParams();
    const [status, setStatus] = useState<Status>('checking');
    const [rechecking, setRechecking] = useState(false);
    const [waPhone, setWaPhone] = useState<string>('');
    // What was purchased, so the success screen shows plan/add-on/design wording.
    const [bought, setBought] = useState<{ purpose: string | null; kind: string | null; item: string | null }>({ purpose: null, kind: null, item: null });
    const { lang } = useLang();
    const nav = useNavigate();
    const { refresh } = useAuth();
    const { clear } = useCart();
    const settled = useRef(false); // guard: run the paid side-effects only once
    const reference = params.get('ref') || params.get('reference') || '';

    // WhatsApp number for billing help (superadmin-set; falls back to receipt phone).
    useEffect(() => {
        api.get<{ support_whatsapp?: string; receipt_phone?: string }>('/settings')
            .then((r) => setWaPhone(r.data?.support_whatsapp || r.data?.receipt_phone || ''))
            .catch(() => { /* WhatsApp button just hides */ });
    }, []);

    const C = dict({
        bm: {
            verifying: 'Sedang disahkan…',
            verifyingText: 'Sila tunggu sebentar semasa kami mengesahkan pembayaran anda.',
            paidTitle: 'Pembayaran Berjaya!',
            paidText: 'Rekaan ini kini menjadi milik anda dan pengurusan susun atur meja telah dibuka. Selamat mengolah kad!',
            planTitle: 'Langganan Aktif!',
            planText: 'Pelan anda kini aktif. Semua ciri premium telah dibuka untuk akaun anda.',
            addonTitle: 'Tambahan Diaktifkan!',
            addonText: 'Tambahan anda kini aktif untuk akaun anda.',
            viewSub: 'Lihat Langganan',
            createCard: 'Cipta Kad Anda',
            viewDesigns: 'Lihat Rekaan',
            pendingTitle: 'Sedang disahkan…',
            pendingText: 'Status pembayaran masih menunggu. Anda boleh menyemak semula, atau lihat statusnya di halaman Pesanan Saya.',
            recheck: 'Semak semula',
            rechecking: 'Menyemak…',
            viewPurchases: 'Lihat di Pesanan Saya',
            waHelp: 'Hubungi kami di WhatsApp',
            waMsg: 'Salam, tolong semak status pembayaran untuk pesanan',
            failedTitle: 'Pembayaran Gagal',
            failedText: 'Tiada caj dikenakan. Anda boleh mencuba pembayaran sekali lagi.',
            retry: 'Cuba Lagi',
            unknownTitle: 'Transaksi Tidak Ditemui',
            unknownText: 'Kami tidak dapat mengesan maklumat transaksi ini.',
            home: 'Ke Ruang Kerja',
        },
        en: {
            verifying: 'Verifying…',
            verifyingText: 'Please wait a moment while we confirm your payment.',
            paidTitle: 'Payment Successful!',
            paidText: 'This design is now yours and table management is unlocked. Enjoy building your card!',
            planTitle: 'Subscription Active!',
            planText: 'Your plan is now active — all premium features are unlocked for your account.',
            addonTitle: 'Add-on Activated!',
            addonText: 'Your add-on is now active on your account.',
            viewSub: 'View subscription',
            createCard: 'Create your card',
            viewDesigns: 'View designs',
            pendingTitle: 'Verifying…',
            pendingText: 'Your payment is still pending. Check again, or view its status on your Purchases page.',
            recheck: 'Check again',
            rechecking: 'Checking…',
            viewPurchases: 'View in My Purchases',
            waHelp: 'Contact us on WhatsApp',
            waMsg: 'Hi, please check the payment status for my order',
            failedTitle: 'Payment Failed',
            failedText: 'No charge was made. You can try the payment again.',
            retry: 'Try again',
            unknownTitle: 'Transaction Not Found',
            unknownText: "We couldn't find this transaction.",
            home: 'To Dashboard',
        },
        zh: {
            verifying: '正在确认…',
            verifyingText: '请稍候，我们正在确认您的付款。',
            paidTitle: '付款成功！',
            paidText: '此设计已归您所有，桌位管理功能同时解锁。祝您制作愉快！',
            planTitle: '订阅已生效！',
            planText: '您的套餐已生效——账户的所有高级功能均已解锁。',
            addonTitle: '附加功能已启用！',
            addonText: '您的附加功能已在账户中启用。',
            viewSub: '查看订阅',
            createCard: '创建请柬',
            viewDesigns: '浏览设计',
            pendingTitle: '正在确认…',
            pendingText: '您的付款仍在处理中。您可以重新检查，或在「我的订单」页面查看状态。',
            recheck: '重新检查',
            rechecking: '检查中…',
            viewPurchases: '在我的订单中查看',
            waHelp: '通过 WhatsApp 联系我们',
            waMsg: '您好，请帮忙查看我的订单付款状态',
            failedTitle: '付款失败',
            failedText: '未扣除任何费用，您可以重新尝试付款。',
            retry: '重试',
            unknownTitle: '未找到交易',
            unknownText: '我们无法找到此笔交易。',
            home: '前往工作台',
        },
    }, lang);

    const verify = useCallback(async () => {
        // `ref` is what we appended to the redirect URL; `reference` is HitPay's echo.
        const reference = params.get('ref') || params.get('reference');
        if (!reference) { setStatus('unknown'); return; }
        try {
            const r = await api.post<{ status: Status; purpose?: string; kind?: string | null; item?: string | null }>('/billing/verify', { reference });
            const next = r.data.status;
            setStatus(next);
            setBought({ purpose: r.data.purpose ?? null, kind: r.data.kind ?? null, item: r.data.item ?? null });
            if (next === 'paid' && !settled.current) {
                settled.current = true;
                clear();
                await refresh();
            }
        } catch {
            setStatus('unknown');
        }
    }, [params, clear, refresh]);

    useEffect(() => { verify(); }, [verify]);

    async function recheck() {
        setRechecking(true);
        await verify();
        setRechecking(false);
    }

    const pop = {
        initial: { scale: 0.6, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring' as const, stiffness: 260, damping: 18 },
    };

    return (
        // Full-screen locked overlay: covers the entire app so nothing behind is clickable while
        // the payment is being verified. No backdrop close handler and no close affordance during
        // 'checking' — the flow resolves in place into the same centered card.
        <div style={overlay} role="dialog" aria-modal="true" aria-busy={status === 'checking'}>
            <motion.div
                className="auth-card center"
                style={{ position: 'relative' }}
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                {status === 'checking' && (
                    <>
                        <div style={{ display: 'grid', placeItems: 'center', minHeight: 60 }}><div className="spinner" /></div>
                        <h2 style={{ marginBottom: 6 }}>{C.verifying}</h2>
                        <p className="muted">{C.verifyingText}</p>
                    </>
                )}

                {status === 'paid' && (() => {
                    // A plan subscription (purpose 'subscription', or a 'package' whose kind is
                    // 'plan') and an add-on get their own wording + CTAs — never the design/table copy.
                    const isPlan = bought.purpose === 'subscription' || (bought.purpose === 'package' && bought.kind === 'plan');
                    const isAddon = bought.purpose === 'package' && bought.kind !== 'plan';
                    const title = isPlan ? C.planTitle : isAddon ? C.addonTitle : C.paidTitle;
                    const text = isPlan ? C.planText : isAddon ? C.addonText : C.paidText;
                    return (
                    <>
                        <motion.div style={iconWrap} {...pop}>
                            <CheckCircle2 size={54} color="var(--ok)" />
                        </motion.div>
                        <h2 style={{ marginBottom: 6 }}>{title}</h2>
                        <p className="muted">{text}</p>
                        <div className="row" style={{ gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                            {(isPlan || isAddon) ? (
                                <>
                                    <Link to="/panel/subscription" className="btn btn-primary"><Sparkles size={16} /> {C.viewSub}</Link>
                                    <Link to="/panel" className="btn btn-ghost"><LayoutGrid size={16} /> {C.home}</Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/panel" className="btn btn-primary"><Sparkles size={16} /> {C.createCard}</Link>
                                    <Link to="/panel/templates" className="btn btn-ghost"><LayoutGrid size={16} /> {C.viewDesigns}</Link>
                                </>
                            )}
                        </div>
                    </>
                    );
                })()}

                {status === 'pending' && (
                    <>
                        <div style={iconWrap}><Clock size={54} color="var(--gold)" /></div>
                        <h2 style={{ marginBottom: 6 }}>{C.pendingTitle}</h2>
                        <p className="muted">{C.pendingText}</p>
                        <div className="row" style={{ gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost" disabled={rechecking} onClick={recheck}>
                                <RefreshCw size={16} /> {rechecking ? C.rechecking : C.recheck}
                            </button>
                            <button className="btn btn-primary" onClick={() => nav('/panel/purchases')}>
                                <Receipt size={16} /> {C.viewPurchases}
                            </button>
                        </div>
                        {waPhone && (
                            <a href={waLink(waPhone, `${C.waMsg} ${reference}`.trim())} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
                                <MessageCircle size={15} /> {C.waHelp}
                            </a>
                        )}
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <motion.div style={iconWrap} {...pop}>
                            <XCircle size={54} color="var(--bad)" />
                        </motion.div>
                        <h2 style={{ marginBottom: 6 }}>{C.failedTitle}</h2>
                        <p className="muted">{C.failedText}</p>
                        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/panel/checkout')}>
                            <RotateCcw size={16} /> {C.retry}
                        </button>
                    </>
                )}

                {status === 'unknown' && (
                    <>
                        <div style={iconWrap}><XCircle size={54} color="var(--muted)" /></div>
                        <h2 style={{ marginBottom: 6 }}>{C.unknownTitle}</h2>
                        <p className="muted">{C.unknownText}</p>
                        <Link to="/panel" className="btn btn-primary" style={{ marginTop: 12 }}>{C.home}</Link>
                    </>
                )}
            </motion.div>
        </div>
    );
}

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    display: 'grid', placeItems: 'center', padding: 16,
    background: 'rgba(24, 18, 33, 0.62)', backdropFilter: 'blur(4px)',
};
const iconWrap: React.CSSProperties = { display: 'grid', placeItems: 'center', minHeight: 60 };
