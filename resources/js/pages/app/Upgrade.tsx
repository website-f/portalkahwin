import { useState } from 'react';
import { Crown, Check, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const PERKS = [
    'Semua templat premium (Grand Reveal, Khat, Songket)',
    'Susunan meja + auto-agih tempat duduk',
    'QR check-in pada hari majlis',
    'Salam Kaut tanpa had',
    'Tanpa watermark PortalKahwin',
    'Sokongan keutamaan',
];

export function Upgrade() {
    const { user } = useAuth();
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const premium = user?.plan === 'premium' || user?.role === 'admin';

    async function upgrade() {
        setBusy(true);
        setMsg(null);
        try {
            const r = await api.post('/billing/subscribe');
            if (r.data.url) window.location.href = r.data.url; // → ToyyibPay
        } catch (e: any) {
            setMsg(e?.response?.data?.message ?? 'Gagal memulakan pembayaran.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <div className="page-head"><h1>Naik Taraf Premium</h1><p className="muted" style={{ margin: 0 }}>Buka semua ciri untuk majlis yang sempurna</p></div>

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', maxWidth: 780 }}>
                <div className="panel" style={{ borderColor: 'var(--gold)', boxShadow: 'var(--shadow)' }}>
                    <div className="row"><Crown size={22} color="var(--gold)" /><span className="badge badge-gold">Premium</span></div>
                    <h2 style={{ fontSize: 40, margin: '14px 0 0' }}>RM59<span style={{ fontSize: 15, color: 'var(--muted)' }}> / setahun</span></h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0' }}>
                        {PERKS.map((p) => (
                            <li key={p} className="row" style={{ marginBottom: 10, fontSize: 14 }}>
                                <Check size={16} color="var(--ok)" /> {p}
                            </li>
                        ))}
                    </ul>
                    {premium ? (
                        <div className="badge badge-ok" style={{ padding: '10px 14px' }}><Check size={15} /> Anda sudah Premium</div>
                    ) : (
                        <button className="btn btn-gold btn-block" disabled={busy} onClick={upgrade}>
                            <Sparkles size={16} /> {busy ? 'Menyediakan pembayaran…' : 'Naik Taraf Sekarang'}
                        </button>
                    )}
                    {msg && <p className="form-err" style={{ marginTop: 12 }}>{msg}</p>}
                    <p className="muted center" style={{ fontSize: 12, marginTop: 12 }}>Pembayaran selamat melalui ToyyibPay (FPX & e-Wallet)</p>
                </div>

                <div className="panel">
                    <h3>Pelan Percuma</h3>
                    <p className="muted" style={{ fontSize: 14 }}>Anda sedang menggunakan pelan percuma.</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0', color: 'var(--muted)', fontSize: 14, lineHeight: 2 }}>
                        <li>✓ 1 templat percuma (Floral)</li>
                        <li>✓ RSVP & ucapan</li>
                        <li>✓ Countdown & lokasi</li>
                        <li style={{ opacity: 0.5 }}>✕ Templat premium</li>
                        <li style={{ opacity: 0.5 }}>✕ Susunan meja</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
