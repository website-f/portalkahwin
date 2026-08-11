import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../context/LangContext';

export function CheckoutReturn() {
    const [params] = useSearchParams();
    const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'failed' | 'unknown'>('checking');
    const { lang } = useLang();
    const C = ({
        bm: {
            verifying: 'Mengesahkan pembayaran…',
            paidTitle: 'Pembayaran berjaya! 🎉',
            paidText: 'Akaun anda kini Premium. Selamat merancang majlis!',
            pendingTitle: 'Pembayaran belum selesai',
            pendingText: 'Status masih menunggu. Kami akan kemas kini sebaik sahaja disahkan.',
            failedTitle: 'Pembayaran gagal',
            failedText: 'Tiada caj dikenakan. Sila cuba lagi.',
            unknownTitle: 'Tidak dijumpai',
            unknownText: 'Kami tidak dapat mengesan transaksi ini.',
            toDashboard: 'Ke Dashboard',
        },
        en: {
            verifying: 'Verifying payment…',
            paidTitle: 'Payment successful! 🎉',
            paidText: 'Your account is now Premium. Happy planning!',
            pendingTitle: 'Payment not completed',
            pendingText: "Status is still pending. We'll update as soon as it's confirmed.",
            failedTitle: 'Payment failed',
            failedText: 'No charge was made. Please try again.',
            unknownTitle: 'Not found',
            unknownText: "We couldn't find this transaction.",
            toDashboard: 'To Dashboard',
        },
    })[lang];

    useEffect(() => {
        // ToyyibPay appends ?status_id=&billcode=&order_id= on return.
        const billcode = params.get('billcode');
        if (!billcode) { setStatus('unknown'); return; }
        api.post('/billing/verify', { billcode })
            .then((r) => setStatus(r.data.status))
            .catch(() => setStatus('unknown'));
    }, [params]);

    const view = {
        checking: { icon: <div className="spinner" />, title: C.verifying, text: '' },
        paid: { icon: <CheckCircle2 size={54} color="var(--ok)" />, title: C.paidTitle, text: C.paidText },
        pending: { icon: <Clock size={54} color="var(--gold)" />, title: C.pendingTitle, text: C.pendingText },
        failed: { icon: <XCircle size={54} color="var(--bad)" />, title: C.failedTitle, text: C.failedText },
        unknown: { icon: <XCircle size={54} color="var(--muted)" />, title: C.unknownTitle, text: C.unknownText },
    }[status];

    return (
        <div className="auth-wrap" style={{ minHeight: '70vh' }}>
            <div className="auth-card center">
                <div style={{ display: 'grid', placeItems: 'center', minHeight: 60 }}>{view.icon}</div>
                <h2 style={{ marginBottom: 6 }}>{view.title}</h2>
                <p className="muted">{view.text}</p>
                <Link to="/app" className="btn btn-primary" style={{ marginTop: 10 }}>{C.toDashboard}</Link>
            </div>
        </div>
    );
}
