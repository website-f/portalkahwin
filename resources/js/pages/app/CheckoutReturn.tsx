import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, RefreshCw, Sparkles, LayoutGrid, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, dict } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

type Status = 'checking' | 'paid' | 'pending' | 'failed' | 'unknown';

export function CheckoutReturn() {
    const [params] = useSearchParams();
    const [status, setStatus] = useState<Status>('checking');
    const [rechecking, setRechecking] = useState(false);
    const { lang } = useLang();
    const nav = useNavigate();
    const { refresh } = useAuth();
    const { clear } = useCart();
    const settled = useRef(false); // guard: run the paid side-effects only once

    const C = dict({
        bm: {
            verifying: 'Sedang disahkan…',
            verifyingText: 'Sila tunggu sebentar semasa kami mengesahkan pembayaran anda.',
            paidTitle: 'Pembayaran Berjaya!',
            paidText: 'Rekaan ini kini menjadi milik anda dan pengurusan susun atur meja telah dibuka. Selamat mengolah kad!',
            createCard: 'Cipta Kad Anda',
            viewDesigns: 'Lihat Rekaan',
            pendingTitle: 'Sedang disahkan…',
            pendingText: 'Status pembayaran masih menunggu. Anda boleh menyemak semula sebentar lagi.',
            recheck: 'Semak semula',
            rechecking: 'Menyemak…',
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
            createCard: 'Create your card',
            viewDesigns: 'View designs',
            pendingTitle: 'Verifying…',
            pendingText: 'Your payment is still pending. You can check again in a moment.',
            recheck: 'Check again',
            rechecking: 'Checking…',
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
            createCard: '创建请柬',
            viewDesigns: '浏览设计',
            pendingTitle: '正在确认…',
            pendingText: '您的付款仍在处理中，请稍后再检查。',
            recheck: '重新检查',
            rechecking: '检查中…',
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
            const r = await api.post<{ status: Status }>('/billing/verify', { reference });
            const next = r.data.status;
            setStatus(next);
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

                {status === 'paid' && (
                    <>
                        <motion.div style={iconWrap} {...pop}>
                            <CheckCircle2 size={54} color="var(--ok)" />
                        </motion.div>
                        <h2 style={{ marginBottom: 6 }}>{C.paidTitle}</h2>
                        <p className="muted">{C.paidText}</p>
                        <div className="row" style={{ gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                            <Link to="/panel" className="btn btn-primary"><Sparkles size={16} /> {C.createCard}</Link>
                            <Link to="/panel/templates" className="btn btn-ghost"><LayoutGrid size={16} /> {C.viewDesigns}</Link>
                        </div>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <div style={iconWrap}><Clock size={54} color="var(--gold)" /></div>
                        <h2 style={{ marginBottom: 6 }}>{C.pendingTitle}</h2>
                        <p className="muted">{C.pendingText}</p>
                        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={rechecking} onClick={recheck}>
                            <RefreshCw size={16} /> {rechecking ? C.rechecking : C.recheck}
                        </button>
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
