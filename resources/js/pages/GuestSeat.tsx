import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { mediaUrl } from '../lib/base';
import { motion } from 'framer-motion';
import {
    Armchair,
    CalendarDays,
    Clock,
    MapPin,
    RefreshCw,
    Hourglass,
    ExternalLink,
    ZoomIn,
    ZoomOut,
    Maximize2,
    User,
    EyeOff,
} from 'lucide-react';
import { api } from '../lib/api';
import { CHIP_W, CHIP_H, firstName, tableGeom } from '../lib/tableGeometry';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import type { Geo } from '../lib/tableGeometry';
import { useLang, dict } from '../context/LangContext';

/* ------------------------------------------------------------------ *
 * Types — mirrors the full-floorplan GET /cards/:slug/seat/:guest
 * ------------------------------------------------------------------ */
interface SeatCell {
    seat_index: number;
    name: string | null;
    is_you: boolean;
    occupied: boolean;
}
interface GuestTable {
    id: string;
    label: string;
    shape: 'round' | 'rect';
    capacity: number;
    pos_x: number;
    pos_y: number;
    seats: SeatCell[];
}
/** A read-only fixture from the host's floorplan. */
interface VenueProp {
    id: string;
    kind: string;
    label: string;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    rotation: number;
}

/** Fixture colours, mirroring the host's seating board so the two plans match. */
const PROP_STYLE: Record<string, { bg: string; ink: string }> = {
    stage: { bg: '#f3e4f1', ink: '#7b2d62' },
    entrance: { bg: '#e3f1e8', ink: '#1f6b45' },
    reception: { bg: '#e6ecfb', ink: '#2c4c9b' },
    catering: { bg: '#fdeede', ink: '#96551a' },
    gift: { bg: '#fdf0d9', ink: '#8a6a1e' },
    vendor_booth: { bg: '#eae7fb', ink: '#4a3bc4' },
    photo: { bg: '#fce8ec', ink: '#a52a4c' },
    dancefloor: { bg: '#e6f5f7', ink: '#1c6b78' },
    vip: { bg: '#f7ecd6', ink: '#8a6a1e' },
    restroom: { bg: '#eef0f3', ink: '#55606e' },
    walkway: { bg: '#f4f4f7', ink: '#6b6b7b' },
    parking: { bg: '#eceff2', ink: '#4c5866' },
};
const PROP_FALLBACK = { bg: '#f4f4f7', ink: '#6b6b7b' };

interface SeatView {
    enabled: boolean;
    names_visible: boolean;
    guest: { name: string; pax: number; status: 'attending' | 'declined' };
    invitation: {
        slug: string;
        bride_name: string | null;
        groom_name: string | null;
        date_label: string | null;
        time_label: string | null;
        venue_name: string | null;
    };
    my_table_id: string | null;
    tables: GuestTable[];
    props: VenueProp[];
    /** Vendor branding, when the host's plan includes it. */
    host?: { company_name?: string | null; company_logo?: string | null } | null;
}

/* World camera: tables live in world coords (pos_x, pos_y); the world layer is
 * transformed by translate(panX,panY) scale(zoom) with origin 0 0. Read-only —
 * the only gesture is panning the empty canvas (no table dragging / seat edits). */
interface View {
    zoom: number;
    panX: number;
    panY: number;
}
interface PanDrag {
    startX: number;
    startY: number;
    basePanX: number;
    basePanY: number;
    moved: boolean;
}

/**
 * A two-finger pinch, captured at the moment the second finger lands.
 *
 * A guest opens this on a phone, standing in a hall, looking for one table
 * among twenty — pinching is the only zoom gesture they will think to try.
 * Scroll-to-zoom is a desktop affordance and the buttons are a fallback.
 */
interface PinchGesture {
    /** Distance between the two fingers when the pinch began. */
    startDist: number;
    startZoom: number;
    /** Midpoint in frame coordinates — the pinch zooms about this point. */
    startMidX: number;
    startMidY: number;
    basePanX: number;
    basePanY: number;
}

/* The host often seats guests days after the RSVPs arrive, so an open page
 * re-checks on a timer instead of stranding the guest on a stale "not yet". */
const POLL_MS = 20000;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const DRAG_THRESHOLD = 4;
const GRID = 26; // world-unit spacing of the dotted grid

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
const geom = (t: GuestTable): Geo => tableGeom(t.shape, t.capacity);

