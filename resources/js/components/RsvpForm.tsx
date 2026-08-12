import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

export function RsvpForm({ slug }: { slug: string }) {
    const { lang } = useLang();
    const [form, setForm] = useState({ name: '', phone: '', email: '', pax: 1, status: 'attending', message: '' });
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const C = dict({
        bm: {
            sendFail: 'Maaf, RSVP belum berjaya dihantar. Sila cuba sekali lagi.',
            thanks: 'Terima kasih.',
            recorded: 'Kehadiran anda telah kami catat dengan penuh syukur.',
            name: 'Nama anda',
            phone: 'No. telefon (jika mahu)',
            email: 'E-mel (untuk pengesahan & tempat duduk)',
            attending: 'Insya-Allah hadir',
            declined: 'Mohon maaf, tidak dapat hadir',
            paxAria: 'Bilangan tetamu',
            message: 'Tinggalkan ucapan dan doa (pilihan)',
            sending: 'Sedang menghantar…',
            submit: 'Hantar RSVP',
        },
        en: {
            sendFail: 'Sorry, we could not send your RSVP. Please try again.',
            thanks: 'Thank you!',
            recorded: 'Your attendance has been recorded.',
            name: 'Your name',
            phone: 'Phone number (optional)',
            email: 'Email (for confirmation & seat)',
            attending: 'Attending',
            declined: 'Unable to attend',
            paxAria: 'Number of guests',
            message: 'Wishes for the couple (optional)',
            sending: 'Sending…',
            submit: 'Send RSVP',
        },
        zh: {
            sendFail: '抱歉，出席回复未能送出，请再试一次。',
            thanks: '谢谢您！',
            recorded: '我们已记录您的出席回复。',
            name: '您的姓名',
            phone: '联系电话（可选）',
            email: '电子邮箱（用于确认与座位安排）',
            attending: '出席',
            declined: '抱歉，无法出席',
            paxAria: '出席人数',
            message: '给新人的祝福（可选）',
            sending: '发送中…',
            submit: '提交出席回复',
        },
    }, lang);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            await api.post(`/cards/${slug}/rsvp`, form);
            setDone(true);
        } catch {
            setErr(C.sendFail);
        } finally {
            setBusy(false);
        }
    }

    if (done) {
        return (
            <div style={{ textAlign: 'center', padding: 20 }}>
                <CheckCircle2 size={40} style={{ color: '#2f8f6b' }} />
                <p style={{ fontWeight: 600, margin: '8px 0 2px' }}>{C.thanks}</p>
                <p style={{ opacity: 0.7, margin: 0 }}>{C.recorded}</p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, textAlign: 'left', maxWidth: 440, margin: '0 auto' }}>
            <input required placeholder={C.name} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} />
            <input placeholder={C.phone} value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inp} />
            <input type="email" placeholder={C.email} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp} />
            <div style={{ display: 'flex', gap: 10 }}>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inp, flex: 1 }}>
                    <option value="attending">{C.attending}</option>
                    <option value="declined">{C.declined}</option>
                </select>
                <input type="number" min={1} max={20} value={form.pax}
                    onChange={(e) => setForm({ ...form, pax: Number(e.target.value) })}
                    style={{ ...inp, width: 90 }} aria-label={C.paxAria} />
            </div>
            <textarea placeholder={C.message} value={form.message} rows={3}
                onChange={(e) => setForm({ ...form, message: e.target.value })} style={inp} />
            {err && <div style={{ color: '#c0554e', fontSize: 13 }}>{err}</div>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? C.sending : C.submit}</button>
        </form>
    );
}

const inp: React.CSSProperties = {
    padding: '11px 13px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
    font: 'inherit', background: 'rgba(255,255,255,0.9)', color: '#2a1f2d', width: '100%',
};
