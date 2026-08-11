import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
    Plus,
    Sparkles,
    Eraser,
    Circle,
    Square,
    Trash2,
    X,
    Users,
    ZoomIn,
    ZoomOut,
    Maximize2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../context/LangContext';

/* ------------------------------------------------------------------ *
 * Types (mirrors GET /invitations/:id/seating)
 * ------------------------------------------------------------------ */
interface Guest {
    id: string;
    name: string;
    pax: number;
}
interface Seat {
    id: string;
    seat_index: number;
    guest: Guest | null;
}
interface Table {
    id: string;
    label: string;
    shape: 'round' | 'rect';
    capacity: number;
    pos_x: number;
    pos_y: number;
    seats: Seat[];
}
interface SeatingData {
    auto_seat: boolean;
    tables: Table[];
    unassigned: Guest[];
}

interface Geo {
    width: number;
    height: number;
    seats: { x: number; y: number }[];
    body: { left: number; top: number; w: number; h: number; round: boolean };
}

/* World camera: tables live in world coords (pos_x, pos_y); the world layer
 * is transformed by translate(panX,panY) scale(zoom) with origin 0 0. */
interface View {
    zoom: number;
    panX: number;
    panY: number;
}

/* Active pointer gesture — either panning the empty canvas or moving a table. */
type ActiveDrag =
    | {
          mode: 'pan';
          startX: number;
          startY: number;
          basePanX: number;
          basePanY: number;
          moved: boolean;
      }
    | {
          mode: 'table';
          startX: number;
          startY: number;
          tableId: string;
          baseX: number;
          baseY: number;
          curX: number;
          curY: number;
          moved: boolean;
      };

/* ------------------------------------------------------------------ *
 * Constants + geometry helpers (pure — laid out relative to each table)
 * ------------------------------------------------------------------ */
const CHIP_W = 54;
const CHIP_H = 30;
const DRAG_THRESHOLD = 4;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const GRID = 26; // world-unit spacing of the dotted grid

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

function roundGeom(capacity: number): Geo {
    const cap = Math.max(capacity, 1);
    const d = 108;
    const r = Math.max(d / 2 + 26, ((CHIP_W + 8) * cap) / (2 * Math.PI));
    const pad = 34;
    const size = 2 * (r + pad);
    const c = size / 2;
    const seats = Array.from({ length: cap }, (_, i) => {
        const ang = (i / cap) * Math.PI * 2 - Math.PI / 2;
        return { x: c + r * Math.cos(ang) - CHIP_W / 2, y: c + r * Math.sin(ang) - CHIP_H / 2 };
    });
    return {
        width: size,
        height: size,
        seats,
        body: { left: c - d / 2, top: c - d / 2, w: d, h: d, round: true },
    };
}

function rectGeom(capacity: number): Geo {
    const cap = Math.max(capacity, 1);
    const perRow = Math.ceil(cap / 2);
    const bodyW = Math.max(130, perRow * 58);
    const bodyH = 66;
    const gapY = CHIP_H + 14;
    const bodyLeft = 14;
    const bodyTop = gapY;
    const width = bodyW + 28;
    const height = bodyH + gapY * 2;
    const seats: { x: number; y: number }[] = [];
    const topCount = perRow;
    const bottomCount = cap - perRow;
    const place = (count: number, rowY: number): void => {
        for (let i = 0; i < count; i++) {
            const slotW = bodyW / count;
            const cx = bodyLeft + slotW * (i + 0.5);
            seats.push({ x: cx - CHIP_W / 2, y: rowY });
        }
    };
    place(topCount, bodyTop - CHIP_H - 8);
    place(bottomCount, bodyTop + bodyH + 8);
    return {
        width,
        height,
        seats,
        body: { left: bodyLeft, top: bodyTop, w: bodyW, h: bodyH, round: false },
    };
}

const geom = (t: Table): Geo => (t.shape === 'round' ? roundGeom(t.capacity) : rectGeom(t.capacity));

