import { useEffect, useState } from 'react';
import { Send, Heart, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

interface Wish { id: string; name: string; message: string; created_at?: string; }

/**
 * Guestbook / Ucapan: guests leave a speech for the couple (no RSVP needed) and
 * every speech shows on the card. Neutral translucent styling so it reads on any
 * template background.
 */
export function WishesList({ slug }: { slug: string }) {
    const { lang } = useLang();
    const [wishes, setWishes] = useState<Wish[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const C = dict({
        bm: {
            loading: 'Sedang memuatkan ucapan…',
            empty: 'Jadilah yang pertama menitipkan doa dan ucapan.',
            name: 'Nama anda',
            message: 'Tulis ucapan atau doa untuk pengantin…',
            send: 'Kirim Ucapan',
            sending: 'Menghantar…',
            sent: 'Terima kasih atas ucapan anda!',
            errName: 'Sila isi nama dan ucapan anda.',
            errSend: 'Maaf, ucapan tidak dapat dihantar. Cuba lagi.',
        },
        en: {
            loading: 'Loading wishes…',
            empty: 'Be the first to leave a wish.',
            name: 'Your name',
            message: 'Write a wish or prayer for the couple…',
            send: 'Send Wish',
            sending: 'Sending…',
            sent: 'Thank you for your wish!',
            errName: 'Please fill in your name and wish.',
            errSend: 'Sorry, your wish could not be sent. Please try again.',
        },
        zh: {
            loading: '祝福加载中…',
            empty: '成为第一位留下祝福的人吧。',
            name: '您的姓名',
            message: '为新人写下祝福或祈愿…',
            send: '送出祝福',
            sending: '发送中…',
            sent: '感谢您的祝福！',
            errName: '请填写您的姓名与祝福内容。',
            errSend: '抱歉，祝福未能送出，请再试一次。',
        },
    }, lang);

    useEffect(() => {
        api.get<Wish[]>(`/cards/${slug}/wishes`).then((r) => setWishes(r.data)).finally(() => setLoading(false));
    }, [slug]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!name.trim() || !message.trim()) { setError(C.errName); return; }
        setSending(true);
        try {
            const r = await api.post<Wish>(`/cards/${slug}/wishes`, { name: name.trim(), message: message.trim() });
            setWishes((w) => [r.data, ...w]);
            setName(''); setMessage('');
            setSent(true);
            window.setTimeout(() => setSent(false), 2600);
        } catch {
            setError(C.errSend);
        } finally {
            setSending(false);
        }
    }

    const field: React.CSSProperties = {
        width: '100%', padding: '11px 13px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.14)',
        background: 'rgba(255,255,255,0.96)', color: '#2a1f2d', fontSize: 14, fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 16 }}>
            {/* Speech form */}
            <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
                <input
                    style={field}
                    placeholder={C.name}
                    value={name}
                    maxLength={120}
                    onChange={(e) => setName(e.target.value)}
                />
                <textarea
                    style={{ ...field, minHeight: 84, resize: 'vertical', lineHeight: 1.5 }}
                    placeholder={C.message}
                    value={message}
                    maxLength={600}
                    onChange={(e) => setMessage(e.target.value)}
                />
                {error && <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sending}
                    style={{ justifySelf: 'start' }}
                >
                    {sent ? <Check size={16} /> : <Send size={16} />}
                    {sent ? C.sent : sending ? C.sending : C.send}
                </button>
            </form>

            {/* Wishes list */}
            {loading ? (
                <div style={{ textAlign: 'center', opacity: 0.6, padding: 12 }}>{C.loading}</div>
            ) : wishes.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.7, padding: 12 }}>{C.empty}</div>
            ) : (
                <div style={{ display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 2 }} className="pk-scroll">
                    {wishes.map((w) => (
                        <div key={w.id} style={{
                            background: 'rgba(255,255,255,0.92)', color: '#2a1f2d', borderRadius: 14,
                            padding: '13px 15px', textAlign: 'left', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                <Heart size={13} style={{ color: '#c98aa0' }} />
                                <strong style={{ fontSize: 14 }}>{w.name}</strong>
                            </div>
                            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, opacity: 0.85 }}>{w.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
