import { useState } from 'react';
import { CheckCircle2, CreditCard, Ban } from 'lucide-react';
import { NumberInput } from './NumberInput';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

/** Which contact details the host asks guests for. */
export type RsvpFields = 'both' | 'email' | 'phone';

/** Ticketed-event pricing, present only when the vendor charges per entry. */
export interface RsvpPay {
    price: number;
    currency: string;
}

export interface RsvpContact { name?: string | null; phone?: string | null; email?: string | null }
/** Seating capacity status from the card — present only when the event is capped. */
export interface RsvpSeating { full: boolean; contact: RsvpContact | null }

export function RsvpForm({ slug, fields = 'both', pay = null, seating = null, event = false }: { slug: string; fields?: RsvpFields; pay?: RsvpPay | null; seating?: RsvpSeating | null; event?: boolean }) {
    const { lang } = useLang();
    const [form, setForm] = useState({ name: '', phone: '', email: '', pax: 1, status: 'attending', message: '' });
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    // Full from the card at load, or flipped full by a 422 on submit (race).
    const [fullContact, setFullContact] = useState<RsvpContact | null>(seating?.full ? (seating.contact ?? {}) : null);
    const C = dict({
        bm: {
            sendFail: 'Maaf, RSVP belum berjaya dihantar. Sila cuba sekali lagi.',
            thanks: 'Terima kasih.',
            recorded: 'Kehadiran anda telah kami catat dengan penuh syukur.',
            name: 'Nama anda',
            phone: 'No. telefon',
            email: 'E-mel (untuk pengesahan & tempat duduk)',
            attending: 'Hadir',
            declined: 'Maaf, tidak dapat hadir',
            paxAria: 'Bilangan tetamu', statusAria: 'Kehadiran',
            message: 'Tinggalkan ucapan dan doa (pilihan)',
            messageEvent: 'Catatan (pilihan)',
            sending: 'Sedang menghantar…',
            submit: 'Hantar RSVP',
            priceEach: 'Harga sekepala', tax: 'Cukai', total: 'Jumlah bayaran',
            pay: 'Bayar & Sahkan Kehadiran', redirecting: 'Mengalih ke pembayaran…',
            payNote: 'Pas kehadiran (kod QR) & resit akan dihantar ke e-mel anda selepas pembayaran.',
            fullTitle: 'Maaf, tempat duduk telah penuh', fullText: 'Semua tempat duduk untuk majlis ini telah penuh. Sila hubungi tuan rumah untuk maklumat lanjut.', contactWord: 'Hubungi',
        },
        en: {
            sendFail: 'Sorry, we could not send your RSVP. Please try again.',
            thanks: 'Thank you!',
            recorded: 'Your attendance has been recorded.',
            name: 'Your name',
            phone: 'Phone number',
            email: 'Email (for confirmation & seat)',
            attending: 'Attending',
            declined: 'Unable to attend',
            paxAria: 'Number of guests', statusAria: 'Attendance',
            message: 'Wishes for the couple (optional)',
            messageEvent: 'Remarks (optional)',
            sending: 'Sending…',
            submit: 'Send RSVP',
            priceEach: 'Price per person', tax: 'Tax', total: 'Total to pay',
            pay: 'Pay & Confirm RSVP', redirecting: 'Redirecting to payment…',
            payNote: 'Your QR entry pass & receipt will be emailed to you after payment.',
            fullTitle: 'Sorry, seating is full', fullText: 'All seats for this event are taken. Please contact the host for more information.', contactWord: 'Contact',
        },
        zh: {
            sendFail: '抱歉，出席回复未能送出，请再试一次。',
            thanks: '谢谢您！',
            recorded: '我们已记录您的出席回复。',
            name: '您的姓名',
            phone: '联系电话',
            email: '电子邮箱（用于确认与座位安排）',
            attending: '出席',
            declined: '抱歉，无法出席',
            paxAria: '出席人数', statusAria: '出席情况',
            message: '给新人的祝福（可选）',
            messageEvent: '备注（可选）',
            sending: '发送中…',
            submit: '提交出席回复',
            priceEach: '每人价格', tax: '税', total: '应付总额',
            pay: '付款并确认出席', redirecting: '正在跳转到付款…',
            payNote: '付款后，您的二维码入场凭证与收据将通过电子邮件发送。',
            fullTitle: '抱歉，座位已满', fullText: '本场活动的座位已全部满员，请联系主办方了解更多。', contactWord: '联系',
        },
    }, lang);

    // Charge only applies to an attending guest; declines are always free.
    const paying = !!pay && form.status === 'attending';
    const money = (n: number) => `${pay?.currency ?? 'MYR'} ${n.toFixed(2)}`;
    const total = pay ? pay.price * Math.max(1, form.pax) : 0;
    // A paid event always needs an email (the pass is delivered there).
    const showEmail = fields !== 'phone' || !!pay;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            if (paying) {
                const res = await api.post<{ url?: string }>(`/cards/${slug}/entry`, {
                    name: form.name, phone: form.phone, email: form.email, pax: form.pax, message: form.message,
                });
                if (res.data?.url) {
                    window.location.href = res.data.url; // to HitPay — leave "busy" through the redirect
                    return;
                }
                // No URL came back — surface the error and free the button.
                setErr(C.sendFail);
                setBusy(false);
            } else {
                await api.post(`/cards/${slug}/rsvp`, form);
                setDone(true);
            }
        } catch (e) {
            // A 422 can mean the event filled up between load and submit — show the
            // full state with the host's contact rather than a generic error.
            const data = (e as { response?: { data?: { seating_full?: boolean; contact?: RsvpContact | null } } }).response?.data;
            if (data?.seating_full) {
                setFullContact(data.contact ?? {});
            } else {
                setErr(C.sendFail);
            }
            setBusy(false);
        }
    }

    if (fullContact !== null) {
        const phone = fullContact.phone?.trim();
        const email = fullContact.email?.trim();
        return (
            <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: '50%', background: '#fdecec', color: '#c0554e', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Ban size={22} />
                </div>
                <p style={{ fontWeight: 600, margin: '4px 0 2px' }}>{C.fullTitle}</p>
                <p style={{ opacity: 0.72, margin: 0, fontSize: 14, lineHeight: 1.55 }}>{C.fullText}</p>
                {fullContact.name && <p style={{ margin: '10px 0 0', fontWeight: 600 }}>{fullContact.name}</p>}
                {(phone || email) && (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                        {phone && <a href={`tel:${phone.replace(/\s+/g, '')}`} className="btn btn-primary btn-sm">{C.contactWord}: {phone}</a>}
                        {email && <a href={`mailto:${email}`} className="btn btn-ghost btn-sm">{email}</a>}
                    </div>
                )}
            </div>
        );
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
            {fields !== 'email' && (
                <input required type="tel" inputMode="tel" placeholder={C.phone} value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inp} />
            )}
            {showEmail && (
                <input required type="email" placeholder={C.email} value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp} />
            )}
            <div style={seg} role="radiogroup" aria-label={C.statusAria}>
                {(['attending', 'declined'] as const).map((v) => (
                    <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={form.status === v}
                        onClick={() => setForm({ ...form, status: v })}
                        style={segBtn(form.status === v)}
                    >
                        {v === 'attending' ? C.attending : C.declined}
                    </button>
                ))}
            </div>

            {form.status === 'attending' && (
                <label style={paxRow}>
                    <span style={{ fontSize: 13.5, color: '#5c5060' }}>{C.paxAria}</span>
                    <NumberInput
                        min={1} max={20} value={form.pax}
                        onChange={(t) => setForm({ ...form, pax: t === '' ? 1 : Number(t) })}
                        style={{ ...inp, width: 84, textAlign: 'center' }}
                        aria-label={C.paxAria}
                    />
                </label>
            )}

            {paying && (
                <div style={priceBox}>
                    <div style={priceRow}><span>{C.priceEach}</span><span>{money(pay!.price)}</span></div>
                    <div style={{ ...priceRow, fontWeight: 800, borderTop: '1px solid rgba(0,0,0,0.12)', paddingTop: 8, marginTop: 2 }}>
                        <span>{C.total} (× {form.pax})</span><span>{money(total)}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#5c5060', lineHeight: 1.5 }}>{C.payNote}</p>
                </div>
            )}

            <textarea placeholder={event ? C.messageEvent : C.message} value={form.message} rows={3}
                onChange={(e) => setForm({ ...form, message: e.target.value })} style={inp} />
            {err && <div style={{ color: '#c0554e', fontSize: 13 }}>{err}</div>}
            <button className="btn btn-primary btn-block" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {paying && !busy && <CreditCard size={16} />}
                {busy ? (paying ? C.redirecting : C.sending) : (paying ? `${C.pay} · ${money(total)}` : C.submit)}
            </button>
        </form>
    );
}

const seg: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 5,
    background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12,
};

const segBtn = (on: boolean): React.CSSProperties => ({
    padding: '10px 8px', borderRadius: 9, border: 0, cursor: 'pointer',
    font: 'inherit', fontSize: 13.5, fontWeight: on ? 700 : 500, lineHeight: 1.35,
    background: on ? 'var(--plum)' : 'transparent',
    color: on ? '#fff' : '#5c5060',
    transition: '0.15s ease',
});

const paxRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
};

const priceBox: React.CSSProperties = {
    display: 'grid', gap: 6, padding: '12px 14px', borderRadius: 12,
    background: 'rgba(74,59,196,0.06)', border: '1px solid rgba(74,59,196,0.18)',
};

const priceRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14, color: '#2a1f2d',
};

const inp: React.CSSProperties = {
    padding: '11px 13px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
    font: 'inherit', background: 'rgba(255,255,255,0.9)', color: '#2a1f2d', width: '100%',
};
