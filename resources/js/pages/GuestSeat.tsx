import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Armchair, CalendarDays, Clock, MapPin, RefreshCw, Hourglass, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { CHIP_W, CHIP_H, firstName, tableGeom } from '../lib/tableGeometry';
import { useLang } from '../context/LangContext';

/* Mirrors GET /cards/:slug/seat/:guest */
interface SeatCell {
    seat_index: number;
    name: string | null;
    is_you: boolean;
}
interface GuestTable {
    label: string;
    shape: 'round' | 'rect';
    capacity: number;
    seats: SeatCell[];
}
interface SeatView {
    enabled: boolean;
    guest: { name: string; pax: number; status: 'attending' | 'declined' };
    invitation: {
        slug: string;
        bride_name: string | null;
        groom_name: string | null;
        date_label: string | null;
        time_label: string | null;
        venue_name: string | null;
    };
    table: GuestTable | null;
}

/* The host often seats guests days after the RSVPs arrive, so an open page
 * re-checks on a timer instead of stranding the guest on a stale "not yet". */
const POLL_MS = 20000;

export function GuestSeat() {
    const { slug, guestId } = useParams();
    const { lang } = useLang();
    const [data, setData] = useState<SeatView | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const [frameW, setFrameW] = useState(0);

    const C = ({
        bm: {
            heading: 'Tempat Duduk Anda',
            forGuest: 'Untuk',
            pax: 'orang',
            waitingTitle: 'Meja anda belum ditetapkan',
            waitingText: 'Tuan rumah masih menyusun atur meja. Simpan pautan ini — halaman akan dikemas kini dengan sendirinya sebaik sahaja meja anda ditetapkan.',
            disabledTitle: 'Susun atur meja tidak digunakan',
            disabledText: 'Majlis ini tidak menggunakan penetapan tempat duduk. Sila hadir dan pilih mana-mana tempat yang selesa.',
            declinedTitle: 'Anda telah menyatakan tidak dapat hadir',
            declinedText: 'Jika keadaan berubah, sila hubungi tuan rumah untuk mengemas kini RSVP anda.',
            yourSeat: 'Kerusi anda',
            seatWord: 'Kerusi',
            empty: 'Kosong',
            you: 'ANDA',
            refresh: 'Semak semula',
            refreshing: 'Menyemak…',
            viewCard: 'Lihat Kad Jemputan',
            notFoundTitle: 'Pautan tidak sah',
            notFoundText: 'Kami tidak dapat mengesan tempahan ini. Sila gunakan pautan daripada e-mel pengesahan RSVP anda.',
            tableMates: 'Anda berkongsi meja ini dengan',
            noMates: 'Belum ada tetamu lain di meja ini.',
        },
        en: {
            heading: 'Your Seat',
            forGuest: 'For',
            pax: 'guests',
            waitingTitle: 'Your table is not assigned yet',
            waitingText: 'The host is still arranging the tables. Keep this link — the page updates itself as soon as your table is assigned.',
            disabledTitle: 'Seating is not used',
            disabledText: 'This event does not use assigned seating. Please take any seat you are comfortable with.',
            declinedTitle: 'You replied that you cannot attend',
            declinedText: 'If that changes, contact the host to update your RSVP.',
            yourSeat: 'Your seat',
            seatWord: 'Seat',
            empty: 'Empty',
            you: 'YOU',
            refresh: 'Check again',
            refreshing: 'Checking…',
            viewCard: 'View invitation',
            notFoundTitle: 'Invalid link',
            notFoundText: 'We could not find this reservation. Please use the link from your RSVP confirmation email.',
            tableMates: 'You are sharing this table with',
            noMates: 'No other guests at this table yet.',
        },
    })[lang];

    const load = useCallback(async (): Promise<void> => {
        try {
            const r = await api.get<SeatView>(`/cards/${slug}/seat/${guestId}`);
            setData(r.data);
            setNotFound(false);
        } catch {
            setNotFound(true);
        }
    }, [slug, guestId]);

    useEffect(() => {
        setLoading(true);
        load().finally(() => setLoading(false));
    }, [load]);

    // Poll only while the guest is genuinely waiting on the host.
    const waiting = !!data && data.enabled && !data.table && data.guest.status === 'attending';
    useEffect(() => {
        if (!waiting) return;
        const id = window.setInterval(() => void load(), POLL_MS);
        return () => window.clearInterval(id);
    }, [waiting, load]);

    // Scale the table down to fit narrow screens rather than letting it overflow.
    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setFrameW(entry.contentRect.width));
        ro.observe(el);
        setFrameW(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, [data]);

    async function refresh(): Promise<void> {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    if (notFound || !data) {
        return (
            <Shell>
                <div className="center">
                    <h2 style={{ marginBottom: 6 }}>{C.notFoundTitle}</h2>
                    <p className="muted">{C.notFoundText}</p>
                </div>
            </Shell>
        );
    }

    const { guest, invitation: inv, table } = data;
    const couple = [inv.bride_name, inv.groom_name].filter(Boolean).join(' & ');
    const mySeats = table ? table.seats.filter((s) => s.is_you).map((s) => s.seat_index + 1) : [];
    const mates = table
        ? table.seats.filter((s) => s.name && !s.is_you).map((s) => s.name as string)
        : [];
    const uniqueMates = [...new Set(mates)];

    const g = table ? tableGeom(table.shape, table.capacity) : null;
    // Leave a little breathing room inside the frame, and never blow the table up
    // past its natural size on a wide desktop.
    const scale = g && frameW ? Math.min(1, (frameW - 24) / g.width) : 1;

    return (
        <Shell>
            <div className="center" style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)' }}>
                    {C.heading}
                </div>
                {couple && <h1 style={{ margin: '6px 0 0', fontSize: 30 }}>{couple}</h1>}
                <p className="muted" style={{ margin: '10px 0 0', fontSize: 14 }}>
                    {C.forGuest} <strong style={{ color: 'var(--ink)' }}>{guest.name}</strong> · {guest.pax} {C.pax}
                </p>
            </div>

            <div className="stack" style={{ gap: 6, marginBottom: 22, fontSize: 13.5 }}>
                {inv.date_label && <Meta icon={<CalendarDays size={15} />} text={inv.date_label} />}
                {inv.time_label && <Meta icon={<Clock size={15} />} text={inv.time_label} />}
                {inv.venue_name && <Meta icon={<MapPin size={15} />} text={inv.venue_name} />}
            </div>

            {guest.status === 'declined' ? (
                <Notice title={C.declinedTitle} text={C.declinedText} />
            ) : !data.enabled ? (
                <Notice title={C.disabledTitle} text={C.disabledText} />
            ) : !table || !g ? (
                <>
                    <Notice icon={<Hourglass size={30} />} title={C.waitingTitle} text={C.waitingText} />
                    <div className="center" style={{ marginTop: 16 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => void refresh()} disabled={refreshing}>
                            <RefreshCw size={15} /> {refreshing ? C.refreshing : C.refresh}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        style={{
                            background: 'var(--cream)',
                            border: '1px solid var(--gold-soft)',
                            borderRadius: 14,
                            padding: '14px 16px',
                            textAlign: 'center',
                            marginBottom: 18,
                        }}
                    >
                        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)' }}>
                            {C.yourSeat}
                        </div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--plum)', marginTop: 2 }}>
                            {table.label}
                        </div>
                        {mySeats.length > 0 && (
                            <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>
                                {C.seatWord} {mySeats.join(', ')}
                            </div>
                        )}
                    </motion.div>

                    {/* Read-only floorplan of just this guest's table */}
                    <div
                        ref={frameRef}
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: g.height * scale + 16,
                            display: 'grid',
                            placeItems: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ position: 'relative', width: g.width, height: g.height, transform: `scale(${scale})` }}>
                            <div
                                style={{
                                    position: 'absolute',
                                    left: g.body.left,
                                    top: g.body.top,
                                    width: g.body.w,
                                    height: g.body.h,
                                    borderRadius: g.body.round ? '50%' : 14,
                                    background: 'var(--plum)',
                                    color: '#fff',
                                    border: '1.5px solid var(--gold)',
                                    display: 'grid',
                                    placeItems: 'center',
                                    textAlign: 'center',
                                    padding: 6,
                                    boxShadow: 'var(--shadow)',
                                }}
                            >
                                <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, lineHeight: 1.15 }}>
                                    {table.label}
                                </div>
                            </div>

                            {table.seats.map((s) => {
                                const pos = g.seats[s.seat_index];
                                if (!pos) return null;
                                return (
                                    <div
                                        key={s.seat_index}
                                        title={s.name ?? C.empty}
                                        style={{
                                            position: 'absolute',
                                            left: pos.x,
                                            top: pos.y,
                                            width: CHIP_W,
                                            height: CHIP_H,
                                            borderRadius: 8,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 5px',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            overflow: 'hidden',
                                            background: s.is_you ? 'var(--gold)' : s.name ? '#fff' : 'transparent',
                                            color: s.is_you ? '#241a06' : s.name ? 'var(--plum)' : 'var(--muted)',
                                            border: s.is_you
                                                ? '1.5px solid var(--gold)'
                                                : s.name
                                                  ? '1px solid var(--plum)'
                                                  : '1.5px dashed var(--line)',
                                            boxShadow: s.is_you ? '0 0 0 3px var(--gold-soft)' : 'none',
                                        }}
                                    >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.is_you ? C.you : s.name ? firstName(s.name) : '·'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                            <Armchair size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                            {C.tableMates}
                        </div>
                        {uniqueMates.length === 0 ? (
                            <p className="muted" style={{ fontSize: 13, margin: 0 }}>{C.noMates}</p>
                        ) : (
                            <div className="row wrap" style={{ gap: 7 }}>
                                {uniqueMates.map((n) => (
                                    <span key={n} className="badge">{n}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="center" style={{ marginTop: 26 }}>
                <Link to={`/e/${inv.slug}`} className="btn btn-primary btn-sm">
                    <ExternalLink size={15} /> {C.viewCard}
                </Link>
            </div>
        </Shell>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '32px 16px' }}>
            <div
                style={{
                    maxWidth: 560,
                    margin: '0 auto',
                    background: '#fff',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow)',
                    padding: '28px 22px',
                }}
            >
                {children}
            </div>
        </div>
    );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="row" style={{ gap: 9, justifyContent: 'center', color: 'var(--muted)' }}>
            <span style={{ color: 'var(--gold)', display: 'flex' }}>{icon}</span>
            <span>{text}</span>
        </div>
    );
}

function Notice({ icon, title, text }: { icon?: React.ReactNode; title: string; text: string }) {
    return (
        <div
            className="center"
            style={{
                background: 'var(--cream)',
                border: '1px dashed var(--line)',
                borderRadius: 14,
                padding: '26px 18px',
            }}
        >
            {icon && <div style={{ color: 'var(--gold)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{icon}</div>}
            <h3 style={{ margin: '0 0 6px', fontSize: 19 }}>{title}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{text}</p>
        </div>
    );
}