export function GuestSeat() {
    const { slug, guestId } = useParams();
    const { lang } = useLang();
    const [data, setData] = useState<SeatView | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notFound, setNotFound] = useState(false);

    // Read-only camera + pan gesture bookkeeping.
    const [view, setView] = useState<View>({ zoom: 1, panX: 40, panY: 40 });
    // The guest's check-in pass. Same payload the host's scanner reads
    // (`PKG:<guest id>`, see CheckInScanner) so this page IS their pass —
    // they show it at the door and the host scans it straight off the screen.
    const [qr, setQr] = useState('');
    const [panning, setPanning] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<PanDrag | null>(null);
    // Live pointers by id, so a second finger can be recognised as a pinch.
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchRef = useRef<PinchGesture | null>(null);
    const didFit = useRef(false);

    const C = dict({
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
            yourTable: 'Meja anda',
            occupiedSeat: 'Tetamu',
            refresh: 'Semak semula',
            refreshing: 'Menyemak…',
            viewCard: 'Lihat Kad Jemputan',
            notFoundTitle: 'Pautan tidak sah',
            notFoundText: 'Kami tidak dapat mengesan tempahan ini. Sila gunakan pautan daripada e-mel pengesahan RSVP anda.',
            tableMates: 'Anda berkongsi meja ini dengan',
            noMates: 'Belum ada tetamu lain di meja ini.',
            namesHidden: 'Nama tetamu lain disembunyikan oleh tuan rumah.',
            hostedBy: 'Dianjurkan oleh',
            checkinPass: 'Pas Daftar Masuk',
            scanQr: 'Tunjukkan kod ini di pintu masuk untuk didaftarkan.',
            zoomOut: 'Zum keluar',
            zoomIn: 'Zum masuk',
            fitAll: 'Muat semua meja',
            scrollHint: 'Cubit untuk zum · seret untuk gerak',
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
            yourTable: 'Your table',
            occupiedSeat: 'Guest',
            refresh: 'Check again',
            refreshing: 'Checking…',
            viewCard: 'View invitation',
            notFoundTitle: 'Invalid link',
            notFoundText: 'We could not find this reservation. Please use the link from your RSVP confirmation email.',
            tableMates: 'You are sharing this table with',
            noMates: 'No other guests at this table yet.',
            namesHidden: 'Other guests’ names are hidden by the host.',
            hostedBy: 'Hosted by',
            checkinPass: 'Check-in pass',
            scanQr: 'Show this code at the door to be checked in.',
            zoomOut: 'Zoom out',
            zoomIn: 'Zoom in',
            fitAll: 'Fit all tables',
            scrollHint: 'Pinch to zoom · drag to move',
        },
        zh: {
            heading: '您的座位',
            forGuest: '宾客',
            pax: '位',
            waitingTitle: '尚未为您安排餐桌',
            waitingText: '主人家仍在安排席位。请保留此链接 — 座位确定后本页会自动更新。',
            disabledTitle: '本场不设指定座位',
            disabledText: '此婚宴不安排固定席位，请自由入座。',
            declinedTitle: '您已回复无法出席',
            declinedText: '若情况有变，请联系主人家更新您的出席回复。',
            yourSeat: '您的座位',
            seatWord: '座位',
            empty: '空位',
            you: '您',
            yourTable: '您的餐桌',
            occupiedSeat: '宾客',
            refresh: '重新检查',
            refreshing: '检查中…',
            viewCard: '查看请柬',
            notFoundTitle: '链接无效',
            notFoundText: '未找到此预订记录。请使用出席确认邮件中的链接。',
            tableMates: '与您同桌的宾客',
            noMates: '此桌暂无其他宾客。',
            namesHidden: '主人家已隐藏其他宾客的姓名。',
            hostedBy: '主办单位',
            checkinPass: '签到凭证',
            scanQr: '入场时出示此二维码即可签到。',
            zoomOut: '缩小',
            zoomIn: '放大',
            fitAll: '显示全部餐桌',
            scrollHint: '双指缩放 · 拖动移动',
        },
    }, lang);

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

    // Poll only while the guest is genuinely waiting on the host to seat them.
    const waiting = !!data && data.enabled && data.my_table_id === null && data.guest.status === 'attending';
    useEffect(() => {
        if (!waiting) return;
        const id = window.setInterval(() => void load(), POLL_MS);
        return () => window.clearInterval(id);
    }, [waiting, load]);

    // The floorplan canvas only mounts once the guest is actually seated.
    const showCanvas =
        !!data && data.enabled && data.guest.status === 'attending' && data.my_table_id !== null && data.tables.length > 0;

    useEffect(() => {
        if (!guestId) return;
        QRCode.toDataURL(`PKG:${guestId}`, {
            width: 640,
            margin: 1,
            color: { dark: '#3d1a30', light: '#ffffff' },
        })
            .then(setQr)
            .catch(() => setQr(''));
    }, [guestId]);

    /* -------- camera helpers -------- */
    const fitView = useCallback((): void => {
        const el = frameRef.current;
        if (!el || !data || data.tables.length === 0) return;
        const rect = el.getBoundingClientRect();
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const t of data.tables) {
            const g = geom(t);
            minX = Math.min(minX, t.pos_x);
            minY = Math.min(minY, t.pos_y);
            maxX = Math.max(maxX, t.pos_x + g.width);
            maxY = Math.max(maxY, t.pos_y + g.height);
        }
        // Fixtures count towards the bounds too, or "fit all" can crop the stage
        // right out of the view the guest is trying to read.
        for (const p of data.props ?? []) {
            minX = Math.min(minX, p.pos_x);
            minY = Math.min(minY, p.pos_y);
            maxX = Math.max(maxX, p.pos_x + p.width);
            maxY = Math.max(maxY, p.pos_y + p.height);
        }
        const contentW = Math.max(1, maxX - minX);
        const contentH = Math.max(1, maxY - minY);
        const pad = 40;
        const zoom = clamp(
            Math.min((rect.width - 2 * pad) / contentW, (rect.height - 2 * pad) / contentH),
            ZOOM_MIN,
            ZOOM_MAX,
        );
        const panX = (rect.width - contentW * zoom) / 2 - minX * zoom;
        const panY = (rect.height - contentH * zoom) / 2 - minY * zoom;
        setView({ zoom, panX, panY });
    }, [data]);

    const zoomButton = useCallback((factor: number): void => {
        const el = frameRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        setView((v) => {
            const newZoom = clamp(v.zoom * factor, ZOOM_MIN, ZOOM_MAX);
            if (newZoom === v.zoom) return v;
            const wx = (cx - v.panX) / v.zoom;
            const wy = (cy - v.panY) / v.zoom;
            return { zoom: newZoom, panX: cx - wx * newZoom, panY: cy - wy * newZoom };
        });
    }, []);

    // Auto-fit once, the first time the canvas becomes visible (also covers the
    // waiting → seated transition after a poll).
    useEffect(() => {
        if (showCanvas && !loading && !didFit.current) {
            didFit.current = true;
            requestAnimationFrame(() => fitView());
        }
    }, [showCanvas, loading, fitView]);

    // Wheel zoom — native + non-passive so we can preventDefault the page scroll.
    useEffect(() => {
        const el = frameRef.current;
        if (!el || !showCanvas) return;
        const handler = (e: WheelEvent): void => {
            if ((e.target as HTMLElement).closest('[data-ui]')) return;
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const factor = Math.exp(-e.deltaY * 0.0012);
            setView((v) => {
                const newZoom = clamp(v.zoom * factor, ZOOM_MIN, ZOOM_MAX);
                if (newZoom === v.zoom) return v;
                const wx = (cx - v.panX) / v.zoom;
                const wy = (cy - v.panY) / v.zoom;
                return { zoom: newZoom, panX: cx - wx * newZoom, panY: cy - wy * newZoom };
            });
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [showCanvas]);

    /* -------- drag-to-pan (read-only: no table moves) -------- */
    const stopBubble = (e: ReactPointerEvent<HTMLElement>): void => e.stopPropagation();

    /** Pointer positions relative to the frame, which is what the camera uses. */
    function framePoint(e: { clientX: number; clientY: number }): { x: number; y: number } {
        const rect = frameRef.current?.getBoundingClientRect();
        return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
    }

    function beginPinch(): void {
        const pts = [...pointersRef.current.values()];
        if (pts.length < 2) return;
        const [a, b] = pts;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 1) return;
        // Panning and pinching are different gestures; drop the pan mid-flight.
        dragRef.current = null;
        setPanning(false);
        pinchRef.current = {
            startDist: dist,
            startZoom: view.zoom,
            startMidX: (a.x + b.x) / 2,
            startMidY: (a.y + b.y) / 2,
            basePanX: view.panX,
            basePanY: view.panY,
        };
    }

    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
        pointersRef.current.set(e.pointerId, framePoint(e));

        if (pointersRef.current.size >= 2) {
            beginPinch();
            return;
        }

        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            basePanX: view.panX,
            basePanY: view.panY,
            moved: false,
        };
        setPanning(true);
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* capture unsupported — pan still works via move events */
        }
    }

    function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
        if (pointersRef.current.has(e.pointerId)) {
            pointersRef.current.set(e.pointerId, framePoint(e));
        }

        const pinch = pinchRef.current;
        if (pinch) {
            const pts = [...pointersRef.current.values()];
            if (pts.length < 2) return;
            const [a, b] = pts;
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < 1) return;

            const zoom = clamp((dist / pinch.startDist) * pinch.startZoom, ZOOM_MIN, ZOOM_MAX);
            // Keep the world point under the pinch midpoint pinned, so the plan
            // grows out of the fingers rather than sliding away from them.
            const worldX = (pinch.startMidX - pinch.basePanX) / pinch.startZoom;
            const worldY = (pinch.startMidY - pinch.basePanY) / pinch.startZoom;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            setView({ zoom, panX: midX - worldX * zoom, panY: midY - worldY * zoom });
            return;
        }

        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
        d.moved = true;
        setView((v) => ({ ...v, panX: d.basePanX + dx, panY: d.basePanY + dy }));
    }

    function onPointerUp(e: ReactPointerEvent<HTMLDivElement>): void {
        pointersRef.current.delete(e.pointerId);

        if (pinchRef.current) {
            pinchRef.current = null;
            // Lifting one finger of a pinch leaves the other still down; resume
            // panning from where it is rather than freezing until they let go.
            const rest = [...pointersRef.current.entries()][0];
            if (rest) {
                const rect = frameRef.current?.getBoundingClientRect();
                dragRef.current = {
                    startX: rest[1].x + (rect?.left ?? 0),
                    startY: rest[1].y + (rect?.top ?? 0),
                    basePanX: view.panX,
                    basePanY: view.panY,
                    moved: true,
                };
                setPanning(true);
                return;
            }
        }

        dragRef.current = null;
        setPanning(false);
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
    }

    async function refresh(): Promise<void> {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    /* -------- render: loading / not found -------- */
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

    const { guest, invitation: inv, names_visible: namesVisible, tables } = data;
    const couple = [inv.bride_name, inv.groom_name].filter(Boolean).join(' & ');

    const myTable = data.my_table_id ? tables.find((t) => t.id === data.my_table_id) ?? null : null;
    const mySeats = myTable ? myTable.seats.filter((s) => s.is_you).map((s) => s.seat_index + 1) : [];
    const mates = myTable
        ? myTable.seats.filter((s) => s.occupied && !s.is_you && s.name).map((s) => s.name as string)
        : [];
    const uniqueMates = [...new Set(mates)];

    const dot = GRID * view.zoom;
    const frameStyle: CSSProperties = {
        position: 'relative',
        width: '100%',
        height: 'min(64vh, 560px)',
        overflow: 'hidden',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        background: '#fff',
        backgroundImage: 'radial-gradient(circle, rgba(91,42,69,0.14) 1px, transparent 1.5px)',
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${view.panX}px ${view.panY}px`,
        touchAction: 'none',
        cursor: panning ? 'grabbing' : 'grab',
        userSelect: 'none',
    };
    const floatCard: CSSProperties = {
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(6px)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        boxShadow: 'var(--shadow)',
    };

    return (
        <Shell wide={showCanvas}>
            <div className="center" style={{ marginBottom: 22 }}>
                {/* The vendor's own mark leads: at the door this page is theirs,
                    not the platform's. Only rendered when they uploaded one. */}
                {data.host?.company_logo && (
                    <img
                        src={mediaUrl(data.host.company_logo)}
                        alt={data.host.company_name ?? ''}
                        style={{ height: 84, width: 'auto', maxWidth: 320, objectFit: 'contain', margin: '0 auto 16px', display: 'block' }}
                    />
                )}
                {!data.host?.company_logo && data.host?.company_name && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--plum)', marginBottom: 12 }}>
                        {data.host.company_name}
                    </div>
                )}
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
            ) : !showCanvas || !myTable ? (
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
                    {/* Your-seat summary */}
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
                            marginBottom: 16,
                        }}
                    >
                        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)' }}>
                            {C.yourSeat}
                        </div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--plum)', marginTop: 2 }}>
                            {myTable.label}
                        </div>
                        {mySeats.length > 0 && (
                            <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>
                                {C.seatWord} {mySeats.join(', ')}
                            </div>
                        )}
                    </motion.div>

                    {/* Read-only floorplan of ALL tables — zoom/pan, own table highlighted */}
                    <div
                        ref={frameRef}
                        style={frameStyle}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                    >
                        {/* WORLD layer — translate + scale, origin 0 0 */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                transformOrigin: '0 0',
                                transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
                                willChange: 'transform',
                            }}
                        >
                            {/* Fixtures first so they sit behind the tables, exactly as
                                on the host's board. Read-only: no handles, no pointer
                                events, nothing here can be moved. */}
                            {(data.props ?? []).map((p) => {
                                const st = PROP_STYLE[p.kind] ?? PROP_FALLBACK;
                                return (
                                    <div
                                        key={p.id}
                                        aria-hidden="true"
                                        style={{
                                            position: 'absolute',
                                            left: p.pos_x,
                                            top: p.pos_y,
                                            width: p.width,
                                            height: p.height,
                                            zIndex: 0,
                                            pointerEvents: 'none',
                                            transform: p.rotation ? `rotate(${p.rotation}deg)` : undefined,
                                            borderRadius: 12,
                                            background: st.bg,
                                            border: `1.5px dashed ${st.ink}`,
                                            color: st.ink,
                                            display: 'grid',
                                            placeItems: 'center',
                                            textAlign: 'center',
                                            padding: 8,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            letterSpacing: 0.2,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {p.label}
                                    </div>
                                );
                            })}

                            {tables.map((t) => {
                                const g = geom(t);
                                const isMine = t.id === data.my_table_id;
                                return (
                                    <div
                                        key={t.id}
                                        style={{
                                            position: 'absolute',
                                            left: t.pos_x,
                                            top: t.pos_y,
                                            width: g.width,
                                            height: g.height,
                                            zIndex: isMine ? 3 : 1,
                                        }}
                                    >
                                        {/* "Your table" pin */}
                                        {isMine && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: g.body.left + g.body.w / 2,
                                                    top: g.body.top - 34,
                                                    transform: 'translateX(-50%)',
                                                    zIndex: 5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    background: 'var(--plum)',
                                                    color: '#fff',
                                                    border: '1.5px solid var(--gold)',
                                                    borderRadius: 999,
                                                    padding: '3px 9px',
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    letterSpacing: 0.3,
                                                    whiteSpace: 'nowrap',
                                                    boxShadow: 'var(--shadow)',
                                                }}
                                            >
                                                <MapPin size={11} /> {C.yourTable}
                                            </div>
                                        )}

                                        {/* Table body */}
                                        <div
                                            title={t.label}
                                            style={{
                                                position: 'absolute',
                                                left: g.body.left,
                                                top: g.body.top,
                                                width: g.body.w,
                                                height: g.body.h,
                                                borderRadius: g.body.round ? '50%' : 14,
                                                background: isMine ? 'var(--plum)' : '#fff',
                                                color: isMine ? '#fff' : 'var(--plum)',
                                                border: `1.5px solid ${isMine ? 'var(--gold)' : 'var(--plum)'}`,
                                                boxShadow: isMine
                                                    ? '0 0 0 4px var(--gold-soft), var(--shadow)'
                                                    : 'var(--shadow)',
                                                display: 'grid',
                                                placeItems: 'center',
                                                textAlign: 'center',
                                                padding: 6,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontFamily: 'var(--serif)',
                                                    fontWeight: 600,
                                                    fontSize: 15,
                                                    lineHeight: 1.15,
                                                    maxWidth: g.body.w - 14,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {t.label}
                                            </div>
                                        </div>

                                        {/* Seat chips (read-only) */}
                                        {t.seats.map((s) => {
                                            const pos = g.seats[s.seat_index];
                                            if (!pos) return null;
                                            const you = s.is_you;
                                            const otherOccupied = !you && s.occupied;
                                            const showName = otherOccupied && namesVisible && !!s.name;
                                            const title = you
                                                ? guest.name
                                                : otherOccupied
                                                  ? s.name ?? C.occupiedSeat
                                                  : C.empty;
                                            const chipStyle: CSSProperties = {
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
                                                background: you
                                                    ? 'var(--gold)'
                                                    : otherOccupied
                                                      ? 'var(--cream)'
                                                      : 'transparent',
                                                color: you
                                                    ? '#241a06'
                                                    : otherOccupied
                                                      ? 'var(--plum)'
                                                      : 'var(--muted)',
                                                border: you
                                                    ? '1.5px solid var(--gold)'
                                                    : otherOccupied
                                                      ? '1px solid var(--plum)'
                                                      : '1.5px dashed var(--line)',
                                                boxShadow: you ? '0 0 0 3px var(--gold-soft)' : 'none',
                                            };
                                            return (
                                                <div key={s.seat_index} title={title} style={chipStyle}>
                                                    {you ? (
                                                        <span
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {C.you}
                                                        </span>
                                                    ) : showName ? (
                                                        <span
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {firstName(s.name as string)}
                                                        </span>
                                                    ) : otherOccupied ? (
                                                        <User size={13} aria-hidden />
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

                        {/* FLOATING: zoom controls (bottom-right) */}
                        <div
                            data-ui
                            onPointerDown={stopBubble}
                            style={{
                                ...floatCard,
                                position: 'absolute',
                                bottom: 12,
                                right: 12,
                                zIndex: 6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: 5,
                            }}
                        >
                            <button
                                className="btn btn-ghost btn-sm"
                                title={C.zoomOut}
                                style={{ padding: 7 }}
                                onClick={() => zoomButton(1 / 1.2)}
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span
                                style={{
                                    minWidth: 46,
                                    textAlign: 'center',
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: 'var(--plum)',
                                }}
                            >
                                {Math.round(view.zoom * 100)}%
                            </span>
                            <button
                                className="btn btn-ghost btn-sm"
                                title={C.zoomIn}
                                style={{ padding: 7 }}
                                onClick={() => zoomButton(1.2)}
                            >
                                <ZoomIn size={16} />
                            </button>
                            <button
                                className="btn btn-ghost btn-sm"
                                title={C.fitAll}
                                style={{ padding: 7 }}
                                onClick={fitView}
                            >
                                <Maximize2 size={16} />
                            </button>
                        </div>
                    </div>

                    <p className="muted" style={{ fontSize: 12, margin: '10px 2px 0' }}>
                        {C.scrollHint}
                    </p>

                    {/* The guest's check-in pass. Big enough to scan off a phone
                        held at arm's length in a dim hall, and centred — this is
                        the thing they hold up at the door. */}
                    {qr && (
                        <div
                            style={{
                                marginTop: 22,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
                                {C.checkinPass}
                            </div>
                            <img
                                src={qr}
                                alt={C.checkinPass}
                                style={{
                                    width: 'min(260px, 72vw)',
                                    height: 'auto',
                                    borderRadius: 16,
                                    border: '1px solid var(--line)',
                                    background: '#fff',
                                    padding: 10,
                                    boxShadow: 'var(--shadow)',
                                }}
                            />
                            <p className="muted" style={{ fontSize: 13, margin: '10px 0 0', maxWidth: 320 }}>{C.scanQr}</p>
                            {data.host?.company_name && (
                                <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
                                    {C.hostedBy} <strong style={{ color: 'var(--ink)' }}>{data.host.company_name}</strong>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tablemates */}
                    <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                            <Armchair size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                            {C.tableMates}
                        </div>
                        {!namesVisible ? (
                            <p className="muted" style={{ fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <EyeOff size={14} /> {C.namesHidden}
                            </p>
                        ) : uniqueMates.length === 0 ? (
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

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '32px 16px' }}>
            <div
                style={{
                    maxWidth: wide ? 760 : 560,
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
            <MadeByPortalKahwin style={{ maxWidth: wide ? 760 : 560, margin: '0 auto' }} />
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
