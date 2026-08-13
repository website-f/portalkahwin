import { useEffect, useRef, useState } from 'react';
import { Send, Heart, Check, ChevronLeft, ChevronRight } from 'lucide-react';
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

    // Carousel: a horizontal scroller that advances itself. Auto-advance is a
    // scroll, not a transform, so dragging and the arrows share one source of
    // truth and never fight each other.
    const trackRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);

    const cardStep = (): number => {
        const el = trackRef.current;
        if (!el) return 0;
        const first = el.querySelector<HTMLElement>('.wish-card');
        // Card width plus the flex gap.
        return first ? first.offsetWidth + 14 : el.clientWidth;
    };

    const nudge = (dir: 1 | -1): void => {
        const el = trackRef.current;
        if (!el) return;
        setPaused(true);
        const step = cardStep();
        // Wrap at the ends so the arrows never dead-end.
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
        const atStart = el.scrollLeft <= 4;
        if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
        else if (dir === -1 && atStart) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
        else el.scrollBy({ left: dir * step, behavior: 'smooth' });
    };

    const onScroll = (): void => {
        const el = trackRef.current;
        const step = cardStep();
        if (!el || step <= 0) return;
        setActive(Math.round(el.scrollLeft / step));
    };

    // Drift left-to-right on its own; pauses on hover, touch, or while the tab
    // is hidden so it does not silently race ahead in a background tab.
    useEffect(() => {
        if (paused || wishes.length < 2) return;
        const id = window.setInterval(() => {
            const el = trackRef.current;
            if (!el || document.hidden) return;
            const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
            if (atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
            else el.scrollBy({ left: cardStep(), behavior: 'smooth' });
        }, 4000);
        return () => window.clearInterval(id);
    }, [paused, wishes.length]);

    // Resume drifting a moment after the guest stops interacting.
    useEffect(() => {
        if (!paused) return;
        const id = window.setTimeout(() => setPaused(false), 9000);
        return () => window.clearTimeout(id);
    }, [paused, active]);

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
            prev: 'Ucapan sebelumnya', next: 'Ucapan seterusnya', wishesAria: 'Ucapan tetamu',
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
            prev: 'Previous wish', next: 'Next wish', wishesAria: 'Guest wishes',
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
            prev: '上一条祝福', next: '下一条祝福', wishesAria: '宾客祝福',
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

            {/* Wishes carousel — drifts on its own, and can be dragged or nudged. */}
            {loading ? (
                <div style={{ textAlign: 'center', opacity: 0.6, padding: 12 }}>{C.loading}</div>
            ) : wishes.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.7, padding: 12 }}>{C.empty}</div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <style>{WISH_CSS}</style>

                    <div
                        ref={trackRef}
                        className="wish-track pk-scroll"
                        onPointerEnter={() => setPaused(true)}
                        onPointerLeave={() => setPaused(false)}
                        onPointerDown={() => setPaused(true)}
                        onScroll={onScroll}
                        role="region"
                        aria-label={C.wishesAria}
                    >
                        {wishes.map((w) => (
                            <article key={w.id} className="wish-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                    <Heart size={13} style={{ color: '#c98aa0' }} />
                                    <strong style={{ fontSize: 14 }}>{w.name}</strong>
                                </div>
                                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, opacity: 0.85 }}>{w.message}</p>
                            </article>
                        ))}
                    </div>

                    {wishes.length > 1 && (
                        <div className="wish-nav">
                            <button type="button" onClick={() => nudge(-1)} aria-label={C.prev}>
                                <ChevronLeft size={17} />
                            </button>
                            <span className="wish-count">{active + 1} / {wishes.length}</span>
                            <button type="button" onClick={() => nudge(1)} aria-label={C.next}>
                                <ChevronRight size={17} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* Scoped to the guestbook so it reads on any template background. */
const WISH_CSS = `
.wish-track {
    display: flex; gap: 14px; overflow-x: auto; overflow-y: hidden;
    scroll-snap-type: x mandatory; scroll-behavior: smooth;
    /* Side padding of exactly half the leftover width. Without it a
       centre-snapped first/last card cannot reach the middle — it runs out of
       scroll first — so the carousel always sat off to one side. */
    padding: 2px calc((100% - min(300px, 82%)) / 2) 10px;
    scrollbar-width: none;
}
.wish-track::-webkit-scrollbar { display: none; }
.wish-card {
    flex: 0 0 min(300px, 82%);
    scroll-snap-align: center;
    background: rgba(255,255,255,0.94); color: #2a1f2d;
    border-radius: 14px; padding: 13px 15px; text-align: left;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}
.wish-nav { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 4px; }
.wish-nav button {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 999px; cursor: pointer;
    border: 1px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.9); color: #2a1f2d;
    transition: 0.15s ease;
}
.wish-nav button:hover { background: #fff; transform: translateY(-1px); }
.wish-count { font-size: 12px; letter-spacing: 1px; opacity: 0.75; min-width: 52px; text-align: center; }
`;
