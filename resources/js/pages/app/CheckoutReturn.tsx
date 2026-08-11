import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '../../lib/api';

export function CheckoutReturn() {
    const [params] = useSearchParams();
    const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'failed' | 'unknown'>('checking');

    useEffect(() => {
        // ToyyibPay appends ?status_id=&billcode=&order_id= on return.
        const billcode = params.get('billcode');
        if (!billcode) { setStatus('unknown'); return; }
        api.post('/billing/verify', { billcode })
            .then((r) => setStatus(r.data.status))
            .catch(() => setStatus('unknown'));
    }, [params]);

    const view = {
        checking: { icon: <div className="spinner" />, title: 'Mengesahkan pembayaran…', text: '' },
        paid: { icon: <CheckCircle2 size={54} color="var(--ok)" />, title: 'Pembayaran berjaya! 🎉', text: 'Akaun anda kini Premium. Selamat merancang majlis!' },
        pending: { icon: <Clock size={54} color="var(--gold)" />, title: 'Pembayaran belum selesai', text: 'Status masih menunggu. Kami akan kemas kini sebaik sahaja disahkan.' },
        failed: { icon: <XCircle size={54} color="var(--bad)" />, title: 'Pembayaran gagal', text: 'Tiada caj dikenakan. Sila cuba lagi.' },
        unknown: { icon: <XCircle size={54} color="var(--muted)" />, title: 'Tidak dijumpai', text: 'Kami tidak dapat mengesan transaksi ini.' },
    }[status];

    return (
        <div className="auth-wrap" style={{ minHeight: '70vh' }}>
            <div className="auth-card center">
                <div style={{ display: 'grid', placeItems: 'center', minHeight: 60 }}>{view.icon}</div>
                <h2 style={{ marginBottom: 6 }}>{view.title}</h2>
                <p className="muted">{view.text}</p>
                <Link to="/app" className="btn btn-primary" style={{ marginTop: 10 }}>Ke Dashboard</Link>
            </div>
        </div>
    );
}
