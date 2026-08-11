import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

export function RsvpForm({ slug }: { slug: string }) {
    const [form, setForm] = useState({ name: '', phone: '', pax: 1, status: 'attending', message: '' });
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            await api.post(`/cards/${slug}/rsvp`, form);
            setDone(true);
        } catch {
            setErr('Maaf, gagal menghantar. Sila cuba lagi.');
        } finally {
            setBusy(false);
        }
    }

    if (done) {
        return (
            <div style={{ textAlign: 'center', padding: 20 }}>
                <CheckCircle2 size={40} style={{ color: '#2f8f6b' }} />
                <p style={{ fontWeight: 600, margin: '8px 0 2px' }}>Terima kasih!</p>
                <p style={{ opacity: 0.7, margin: 0 }}>Kehadiran anda telah direkodkan.</p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, textAlign: 'left', maxWidth: 440, margin: '0 auto' }}>
            <input required placeholder="Nama anda" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} />
            <input placeholder="No. telefon (pilihan)" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inp} />
            <div style={{ display: 'flex', gap: 10 }}>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inp, flex: 1 }}>
                    <option value="attending">Hadir</option>
                    <option value="declined">Tidak Hadir</option>
                </select>
                <input type="number" min={1} max={20} value={form.pax}
                    onChange={(e) => setForm({ ...form, pax: Number(e.target.value) })}
                    style={{ ...inp, width: 90 }} aria-label="Bilangan" />
            </div>
            <textarea placeholder="Ucapan untuk pengantin (pilihan)" value={form.message} rows={3}
                onChange={(e) => setForm({ ...form, message: e.target.value })} style={inp} />
            {err && <div style={{ color: '#c0554e', fontSize: 13 }}>{err}</div>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Menghantar…' : 'Hantar RSVP'}</button>
        </form>
    );
}

const inp: React.CSSProperties = {
    padding: '11px 13px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
    font: 'inherit', background: 'rgba(255,255,255,0.9)', color: '#2a1f2d', width: '100%',
};
