import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Plus, Sparkles, Eraser, Circle, Square, Trash2, X, Users } from 'lucide-react';
import { api } from '../lib/api';

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

interface DragState {
    id: string;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    curX: number;
    curY: number;
    moved: boolean;
    w: number;
    h: number;
}

interface Geo {
    width: number;
    height: number;
    seats: { x: number; y: number }[];
    body: { left: number; top: number; w: number; h: number; round: boolean };
}

/* ------------------------------------------------------------------ *
 * Geometry helpers (pure — laid out relative to each table wrapper)
 * ------------------------------------------------------------------ */
const CHIP_W = 54;
const CHIP_H = 30;
const DRAG_THRESHOLD = 4;
const BOARD_MIN_H = 520;

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
    const [data, setData] = useState<SeatingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null);

    const [labelDraft, setLabelDraft] = useState('');
    const [capDraft, setCapDraft] = useState(8);

    const boardRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);

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

    /* -------- table drag (pointer events, threshold => click vs drag) -------- */
    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>, t: Table): void {
        const g = geom(t);
        dragRef.current = {
            id: t.id,
            startX: e.clientX,
            startY: e.clientY,
            baseX: t.pos_x,
            baseY: t.pos_y,
            curX: t.pos_x,
            curY: t.pos_y,
            moved: false,
            w: g.width,
            h: g.height,
        };
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* pointer capture unsupported — drag still works */
        }
    }

    function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved) {
            if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
            d.moved = true;
        }
        let nx = d.baseX + dx;
        let ny = d.baseY + dy;
        const board = boardRef.current;
        if (board) {
            nx = clamp(nx, 0, Math.max(0, board.clientWidth - d.w));
            ny = clamp(ny, 0, Math.max(0, board.clientHeight - d.h));
        }
        d.curX = nx;
        d.curY = ny;
        setLivePos({ id: d.id, x: nx, y: ny });
    }

    function onPointerUp(e: ReactPointerEvent<HTMLDivElement>): void {
        const d = dragRef.current;
        if (!d) return;
        dragRef.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        setLivePos(null);
        if (d.moved) {
            void run(() =>
                api.put(`/tables/${d.id}`, { pos_x: Math.round(d.curX), pos_y: Math.round(d.curY) }),
            );
        } else {
            // A click that never moved => select the table for editing.
            setSelectedGuestId(null);
            setSelectedTableId(d.id);
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
        if (!window.confirm('Kosongkan semua tempat duduk? Tindakan ini tidak boleh dibatalkan.')) return;
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
        if (!window.confirm(`Padam "${selTable.label}"?`)) return;
        const ok = await run(() => api.delete(`/tables/${selTable.id}`));
        if (ok) setSelectedTableId(null);
    }

    /* -------- render -------- */
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
                <p className="form-err">{error ?? 'Gagal memuatkan susun atur.'}</p>
                <button className="btn btn-ghost btn-sm" onClick={() => void load()}>
                    Cuba lagi
                </button>
            </div>
        );
    }

    const allSeats = data.tables.flatMap((t) => t.seats);
    const total = allSeats.length;
    const occupied = allSeats.filter((s) => s.guest !== null).length;
    const free = total - occupied;
    const selectedGuestName = data.unassigned.find((g) => g.id === selectedGuestId)?.name ?? null;

    return (
        <div>
            <div className="spread wrap" style={{ marginBottom: 14 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 24 }}>Susun Atur Tempat Duduk</h2>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
                        {total} kerusi · {occupied} berisi · {free} kosong
                    </p>
                </div>
                <label className="row" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={data.auto_seat}
                        onChange={(e) => void toggleAutoAssign(e.target.checked)}
                    />
                    Auto-agih semasa RSVP
                </label>
            </div>

            {/* Toolbar */}
            <div className="row wrap" style={{ marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={addTable} disabled={busy}>
                    <Plus size={15} /> Tambah Meja
                </button>
                <button className="btn btn-gold btn-sm" onClick={autoSeat} disabled={busy || data.tables.length === 0}>
                    <Sparkles size={15} /> Auto-agih
                </button>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={clearAll}
                    disabled={busy || occupied === 0}
                    style={{ color: 'var(--bad)' }}
                >
                    <Eraser size={15} /> Kosongkan
                </button>
                {busy && <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
            </div>

            {error && (
                <p className="form-err" style={{ marginBottom: 12 }}>
                    {error}
                </p>
            )}

            {selectedGuestName && (
                <div
                    className="row spread"
                    style={{
                        marginBottom: 12,
                        padding: '9px 14px',
                        borderRadius: 12,
                        background: 'var(--cream)',
                        border: '1px solid var(--gold-soft)',
                        color: 'var(--plum)',
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    <span>Klik kerusi kosong untuk letak {selectedGuestName}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedGuestId(null)}>
                        <X size={13} /> Batal
                    </button>
                </div>
            )}

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr) 300px', alignItems: 'start' }}>
                {/* ---------------- LEFT: board ---------------- */}
                <div
                    ref={boardRef}
                    style={{
                        position: 'relative',
                        minHeight: BOARD_MIN_H,
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius)',
                        overflow: 'auto',
                        background: '#fff',
                        backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)',
                        backgroundSize: '22px 22px',
                    }}
                >
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
                            }}
                        >
                            Belum ada meja. Klik &lsquo;Tambah Meja&rsquo;.
                        </div>
                    )}

                    {data.tables.map((t) => {
                        const g = geom(t);
                        const live = livePos && livePos.id === t.id ? livePos : null;
                        const x = live ? live.x : t.pos_x;
                        const y = live ? live.y : t.pos_y;
                        const isSelected = t.id === selectedTableId;
                        const occ = t.seats.filter((s) => s.guest !== null).length;
                        const seats = [...t.seats].sort((a, b) => a.seat_index - b.seat_index);

                        return (
                            <div key={t.id} style={{ position: 'absolute', left: x, top: y, width: g.width, height: g.height }}>
                                {/* Table body — the draggable / selectable surface */}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    title="Seret untuk alih · klik untuk sunting"
                                    onPointerDown={(e) => onPointerDown(e, t)}
                                    onPointerMove={onPointerMove}
                                    onPointerUp={onPointerUp}
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

                {/* ---------------- RIGHT: editor + unassigned ---------------- */}
                <div>
                    {selTable && (
                        <div className="panel" style={{ marginBottom: 14, padding: 18 }}>
                            <div className="spread" style={{ marginBottom: 10 }}>
                                <h3 style={{ margin: 0, fontSize: 18 }}>Sunting Meja</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTableId(null)}>
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="field">
                                <label>Nama meja</label>
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
                                <label>Muatan (kerusi)</label>
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
                                <label>Bentuk</label>
                                <div className="row">
                                    <button
                                        className={`btn btn-sm ${selTable.shape === 'round' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setShape('round')}
                                    >
                                        <Circle size={14} /> Bulat
                                    </button>
                                    <button
                                        className={`btn btn-sm ${selTable.shape === 'rect' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setShape('rect')}
                                    >
                                        <Square size={14} /> Segi Empat
                                    </button>
                                </div>
                            </div>
                            <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--bad)' }}
                                onClick={() => void deleteTable()}
                                disabled={busy}
                            >
                                <Trash2 size={14} /> Padam Meja
                            </button>
                        </div>
                    )}

                    <div className="panel" style={{ padding: 18 }}>
                        <div className="spread" style={{ marginBottom: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={17} /> Tetamu Belum Diletak
                            </h3>
                            <span className="badge">{data.unassigned.length}</span>
                        </div>

                        {data.unassigned.length === 0 ? (
                            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                                Semua tetamu yang hadir telah diletak.
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
                                Klik seorang tetamu, kemudian klik kerusi kosong untuk meletakkannya.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
