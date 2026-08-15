import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, RefreshCw, Ticket } from 'lucide-react';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

type Status = 'checking' | 'paid' | 'pending' | 'failed' | 'unknown';

/** Shape returned by GET /entry/verify — the server never echoes 'checking'. */
interface VerifyResponse {
    status: Exclude<Status, 'checking'>;
    email: string | null;
    passUrl: string | null;
}

/**
 * Public landing page HitPay redirects a wedding guest to after paying to RSVP a
 * ticketed event. It verifies the payment server-side, then confirms success and
 * links the guest to their QR entry pass. No app shell, no auth — a guest, not a user.
 */
export function EntryReturn() {
    const location = useLocation();
    const [status, setStatus] = useState<Status>('checking');
    const [email, setEmail] = useState<string | null>(null);
    const [passUrl, setPassUrl] = useState<string | null>(null);
    const [rechecking, setRechecking] = useState(false);
    const { lang } = useLang();
    const ran = useRef(false); // guard: the initial verify fires exactly once on mount

    const C = dict({
        bm: {
            verifying: 'Sedang mengesahkan…',
            verifyingText: 'Sila tunggu sebentar semasa kami mengesahkan pembayaran anda.',
            paidTitle: 'Pembayaran Diterima',
            paidText: 'RSVP anda telah disahkan. Jumpa anda di majlis!',
            emailedTo: 'Kami telah menghantar pas masuk anda ke',
            viewPass: 'Lihat pas masuk saya',
            pendingTitle: 'Masih mengesahkan pembayaran anda…',
            pendingText: 'Status pembayaran masih menunggu. Anda boleh menyemak semula sebentar lagi.',
            recheck: 'Semak semula',
            rechecking: 'Menyemak…',
            failedTitle: 'Pembayaran tidak selesai',
            failedText: 'Tiada caj dikenakan. Sila cuba buat pembayaran sekali lagi.',
            unknownTitle: 'Pembayaran tidak ditemui',
            unknownText: 'Kami tidak dapat mengesan pembayaran ini.',
        },
        en: {
            verifying: 'Verifying…',
            verifyingText: 'Please wait a moment while we confirm your payment.',
            paidTitle: 'Payment Received',
            paidText: "Your RSVP is confirmed. We'll see you at the celebration!",
            emailedTo: "We've emailed your entry pass to",
            viewPass: 'View my entry pass',
            pendingTitle: 'Still confirming your payment…',
            pendingText: 'Your payment is still pending. You can check again in a moment.',
            recheck: 'Check again',
            rechecking: 'Checking…',
            failedTitle: 'Payment was not completed',
            failedText: 'No charge was made. Please try the payment again.',
            unknownTitle: 'Payment not found',
            unknownText: "We couldn't find this payment.",
        },
        zh: {
            verifying: '正在确认…',
            verifyingText: '请稍候，我们正在确认您的付款。',
            paidTitle: '付款已收到',
            paidText: '您的出席回复已确认，期待在婚礼上与您相见！',
            emailedTo: '我们已将您的入场凭证发送至',
            viewPass: '查看我的入场凭证',
            pendingTitle: '仍在确认您的付款…',
            pendingText: '您的付款仍在处理中，请稍后再检查。',
            recheck: '重新检查',
            rechecking: '检查中…',
            failedTitle: '付款未完成',
            failedText: '未扣除任何费用，请重新尝试付款。',
            unknownTitle: '未找到付款',
            unknownText: '我们无法找到此笔付款。',
        },
    }, lang);

    const verify = useCallback(async () => {
        // `ref` is what we appended to the redirect URL; `reference` is HitPay's echo.
        const params = new URLSearchParams(location.search);
        const reference = params.get('ref') || params.get('reference');
        if (!reference) { setStatus('unknown'); return; }
        try {
            const r = await api.get<VerifyResponse>('/entry/verify', { params: { reference } });
            setStatus(r.data.status);
            setEmail(r.data.email);
            setPassUrl(r.data.passUrl);
        } catch {
            setStatus('unknown');
        }
    }, [location.search]);

    useEffect(() => {
        if (ran.current) return; // React 18 strict-mode double-mount safe
        ran.current = true;
        verify();
    }, [verify]);

    async function recheck() {
        setRechecking(true);
        await verify();
        setRechecking(false);
    }

    function openPass() {
        if (passUrl) window.location.href = passUrl;
    }

    const pop = {
        initial: { scale: 0.6, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring' as const, stiffness: 260, damping: 18 },
    };

    return (
        <div style={page}>
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
                        {email && (
                            <p className="muted" style={{ marginTop: 8 }}>
                                {C.emailedTo} <strong style={{ color: 'var(--plum)' }}>{email}</strong>
                            </p>
                        )}
                        {passUrl && (
                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openPass}>
                                <Ticket size={16} /> {C.viewPass}
                            </button>
                        )}
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
                    </>
                )}

                {status === 'unknown' && (
                    <>
                        <div style={iconWrap}><XCircle size={54} color="var(--muted)" /></div>
                        <h2 style={{ marginBottom: 6 }}>{C.unknownTitle}</h2>
                        <p className="muted">{C.unknownText}</p>
                    </>
                )}
            </motion.div>
        </div>
    );
}

// Standalone public page: fills the viewport in the cream app tint and centres the card,
// mobile-first, so the return lands cleanly whether HitPay bounces back on phone or desktop.
const page: React.CSSProperties = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    background: 'var(--cream)',
};
const iconWrap: React.CSSProperties = { display: 'grid', placeItems: 'center', minHeight: 60 };