function errMsg(e: unknown): string {
    if (e && typeof e === 'object') {
        // Narrow an axios-style error without importing axios / using `any`.
        const r = e as { response?: { data?: { message?: unknown } }; message?: unknown };
        const m = r.response?.data?.message;
        if (typeof m === 'string') return m;
        if (typeof r.message === 'string') return r.message;
    }
    return 'Ralat berlaku. Sila cuba lagi.';
}

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export function SeatingBoard({ invitationId }: { invitationId: string }) {
    const { lang } = useLang();
    const [data, setData] = useState<SeatingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null);

    const [labelDraft, setLabelDraft] = useState('');
    const [capDraft, setCapDraft] = useState(8);

    // Camera + UI chrome.
    const [view, setView] = useState<View>({ zoom: 1, panX: 40, panY: 40 });
    const [panelOpen, setPanelOpen] = useState(true);
    const [isNarrow, setIsNarrow] = useState(false);

    const frameRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<ActiveDrag | null>(null);
    const didFit = useRef(false);

    /* -------- data loading -------- */
    const load = useCallback(async (): Promise<void> => {
        try {
            const r = await api.get<SeatingData>(`/invitations/${invitationId}/seating`);
            setData(r.data);
        } catch (e) {
            setError(errMsg(e));
        }
    }, [invitationId]);

    useEffect(() => {
        setLoading(true);
        load().finally(() => setLoading(false));
    }, [load]);

    // Keep the table editor drafts in sync with the selected table.
    useEffect(() => {
        const t = data?.tables.find((x) => x.id === selectedTableId);
        if (t) {
            setLabelDraft(t.label);
            setCapDraft(t.capacity);
        }
    }, [selectedTableId, data]);

    // Track a narrow viewport so the floating chrome stays usable on mobile.
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 720px)');
        const upd = (): void => setIsNarrow(mq.matches);
        upd();
        mq.addEventListener('change', upd);
        return () => mq.removeEventListener('change', upd);
    }, []);

    // On narrow screens the guest panel starts collapsed so the canvas is visible.
    useEffect(() => {
        setPanelOpen(!isNarrow);
    }, [isNarrow]);

    /* -------- generic mutation runner (refetch after every mutation) -------- */
    const run = useCallback(
        async (fn: () => Promise<unknown>): Promise<boolean> => {
            setBusy(true);
            setError(null);
            try {
                await fn();
                await load();
                return true;
            } catch (e) {
                setError(errMsg(e));
                return false;
            } finally {
                setBusy(false);
            }
        },
        [load],
    );

    /* -------- camera helpers -------- */
    const zoomAt = useCallback((cx: number, cy: number, factor: number): void => {
        // Keep the world point under (cx,cy) fixed while scaling (standard formula).
        setView((v) => {
            const newZoom = clamp(v.zoom * factor, ZOOM_MIN, ZOOM_MAX);
            if (newZoom === v.zoom) return v;
            const wx = (cx - v.panX) / v.zoom;
            const wy = (cy - v.panY) / v.zoom;
            return { zoom: newZoom, panX: cx - wx * newZoom, panY: cy - wy * newZoom };
        });
    }, []);

    const zoomButton = useCallback(
        (factor: number): void => {
            const el = frameRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            zoomAt(rect.width / 2, rect.height / 2, factor);
        },
        [zoomAt],
    );

    const fitView = useCallback((): void => {
        const el = frameRef.current;
        if (!el || !data) return;
        const rect = el.getBoundingClientRect();
        if (data.tables.length === 0) {
            setView({ zoom: 1, panX: 40, panY: 40 });
            return;
        }
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
        const contentW = Math.max(1, maxX - minX);
        const contentH = Math.max(1, maxY - minY);
        const pad = 56;
        const zoom = clamp(
            Math.min((rect.width - 2 * pad) / contentW, (rect.height - 2 * pad) / contentH),
            ZOOM_MIN,
            ZOOM_MAX,
        );
        const panX = (rect.width - contentW * zoom) / 2 - minX * zoom;
        const panY = (rect.height - contentH * zoom) / 2 - minY * zoom;
        setView({ zoom, panX, panY });
    }, [data]);

    // Auto-fit once, when the first payload arrives.
    useEffect(() => {
        if (!didFit.current && data && !loading) {
            didFit.current = true;
            requestAnimationFrame(() => fitView());
        }
    }, [data, loading, fitView]);

    // Wheel zoom — native + non-passive so we can preventDefault the page scroll.
    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;
        const handler = (e: WheelEvent): void => {
            // Let scrollable floating UI (guest list, etc.) scroll normally.
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
        // Re-run once loading flips: the canvas frame only mounts after data loads.
    }, [loading]);

    /* -------- bilingual copy (visible labels only) -------- */
    const C = ({
        bm: {
            heading: 'Susun Atur Tempat Duduk',
            seats: 'kerusi', filled: 'berisi', empty: 'kosong',
            loadFailed: 'Gagal memuatkan susun atur.', tryAgain: 'Cuba lagi',
            emptyBoard: 'Belum ada meja. Klik ‘Tambah Meja’.',
            addTable: 'Tambah Meja', autoAssign: 'Auto-agih', clear: 'Kosongkan', autoAssignRsvp: 'Auto-agih RSVP',
            placePrefix: 'Klik kerusi kosong untuk letak', cancel: 'Batal',
            editTable: 'Sunting Meja', tableName: 'Nama meja', capacity: 'Muatan (kerusi)', shape: 'Bentuk',
            round: 'Bulat', rect: 'Segi Empat', deleteTable: 'Padam Meja',
            unassigned: 'Belum Diletak', allPlaced: 'Semua tetamu yang hadir telah diletak.',
            placeHint: 'Klik seorang tetamu, kemudian klik kerusi kosong untuk meletakkannya.',
            guests: 'Tetamu',
            hint: 'Skrol untuk zum · seret ruang kosong untuk pan · seret meja untuk alih.',
            clearConfirm: 'Kosongkan semua tempat duduk? Tindakan ini tidak boleh dibatalkan.',
            deleteConfirm: (label: string) => `Padam "${label}"?`,
        },
        en: {
            heading: 'Seating Arrangement',
            seats: 'seats', filled: 'filled', empty: 'empty',
            loadFailed: 'Failed to load layout.', tryAgain: 'Try again',
            emptyBoard: 'No tables yet. Click ‘Add table’.',
            addTable: 'Add table', autoAssign: 'Auto-assign', clear: 'Clear', autoAssignRsvp: 'Auto-assign on RSVP',
            placePrefix: 'Click an empty seat to place', cancel: 'Cancel',
            editTable: 'Edit table', tableName: 'Table name', capacity: 'Capacity (seats)', shape: 'Shape',
            round: 'Round', rect: 'Rectangle', deleteTable: 'Delete table',
            unassigned: 'Unassigned', allPlaced: 'All attending guests have been placed.',
            placeHint: 'Click a guest, then click an empty seat to place them.',
            guests: 'Guests',
            hint: 'Scroll to zoom · drag empty space to pan · drag a table to move.',
            clearConfirm: 'Clear all seats? This action cannot be undone.',
            deleteConfirm: (label: string) => `Delete "${label}"?`,
        },
    })[lang];

    /* -------- guest / seat interactions -------- */
    function selectGuest(id: string): void {
        setSelectedTableId(null);
        setSelectedGuestId((cur) => (cur === id ? null : id));
    }

    async function seatClick(seat: Seat): Promise<void> {
        if (seat.guest) {
            // Occupied → free it (this is also how re-seating works).
            await run(() => api.post(`/seats/${seat.id}/unassign`));
            return;
        }
        if (!selectedGuestId) return;
        const ok = await run(() =>
            api.post(`/seats/${seat.id}/assign`, { rsvp_guest_id: selectedGuestId }),
        );
        if (ok) setSelectedGuestId(null);
    }

    /* -------- pointer gestures: pan empty canvas / drag a table -------- */
    const stopBubble = (e: ReactPointerEvent<HTMLElement>): void => e.stopPropagation();

    function onFramePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
        // Reaches here only for empty canvas (tables / chips / UI stop propagation).
        dragRef.current = {
            mode: 'pan',
            startX: e.clientX,
            startY: e.clientY,
            basePanX: view.panX,
            basePanY: view.panY,
            moved: false,
        };
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* capture unsupported — pan still works via move events */
        }
    }

    function onTablePointerDown(e: ReactPointerEvent<HTMLDivElement>, t: Table): void {
        e.stopPropagation();
        dragRef.current = {
            mode: 'table',
            startX: e.clientX,
            startY: e.clientY,
            tableId: t.id,
            baseX: t.pos_x,
            baseY: t.pos_y,
            curX: t.pos_x,
            curY: t.pos_y,
            moved: false,
        };
        // Capture on the frame so subsequent move/up land on our shared handlers.
        try {
            frameRef.current?.setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
    }

    function onFramePointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved) {
            if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
            d.moved = true;
        }
        if (d.mode === 'pan') {
            setView((v) => ({ ...v, panX: d.basePanX + dx, panY: d.basePanY + dy }));
        } else {
            // Screen delta → world delta by dividing out the zoom.
            const nx = d.baseX + dx / view.zoom;
            const ny = d.baseY + dy / view.zoom;
            d.curX = nx;
            d.curY = ny;
            setLivePos({ id: d.tableId, x: nx, y: ny });
        }
    }

    function onFramePointerUp(e: ReactPointerEvent<HTMLDivElement>): void {
        const d = dragRef.current;
        if (!d) return;
        dragRef.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        if (d.mode === 'pan') {
            // A click on empty space (no drag) clears the table selection.
            if (!d.moved) setSelectedTableId(null);
            return;
        }
        setLivePos(null);
        if (d.moved) {
            void run(() =>
                api.put(`/tables/${d.tableId}`, { pos_x: Math.round(d.curX), pos_y: Math.round(d.curY) }),
            );
        } else {
            // A click that never moved => select the table for editing.
            setSelectedGuestId(null);
            setSelectedTableId(d.tableId);
            setPanelOpen(true);
        }
    }

    /* -------- toolbar actions -------- */
    function addTable(): void {
        if (!data) return;
        void run(() =>
            api.post(`/invitations/${invitationId}/tables`, {
                label: `Meja ${data.tables.length + 1}`,
                capacity: 8,
                shape: 'round',
            }),
        );
    }

    function autoSeat(): void {
        void run(() => api.post(`/invitations/${invitationId}/seating/auto`));
    }

    function clearAll(): void {
        if (!window.confirm(C.clearConfirm)) return;
        void run(() => api.post(`/invitations/${invitationId}/seating/clear`));
    }

    async function toggleAutoAssign(v: boolean): Promise<void> {
        setData((d) => (d ? { ...d, auto_seat: v } : d)); // optimistic (spec: update local state)
        setError(null);
        try {
            await api.put(`/invitations/${invitationId}`, { auto_seat: v });
        } catch (e) {
            setError(errMsg(e));
            setData((d) => (d ? { ...d, auto_seat: !v } : d)); // revert
        }
    }

    /* -------- table editor commits -------- */
    const selTable = data?.tables.find((t) => t.id === selectedTableId) ?? null;

    function commitLabel(): void {
        if (!selTable) return;
        const next = labelDraft.trim();
        if (next && next !== selTable.label) void run(() => api.put(`/tables/${selTable.id}`, { label: next }));
    }

    function commitCapacity(): void {
        if (!selTable) return;
        const next = clamp(Math.round(capDraft) || 1, 1, 20);
        setCapDraft(next);
        if (next !== selTable.capacity) void run(() => api.put(`/tables/${selTable.id}`, { capacity: next }));
    }

    function setShape(shape: 'round' | 'rect'): void {
        if (!selTable || selTable.shape === shape) return;
        void run(() => api.put(`/tables/${selTable.id}`, { shape }));
    }

    async function deleteTable(): Promise<void> {
        if (!selTable) return;
        if (!window.confirm(C.deleteConfirm(selTable.label))) return;
        const ok = await run(() => api.delete(`/tables/${selTable.id}`));
        if (ok) setSelectedTableId(null);
    }

    /* -------- render: loading / fatal states -------- */
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="panel">
                <p className="form-err">{error ?? C.loadFailed}</p>
                <button className="btn btn-ghost btn-sm" onClick={() => void load()}>
                    {C.tryAgain}
                </button>
            </div>
        );
    }

    const allSeats = data.tables.flatMap((t) => t.seats);
    const total = allSeats.length;
    const occupied = allSeats.filter((s) => s.guest !== null).length;
    const free = total - occupied;
    const selectedGuestName = data.unassigned.find((g) => g.id === selectedGuestId)?.name ?? null;

    // Dotted grid that scales with zoom + rides the pan, so it reads like a CAD/n8n canvas.
    const dot = GRID * view.zoom;
    const frameStyle: CSSProperties = {
        position: 'relative',
        width: '100%',
        height: '70vh',
        minHeight: 460,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        background: '#fff',
        backgroundImage: 'radial-gradient(circle, rgba(91,42,69,0.16) 1px, transparent 1.5px)',
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${view.panX}px ${view.panY}px`,
        touchAction: 'none',
        cursor: dragRef.current?.mode === 'pan' ? 'grabbing' : 'default',
        userSelect: 'none',
    };

    const floatCard: CSSProperties = {
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(6px)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        boxShadow: 'var(--shadow)',
    };

    return (
        <div>
            {/* Header + live summary */}
            <div className="spread wrap" style={{ marginBottom: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 24 }}>{C.heading}</h2>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
                        {total} {C.seats} · {occupied} {C.filled} · {free} {C.empty}
                    </p>
                </div>
            </div>

            {error && (
                <p className="form-err" style={{ marginBottom: 12 }}>
                    {error}
                </p>
            )}

            {/* ---------------- CANVAS ---------------- */}
            <div
                ref={frameRef}
                style={frameStyle}
                onPointerDown={onFramePointerDown}
                onPointerMove={onFramePointerMove}
                onPointerUp={onFramePointerUp}
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
                    {data.tables.map((t) => {
                        const g = geom(t);
                        const live = livePos && livePos.id === t.id ? livePos : null;
                        const x = live ? live.x : t.pos_x;
                        const y = live ? live.y : t.pos_y;
                        const isSelected = t.id === selectedTableId;
                        const occ = t.seats.filter((s) => s.guest !== null).length;
                        const seats = [...t.seats].sort((a, b) => a.seat_index - b.seat_index);

                        return (
                            <div
                                key={t.id}
                                style={{ position: 'absolute', left: x, top: y, width: g.width, height: g.height }}
                            >
                                {/* Table body — the draggable / selectable surface */}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    title="Seret untuk alih · klik untuk sunting"
                                    onPointerDown={(e) => onTablePointerDown(e, t)}
                                    style={{
                                        position: 'absolute',
                                        left: g.body.left,
                                        top: g.body.top,
                                        width: g.body.w,
                                        height: g.body.h,
                                        borderRadius: g.body.round ? '50%' : 14,
                                        background: isSelected ? 'var(--plum)' : '#fff',
                                        color: isSelected ? '#fff' : 'var(--plum)',
                                        border: `1.5px solid ${isSelected ? 'var(--gold)' : 'var(--plum)'}`,
                                        boxShadow: isSelected ? '0 0 0 3px var(--gold-soft)' : 'var(--shadow)',
                                        display: 'grid',
                                        placeItems: 'center',
                                        textAlign: 'center',
                                        padding: 6,
                                        cursor: live ? 'grabbing' : 'grab',
                                        touchAction: 'none',
                                        userSelect: 'none',
                                        transition: 'background 0.15s ease, box-shadow 0.15s ease',
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontFamily: 'var(--serif)',
                                                fontWeight: 600,
                                                fontSize: 15,
                                                lineHeight: 1.1,
                                                maxWidth: g.body.w - 14,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {t.label}
                                        </div>
                                        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                                            {occ}/{t.capacity}
                                        </div>
                                    </div>
                                </div>

                                {/* Seat chips */}
                                {seats.map((s) => {
                                    const pos = g.seats[s.seat_index];
                                    if (!pos) return null;
                                    const occupiedSeat = s.guest !== null;
                                    const highlight = !occupiedSeat && selectedGuestId !== null;
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
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        overflow: 'hidden',
                                        transition: '0.15s ease',
                                        background: occupiedSeat ? 'var(--cream)' : '#fff',
                                        color: occupiedSeat ? 'var(--plum)' : 'var(--muted)',
                                        border: occupiedSeat
                                            ? '1px solid var(--plum)'
                                            : `1.5px dashed ${highlight ? 'var(--gold)' : 'var(--line)'}`,
                                        boxShadow: highlight ? '0 0 0 2px var(--gold-soft)' : 'none',
                                    };
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            title={s.guest ? s.guest.name : 'Kerusi kosong'}
                                            onPointerDown={stopBubble}
                                            onClick={() => void seatClick(s)}
                                            style={chipStyle}
                                        >
                                            <span
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '100%',
                                                }}
                                            >
                                                {s.guest ? firstName(s.guest.name) : '+'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Empty state (does not block panning) */}
                {data.tables.length === 0 && (
                    <div
                        className="muted"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            placeItems: 'center',
                            textAlign: 'center',
                            fontSize: 15,
                            padding: 24,
                            pointerEvents: 'none',
                            zIndex: 2,
                        }}
                    >
                        {C.emptyBoard}
                    </div>
                )}

                {/* ---- FLOATING: top toolbar ---- */}
                <div
                    data-ui
                    onPointerDown={stopBubble}
                    style={{
                        ...floatCard,
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        zIndex: 6,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 6,
                        padding: 6,
                        maxWidth: 'calc(100% - 24px)',
                    }}
                >
                    <button className="btn btn-primary btn-sm" onClick={addTable} disabled={busy}>
                        <Plus size={15} /> {C.addTable}
                    </button>
                    <button
                        className="btn btn-gold btn-sm"
                        onClick={autoSeat}
                        disabled={busy || data.tables.length === 0}
                    >
                        <Sparkles size={15} /> {C.autoAssign}
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={clearAll}
                        disabled={busy || occupied === 0}
                        style={{ color: 'var(--bad)' }}
                    >
                        <Eraser size={15} /> {C.clear}
                    </button>
                    <label
                        className="row"
                        style={{ fontSize: 12.5, fontWeight: 600, cursor: 'pointer', gap: 6, paddingLeft: 4 }}
                    >
                        <input
                            type="checkbox"
                            checked={data.auto_seat}
                            onChange={(e) => void toggleAutoAssign(e.target.checked)}
                        />
                        {C.autoAssignRsvp}
                    </label>
                    {busy && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
                </div>

                {/* ---- FLOATING: zoom controls ---- */}
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
                        title="Zum keluar"
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
                        title="Zum masuk"
                        style={{ padding: 7 }}
                        onClick={() => zoomButton(1.2)}
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        title="Muat semua meja"
                        style={{ padding: 7 }}
                        onClick={fitView}
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>

                {/* ---- FLOATING: guest-selection banner ---- */}
                {selectedGuestName && (
                    <div
                        data-ui
                        onPointerDown={stopBubble}
                        className="row spread"
                        style={{
                            ...floatCard,
                            position: 'absolute',
                            bottom: 12,
                            left: 12,
                            zIndex: 6,
                            maxWidth: 'min(360px, calc(100% - 120px))',
                            padding: '9px 12px',
                            background: 'var(--cream)',
                            border: '1px solid var(--gold-soft)',
                            color: 'var(--plum)',
                            fontSize: 13,
                            fontWeight: 600,
                            gap: 10,
                        }}
                    >
                        <span
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {C.placePrefix} {selectedGuestName}
                        </span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedGuestId(null)}>
                            <X size={13} /> {C.cancel}
                        </button>
                    </div>
                )}

                {/* ---- FLOATING: side panel (editor + unassigned) ---- */}
                {panelOpen ? (
                    <aside
                        data-ui
                        onPointerDown={stopBubble}
                        style={{
                            ...floatCard,
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            zIndex: 7,
                            width: isNarrow ? 'calc(100% - 24px)' : 300,
                            maxHeight: 'calc(100% - 76px)',
                            overflowY: 'auto',
                            background: 'rgba(255,255,255,0.97)',
                            padding: 16,
                        }}
                    >
                        {/* Selected table editor */}
                        {selTable && (
                            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
                                <div className="spread" style={{ marginBottom: 10 }}>
                                    <h3 style={{ margin: 0, fontSize: 17 }}>{C.editTable}</h3>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setSelectedTableId(null)}
                                        style={{ padding: 6 }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="field">
                                    <label>{C.tableName}</label>
                                    <input
                                        value={labelDraft}
                                        onChange={(e) => setLabelDraft(e.target.value)}
                                        onBlur={commitLabel}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                        }}
                                    />
                                </div>
                                <div className="field">
                                    <label>{C.capacity}</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={capDraft}
                                        onChange={(e) => setCapDraft(Number(e.target.value))}
                                        onBlur={commitCapacity}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                        }}
                                    />
                                </div>
                                <div className="field">
                                    <label>{C.shape}</label>
                                    <div className="row">
                                        <button
                                            className={`btn btn-sm ${selTable.shape === 'round' ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => setShape('round')}
                                        >
                                            <Circle size={14} /> {C.round}
                                        </button>
                                        <button
                                            className={`btn btn-sm ${selTable.shape === 'rect' ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => setShape('rect')}
                                        >
                                            <Square size={14} /> {C.rect}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: 'var(--bad)' }}
                                    onClick={() => void deleteTable()}
                                    disabled={busy}
                                >
                                    <Trash2 size={14} /> {C.deleteTable}
                                </button>
                            </div>
                        )}

                        {/* Unassigned guests */}
                        <div className="spread" style={{ marginBottom: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={16} /> {C.unassigned}
                            </h3>
                            <div className="row" style={{ gap: 8 }}>
                                <span className="badge">{data.unassigned.length}</span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    title="Tutup panel"
                                    onClick={() => setPanelOpen(false)}
                                    style={{ padding: 6 }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {data.unassigned.length === 0 ? (
                            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                                {C.allPlaced}
                            </p>
                        ) : (
                            <div className="stack" style={{ gap: 8 }}>
                                {data.unassigned.map((gst) => {
                                    const active = gst.id === selectedGuestId;
                                    return (
                                        <button
                                            key={gst.id}
                                            type="button"
                                            onClick={() => selectGuest(gst.id)}
                                            className="spread"
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '9px 12px',
                                                borderRadius: 10,
                                                cursor: 'pointer',
                                                border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
                                                background: active ? 'var(--cream)' : '#fff',
                                                boxShadow: active ? '0 0 0 2px var(--gold-soft)' : 'none',
                                                transition: '0.15s ease',
                                            }}
                                        >
                                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                                                {gst.name}
                                            </span>
                                            <span className="badge">&times; {gst.pax}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {data.unassigned.length > 0 && !selectedGuestId && (
                            <p className="muted" style={{ fontSize: 12, margin: '12px 0 0' }}>
                                {C.placeHint}
                            </p>
                        )}
                    </aside>
                ) : (
                    <button
                        data-ui
                        onPointerDown={stopBubble}
                        className="btn btn-primary btn-sm"
                        onClick={() => setPanelOpen(true)}
                        style={{ position: 'absolute', top: 12, right: 12, zIndex: 7, boxShadow: 'var(--shadow)' }}
                    >
                        <Users size={15} /> {C.guests} ({data.unassigned.length})
                    </button>
                )}
            </div>

            <p className="muted" style={{ fontSize: 12, margin: '10px 2px 0' }}>
                {C.hint}
            </p>
        </div>
    );
}
