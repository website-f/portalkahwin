import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, RefreshCw, Sparkles, LayoutGrid, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../context/LangContext';
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

    const C = ({
        bm: {
            verifying: 'Sedang disahkan…',
            verifyingText: 'Sila tunggu sebentar semasa kami mengesahkan pembayaran anda.',
            paidTitle: 'Pembayaran Berjaya!',
            paidText: 'Akaun anda kini Premium. Semua rekaan premium dan susun atur meja telah dibuka.',
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
            paidText: 'Your account is now Premium. Every premium design and the seating plan are unlocked.',
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
    })[lang];

    const verify = useCallback(async () => {
        const billcode = params.get('billcode');
        if (!billcode) { setStatus('unknown'); return; }
        try {
            const r = await api.post<{ status: Status }>('/billing/verify', { billcode });
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
        <div className="auth-wrap" style={{ minHeight: '70vh' }}>
            <div className="auth-card center">
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
                            <Link to="/app" className="btn btn-primary"><Sparkles size={16} /> {C.createCard}</Link>
                            <Link to="/app/templates" className="btn btn-ghost"><LayoutGrid size={16} /> {C.viewDesigns}</Link>
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
                        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/app/checkout')}>
                            <RotateCcw size={16} /> {C.retry}
                        </button>
                    </>
                )}

                {status === 'unknown' && (
                    <>
                        <div style={iconWrap}><XCircle size={54} color="var(--muted)" /></div>
                        <h2 style={{ marginBottom: 6 }}>{C.unknownTitle}</h2>
                        <p className="muted">{C.unknownText}</p>
                        <Link to="/app" className="btn btn-primary" style={{ marginTop: 12 }}>{C.home}</Link>
                    </>
                )}
            </div>
        </div>
    );
}

const iconWrap: React.CSSProperties = { display: 'grid', placeItems: 'center', minHeight: 60 };
