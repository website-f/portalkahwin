import { useEffect, useRef, useState } from 'react';
import { Send, Heart, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

interface Wish { id: string; name: string; message: string; created_at?: string; }
type WishPalette = { primary?: string; secondary?: string; accent?: string; bg?: string; text?: string } | null | undefined;

// --- theme the guestbook from the card's palette (buttons, cards, scrollbar) ---
function wHex(hex: string): { r: number; g: number; b: number } {
    let h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h || '3d1a30', 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
const wLum = (hex: string) => { const { r, g, b } = wHex(hex); return 0.299 * r + 0.587 * g + 0.114 * b; };
function wRgba(hex: string, a: number): string { const { r, g, b } = wHex(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; }

function wishTheme(pal: WishPalette) {
    const accent = pal?.accent || '#c98aa0';
    const primary = pal?.primary || '#3d1a30';
    const bg = pal?.bg || '#ffffff';
    const lightest = wLum(primary) <= wLum(bg) ? bg : primary;
    const dark = wLum(lightest) < 120; // dark-ground card
    const fg = dark ? '#f4eee6' : (pal?.text && wLum(pal.text) < 150 ? pal.text : '#2a2530');
    const onAccent = wLum(accent) > 150 ? '#241a06' : '#ffffff';
    return {
        accent, onAccent,
        cardBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.94)',
        fieldBg: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.96)',
        fg,
        muted: wRgba(fg, 0.62),
        border: wRgba(accent, 0.3),
        scrollThumb: wRgba(accent, 0.55),
        scrollTrack: wRgba(accent, 0.12),
        navBg: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.92)',
    };
}

/**
 * Guestbook / Ucapan: guests leave a speech for the couple (no RSVP needed) and
 * every speech shows on the card. Themed from the card's palette; the host can
 * show it as a horizontal carousel or a vertical scroller (own themed scrollbar).
 */
export function WishesList({ slug, palette, layout = 'carousel', event = false }: { slug: string; palette?: WishPalette; layout?: 'carousel' | 'list'; event?: boolean }) {
    const { lang } = useLang();
    const th = wishTheme(palette);
    const vertical = layout === 'list';
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
            messageEvent: 'Tulis ucapan atau pesanan…',
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
            messageEvent: 'Leave a message or wish…',
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
            messageEvent: '留下祝福或留言…',
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
        width: '100%', padding: '11px 13px', borderRadius: 12, border: `1px solid ${th.border}`,
        background: th.fieldBg, color: th.fg, fontSize: 14, fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box',
    };

    const themeVars = {
        '--wish-accent': th.accent, '--wish-card-bg': th.cardBg, '--wish-fg': th.fg,
        '--wish-border': th.border, '--wish-nav-bg': th.navBg,
        '--wish-thumb': th.scrollThumb, '--wish-track': th.scrollTrack,
    } as React.CSSProperties;

    return (
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 16, ...themeVars }}>
            <style>{WISH_CSS}</style>
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
                    placeholder={event ? C.messageEvent : C.message}
                    value={message}
                    maxLength={600}
                    onChange={(e) => setMessage(e.target.value)}
                />
                {error && <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}
                <button
                    type="submit"
                    disabled={sending}
                    style={{
                        justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                        background: th.accent, color: th.onAccent, opacity: sending ? 0.7 : 1,
                    }}
                >
                    {sent ? <Check size={16} /> : <Send size={16} />}
                    {sent ? C.sent : sending ? C.sending : C.send}
                </button>
            </form>

            {/* Guest wishes — a vertical scroller (own themed scrollbar) or a
                self-drifting horizontal carousel, per the host's choice. */}
            {loading ? (
                <div style={{ textAlign: 'center', color: th.muted, padding: 12 }}>{C.loading}</div>
            ) : wishes.length === 0 ? (
                <div style={{ textAlign: 'center', color: th.muted, padding: 12 }}>{C.empty}</div>
            ) : vertical ? (
                <div className="wish-vert pk-wish-scroll" role="region" aria-label={C.wishesAria}>
                    {wishes.map((w) => (
                        <article key={w.id} className="wish-card wish-card-v">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                <Heart size={13} style={{ color: th.accent }} />
                                <strong style={{ fontSize: 14 }}>{w.name}</strong>
                            </div>
                            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, opacity: 0.85 }}>{w.message}</p>
                        </article>
                    ))}
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <div
                        ref={trackRef}
                        className="wish-track"
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
                                    <Heart size={13} style={{ color: th.accent }} />
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

/* Scoped to the guestbook; colours come from the card palette via CSS vars. */
const WISH_CSS = `
.wish-track {
    display: flex; gap: 14px; overflow-x: auto; overflow-y: hidden;
    scroll-snap-type: x mandatory; scroll-behavior: smooth;
    /* Side padding of exactly half the leftover width, so a centre-snapped
       first/last card can reach the middle. */
    padding: 2px calc((100% - min(300px, 82%)) / 2) 10px;
    scrollbar-width: none;
}
.wish-track::-webkit-scrollbar { display: none; }
.wish-card {
    flex: 0 0 min(300px, 82%);
    scroll-snap-align: center;
    background: var(--wish-card-bg, rgba(255,255,255,0.94)); color: var(--wish-fg, #2a1f2d);
    border: 1px solid var(--wish-border, rgba(0,0,0,0.06));
    border-radius: 14px; padding: 13px 15px; text-align: left;
    box-shadow: 0 8px 24px rgba(0,0,0,0.14);
}
/* Vertical scroller — the ucapan gets its own scrollable section with a
   card-themed scrollbar rather than the browser's default indicator. */
.wish-vert {
    display: grid; gap: 12px; max-height: min(58vh, 460px); overflow-y: auto;
    padding: 4px 10px 6px 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--wish-thumb, rgba(0,0,0,0.35)) var(--wish-track, transparent);
}
.wish-vert::-webkit-scrollbar { width: 8px; }
.wish-vert::-webkit-scrollbar-track { background: var(--wish-track, transparent); border-radius: 999px; }
.wish-vert::-webkit-scrollbar-thumb { background: var(--wish-thumb, rgba(0,0,0,0.35)); border-radius: 999px; }
.wish-card-v { flex: none; scroll-snap-align: none; }
.wish-nav { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 4px; }
.wish-nav button {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--wish-border, rgba(255,255,255,0.55));
    background: var(--wish-nav-bg, rgba(255,255,255,0.9)); color: var(--wish-fg, #2a1f2d);
    transition: 0.15s ease;
}
.wish-nav button:hover { transform: translateY(-1px); }
.wish-count { font-size: 12px; letter-spacing: 1px; color: var(--wish-fg, #2a1f2d); opacity: 0.75; min-width: 52px; text-align: center; }
`;
