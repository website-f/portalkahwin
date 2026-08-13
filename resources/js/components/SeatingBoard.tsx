import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
    MailCheck,
    Download,
    ZoomIn,
    ZoomOut,
    Maximize2, LayoutGrid, Save, Wrench, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api';
import { downloadFile } from '../lib/download';
import { CHIP_W, CHIP_H, firstName, tableGeom } from '../lib/tableGeometry';
import type { Geo } from '../lib/tableGeometry';
import { useLang, dict } from '../context/LangContext';
import { useDialog } from '../context/DialogContext';

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
/**
 * A fixture on the floorplan that is not a guest table — the pelamin, the
 * entrance, the buffet. Props give the plan a room to sit in, so the host can
 * see the hall rather than tables floating in space.
 */
interface Prop {
    id: string;
    kind: PropKind;
    label: string;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
}
interface SeatingData {
    auto_seat: boolean;
    seat_names_private: boolean;
    tables: Table[];
    props: Prop[];
    unassigned: Guest[];
}

/** Mirrors VenueProp::KINDS on the server. */
const PROP_KINDS = [
    'stage', 'entrance', 'reception', 'catering', 'gift', 'vendor_booth',
    'photo', 'dancefloor', 'vip', 'restroom', 'walkway', 'parking',
] as const;
type PropKind = (typeof PROP_KINDS)[number];

/** Each fixture gets its own colour so the hall reads at a glance. */
const PROP_STYLE: Record<PropKind, { bg: string; ink: string }> = {
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
          /** Tables and props share the drag machinery; only the commit differs. */
          nodeKind: 'table' | 'prop';
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
const DRAG_THRESHOLD = 4;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const GRID = 26; // world-unit spacing of the dotted grid

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

const geom = (t: Table): Geo => tableGeom(t.shape, t.capacity);

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

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export function SeatingBoard({ invitationId }: { invitationId: string }) {
    const { lang } = useLang();
    const dialog = useDialog();
    const [data, setData] = useState<SeatingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Transient confirmation that seated guests were emailed their table.
    const [notice, setNotice] = useState<string | null>(null);

    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null);

    const [labelDraft, setLabelDraft] = useState('');
    const [capDraft, setCapDraft] = useState(8);

    // Camera + UI chrome.
    const [view, setView] = useState<View>({ zoom: 1, panX: 40, panY: 40 });
    const [panelOpen, setPanelOpen] = useState(true);
    const [propMenuOpen, setPropMenuOpen] = useState(false);
    // On a phone the canvas is the scarce resource, so the tools live in a
    // sheet that opens on demand instead of a bar permanently over the plan.
    const [toolsOpen, setToolsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Save mode. Autosave is right for a quick tweak; a host rearranging a whole
    // hall wants to move twenty things and commit once, without a write per drag.
    const [autoSave, setAutoSave] = useState<boolean>(() => {
        try { return localStorage.getItem('pk_seating_autosave') !== '0'; } catch { return true; }
    });
    // Staged positions while in manual mode: id -> world coords.
    const [pending, setPending] = useState<Map<string, { kind: 'table' | 'prop'; x: number; y: number }>>(new Map());
    const [isNarrow, setIsNarrow] = useState(false);

    const frameRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<ActiveDrag | null>(null);
    const didFit = useRef(false);
    // Live-drag plumbing: the DOM nodes we transform directly (keyed by table id),
    // the body element under the pointer, and the pending rAF handle. A table drag
    // moves only its own node from a rAF — it never triggers a per-frame re-render.
    const tableNodes = useRef<Map<string, HTMLDivElement>>(new Map());
    const dragBodyRef = useRef<HTMLDivElement | null>(null);
    const dragRafRef = useRef<number | null>(null);

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

    // Drop the optimistic drop position once the refetch echoes it back — the
    // positions are identical so this clears livePos without any visual change.
    useEffect(() => {
        if (!livePos) return;
        const t = data?.tables.find((x) => x.id === livePos.id);
        if (t && t.pos_x === livePos.x && t.pos_y === livePos.y) setLivePos(null);
    }, [data, livePos]);

    // Cancel any in-flight drag frame if the board unmounts mid-gesture.
    useEffect(
        () => () => {
            if (dragRafRef.current !== null) cancelAnimationFrame(dragRafRef.current);
        },
        [],
    );

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
    const C = dict({
        bm: {
            heading: 'Susun Atur Tempat Duduk',
            seats: 'kerusi', filled: 'terisi', empty: 'kosong',
            loadFailed: 'Susun atur belum berjaya dimuatkan.', tryAgain: 'Cuba lagi',
            emptyBoard: 'Belum ada meja. Mulakan dengan “Tambah Meja”.',
            exportPlan: 'Muat Turun Pelan',
            addTable: 'Tambah Meja', autoAssign: 'Susun Automatik', clear: 'Kosongkan', autoAssignRsvp: 'Susun automatik selepas RSVP',
            addProp: 'Tambah Prop', removeProp: 'Buang prop',
            tools: 'Alat', settings: 'Tetapan',
            autoSaveHint: 'Jika dimatikan, perubahan kedudukan disimpan hanya bila anda tekan Simpan Perubahan.',
            deletePropConfirm: (label: string) => `Buang "${label}" dari pelan?`,
            prop: {
                stage: 'Pelamin', entrance: 'Pintu Masuk', reception: 'Meja Pendaftaran', catering: 'Meja Katering',
                gift: 'Kaunter Salam Kaut', vendor_booth: 'Booth Vendor', photo: 'Photo Booth', dancefloor: 'Ruang Tarian',
                vip: 'Meja VIP', restroom: 'Tandas', walkway: 'Laluan', parking: 'Tempat Letak Kereta',
            } as Record<PropKind, string>,
            autoSave: 'Simpan automatik', saved: 'Semua disimpan',
            saveChangesN: (n: number) => `Simpan Perubahan (${n})`,
            privateNames: 'Sembunyikan nama tetamu lain',
            privateNamesHint: 'Jika hidup, tetamu hanya nampak nama mereka sendiri dalam paparan susun atur meja.',
            placePrefix: 'Pilih kerusi kosong untuk tempatkan', cancel: 'Batal',
            editTable: 'Sunting Meja', tableName: 'Nama meja', capacity: 'Bilangan kerusi', shape: 'Bentuk',
            round: 'Bulat', rect: 'Segi empat', deleteTable: 'Padam Meja',
            unassigned: 'Belum Ditempatkan', allPlaced: 'Semua tetamu yang hadir telah ditempatkan.',
            placeHint: 'Pilih nama tetamu, kemudian pilih kerusi kosong untuk menempatkannya.',
            guests: 'Tetamu',
            notified: (n: number) => `${n} tetamu dimaklumkan melalui e-mel.`,
            hint: 'Skrol untuk zum · seret ruang kosong untuk bergerak · seret meja untuk alihkan.',
            tableTip: 'Seret untuk alih · klik untuk sunting', emptySeat: 'Kerusi kosong',
            wontFit: (n: number) => `Meja ini tidak cukup kerusi kosong untuk ${n} pax`,
            zoomOut: 'Zum keluar', zoomIn: 'Zum masuk', fitAll: 'Muat semua meja', closePanel: 'Tutup panel',
            clearConfirm: 'Kosongkan semua tempat duduk? Tindakan ini tidak boleh diundur.',
            deleteConfirm: (label: string) => `Padam "${label}"?`,
        },
        en: {
            heading: 'Seating Arrangement',
            seats: 'seats', filled: 'filled', empty: 'empty',
            loadFailed: 'Failed to load layout.', tryAgain: 'Try again',
            emptyBoard: 'No tables yet. Click ‘Add table’.',
            exportPlan: 'Download plan',
            addTable: 'Add table', autoAssign: 'Auto-assign', clear: 'Clear', autoAssignRsvp: 'Auto-assign on RSVP',
            addProp: 'Add fixture', removeProp: 'Remove fixture',
            tools: 'Tools', settings: 'Settings',
            autoSaveHint: 'When off, moves are kept until you press Save changes.',
            deletePropConfirm: (label: string) => `Remove "${label}" from the plan?`,
            prop: {
                stage: 'Stage / Pelamin', entrance: 'Entrance', reception: 'Reception desk', catering: 'Catering table',
                gift: 'Gift counter', vendor_booth: 'Vendor booth', photo: 'Photo booth', dancefloor: 'Dance floor',
                vip: 'VIP table', restroom: 'Restroom', walkway: 'Walkway', parking: 'Parking',
            } as Record<PropKind, string>,
            autoSave: 'Autosave', saved: 'All saved',
            saveChangesN: (n: number) => `Save changes (${n})`,
            privateNames: 'Hide other guests\u2019 names',
            privateNamesHint: 'When on, a guest only sees their own name in the seating view.',
            placePrefix: 'Click an empty seat to place', cancel: 'Cancel',
            editTable: 'Edit table', tableName: 'Table name', capacity: 'Capacity (seats)', shape: 'Shape',
            round: 'Round', rect: 'Rectangle', deleteTable: 'Delete table',
            unassigned: 'Unassigned', allPlaced: 'All attending guests have been placed.',
            placeHint: 'Click a guest, then click an empty seat to place them.',
            guests: 'Guests',
            notified: (n: number) => `${n} guest${n === 1 ? '' : 's'} emailed their table.`,
            hint: 'Scroll to zoom · drag empty space to pan · drag a table to move.',
            tableTip: 'Drag to move · click to edit', emptySeat: 'Empty seat',
            wontFit: (n: number) => `Not enough free seats at this table for ${n} pax`,
            zoomOut: 'Zoom out', zoomIn: 'Zoom in', fitAll: 'Fit all tables', closePanel: 'Close panel',
            clearConfirm: 'Clear all seats? This action cannot be undone.',
            deleteConfirm: (label: string) => `Delete "${label}"?`,
        },
        zh: {
            heading: '座位安排',
            seats: '个座位', filled: '已占用', empty: '空余',
            loadFailed: '座位表加载失败。', tryAgain: '重试',
            emptyBoard: '尚无餐桌。请点击「添加餐桌」。',
            exportPlan: '下载座位表',
            addTable: '添加餐桌', autoAssign: '自动排位', clear: '清空', autoAssignRsvp: '回复出席后自动排位',
            addProp: '添加设施', removeProp: '移除设施',
            tools: '工具', settings: '设置',
            autoSaveHint: '关闭后，位置变更需要点击保存更改才会写入。',
            deletePropConfirm: (label: string) => `从平面图移除“${label}”？`,
            prop: {
                stage: '舞台', entrance: '入口', reception: '接待台', catering: '自助餐台',
                gift: '祀金台', vendor_booth: '商家展位', photo: '拍照区', dancefloor: '舞池',
                vip: '贵宾桌', restroom: '洗手间', walkway: '通道', parking: '停车场',
            } as Record<PropKind, string>,
            autoSave: '自动保存', saved: '已全部保存',
            saveChangesN: (n: number) => `保存更改（${n}）`,
            privateNames: '隐藏其他宾客姓名',
            privateNamesHint: '开启后，宾客在座位图中只能看到自己的姓名。',
            placePrefix: '点击空位安排', cancel: '取消',
            editTable: '编辑餐桌', tableName: '餐桌名称', capacity: '座位数', shape: '形状',
            round: '圆桌', rect: '方桌', deleteTable: '删除餐桌',
            unassigned: '未安排', allPlaced: '所有出席宾客均已安排座位。',
            placeHint: '先点击宾客姓名，再点击空位即可安排。',
            guests: '宾客',
            notified: (n: number) => `已向 ${n} 位宾客发送座位通知邮件。`,
            hint: '滚动缩放 · 拖动空白处平移 · 拖动餐桌可移动位置。',
            tableTip: '拖动移动 · 点击编辑', emptySeat: '空位',
            wontFit: (n: number) => `此桌空位不足，无法安排 ${n} 人`,
            zoomOut: '缩小', zoomIn: '放大', fitAll: '显示全部餐桌', closePanel: '关闭面板',
            clearConfirm: '确定清空所有座位？此操作无法撤销。',
            deleteConfirm: (label: string) => `确定删除「${label}」？`,
        },
    }, lang);

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
        setNotice(null);
        const ok = await run(async () => {
            const r = await api.post<{ notified?: boolean }>(`/seats/${seat.id}/assign`, {
                rsvp_guest_id: selectedGuestId,
            });
            if (r.data.notified) setNotice(C.notified(1));
        });
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
        // Remember the body element so we can flip its cursor to "grabbing" during
        // the drag without re-rendering.
        dragBodyRef.current = e.currentTarget;
        dragRef.current = {
            mode: 'table',
            nodeKind: 'table',
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

    /** Props drag through the same path as tables — only the commit differs. */
    function onPropPointerDown(e: ReactPointerEvent<HTMLDivElement>, p: Prop): void {
        e.stopPropagation();
        dragBodyRef.current = e.currentTarget;
        dragRef.current = {
            mode: 'table',
            nodeKind: 'prop',
            startX: e.clientX,
            startY: e.clientY,
            tableId: p.id,
            baseX: p.pos_x,
            baseY: p.pos_y,
            curX: p.pos_x,
            curY: p.pos_y,
            moved: false,
        };
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
            // Promote the dragged table for compositing + switch its cursor, once,
            // the moment the gesture actually becomes a drag.
            if (d.mode === 'table') {
                const node = tableNodes.current.get(d.tableId);
                if (node) node.style.willChange = 'transform';
                if (dragBodyRef.current) dragBodyRef.current.style.cursor = 'grabbing';
            }
        }
        if (d.mode === 'pan') {
            setView((v) => ({ ...v, panX: d.basePanX + dx, panY: d.basePanY + dy }));
        } else {
            // Screen delta → world delta by dividing out the zoom. We only stash the
            // live position on the ref here (no setState); the DOM is moved from a
            // rAF, so dragging repaints just this one node instead of the whole board.
            d.curX = d.baseX + dx / view.zoom;
            d.curY = d.baseY + dy / view.zoom;
            if (dragRafRef.current === null) {
                dragRafRef.current = requestAnimationFrame(() => {
                    dragRafRef.current = null;
                    const cur = dragRef.current;
                    if (!cur || cur.mode !== 'table') return;
                    const node = tableNodes.current.get(cur.tableId);
                    // Pure write, no layout read: the wrapper's left/top stay at the
                    // base world coords and this translate (world units, since the
                    // node lives inside the scaled world layer) carries the drag.
                    if (node) {
                        node.style.transform = `translate(${cur.curX - cur.baseX}px, ${cur.curY - cur.baseY}px)`;
                    }
                });
            }
        }
    }

    function onFramePointerUp(e: ReactPointerEvent<HTMLDivElement>): void {
        const d = dragRef.current;
        if (!d) return;
        dragRef.current = null;
        dragBodyRef.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        // Drop any pending drag frame so it can't paint after we've committed.
        if (dragRafRef.current !== null) {
            cancelAnimationFrame(dragRafRef.current);
            dragRafRef.current = null;
        }
        if (d.mode === 'pan') {
            // A click on empty space (no drag) clears the table selection.
            if (!d.moved) setSelectedTableId(null);
            return;
        }
        const node = tableNodes.current.get(d.tableId);
        if (d.moved) {
            const finalX = Math.round(d.curX);
            const finalY = Math.round(d.curY);
            // Commit with no jump: in one synchronous paint, pin the node to its
            // dropped world coords via left/top and drop the transient transform +
            // will-change. Then mirror the same coords into React state so the very
            // next render already agrees; the refetch effect clears livePos once the
            // server echoes back the identical position.
            if (node) {
                node.style.left = `${finalX}px`;
                node.style.top = `${finalY}px`;
                node.style.transform = '';
                node.style.willChange = '';
            }
            setLivePos({ id: d.tableId, x: finalX, y: finalY });
            const path = d.nodeKind === 'prop' ? `/props/${d.tableId}` : `/tables/${d.tableId}`;
            if (autoSave) {
                void run(() => api.put(path, { pos_x: finalX, pos_y: finalY }));
            } else {
                // Stage it: the node already sits at its dropped coords, so the
                // board is correct on screen and only the server is behind.
                setPending((m) => new Map(m).set(d.tableId, { kind: d.nodeKind, x: finalX, y: finalY }));
            }
        } else {
            if (node) {
                node.style.transform = '';
                node.style.willChange = '';
            }
            // A click that never moved => select the table for editing. Props
            // have nothing to edit in the panel, so they are only ever dragged.
            if (d.nodeKind === 'table') {
                setSelectedGuestId(null);
                setSelectedTableId(d.tableId);
                setPanelOpen(true);
            }
        }
    }

    /** Flush every staged move. One request each, but only on the host's word. */
    async function saveChanges(): Promise<void> {
        const moves = [...pending.entries()];
        if (moves.length === 0) return;
        const ok = await run(async () => {
            await Promise.all(moves.map(([id, m]) =>
                api.put(m.kind === 'prop' ? `/props/${id}` : `/tables/${id}`, { pos_x: m.x, pos_y: m.y }),
            ));
        });
        if (ok) setPending(new Map());
    }

    function setSaveMode(auto: boolean): void {
        setAutoSave(auto);
        try { localStorage.setItem('pk_seating_autosave', auto ? '1' : '0'); } catch { /* private mode */ }
        // Switching back to autosave must not silently drop staged work.
        if (auto && pending.size > 0) void saveChanges();
    }

    function addProp(kind: PropKind): void {
        setPropMenuOpen(false);
        void run(() => api.post(`/invitations/${invitationId}/props`, { kind }));
    }

    async function removeProp(p: Prop): Promise<void> {
        if (!(await dialog.confirm({ message: C.deletePropConfirm(p.label), danger: true }))) return;
        void run(() => api.delete(`/props/${p.id}`));
    }

    async function togglePrivacy(v: boolean): Promise<void> {
        void run(() => api.put(`/invitations/${invitationId}/seating/privacy`, { seat_names_private: v }));
    }

    async function exportPlan(): Promise<void> {
        try {
            await downloadFile(`/invitations/${invitationId}/seating/export`, 'susun-meja.csv');
        } catch (e) {
            setError(errMsg(e));
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
        setNotice(null);
        void run(async () => {
            const r = await api.post<{ notified?: number }>(`/invitations/${invitationId}/seating/auto`);
            if (r.data.notified) setNotice(C.notified(r.data.notified));
        });
    }

    async function clearAll(): Promise<void> {
        if (!(await dialog.confirm({ message: C.clearConfirm, danger: true }))) return;
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
        if (!(await dialog.confirm({ message: C.deleteConfirm(selTable.label), danger: true }))) return;
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
    const selectedGuest = data.unassigned.find((g) => g.id === selectedGuestId) ?? null;
    const selectedGuestName = selectedGuest?.name ?? null;
    // A whole party must sit at ONE table: a table with fewer free seats than the
    // selected guest's pax can't take them, so its empty seats are disabled.
    const selectedPax = selectedGuest ? Math.max(1, selectedGuest.pax) : 0;

    // Dotted grid that scales with zoom + rides the pan, so it reads like a CAD/n8n canvas.
    const dot = GRID * view.zoom;
    // Height of the mobile bottom-sheet side panel; other floating chrome docks above it.
    const sheetH = '58%';

    /** One row per switch, so the settings sheet reads the same on any screen. */
    const settingRows: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }[] = [
        { label: C.autoAssignRsvp, on: data.auto_seat, onChange: (v) => void toggleAutoAssign(v) },
        { label: C.privateNames, hint: C.privateNamesHint, on: data.seat_names_private, onChange: (v) => void togglePrivacy(v) },
        { label: C.autoSave, hint: C.autoSaveHint, on: autoSave, onChange: setSaveMode },
    ];
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

    /* The board actions, shared by the desktop bar and the phone sheet — one
       definition so the two can never drift apart. */
    const actionButtons = (
        <>
            <button className="btn btn-primary btn-sm" onClick={addTable} disabled={busy}>
                <Plus size={15} /> {C.addTable}
            </button>
            <div style={{ position: 'relative' }}>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPropMenuOpen((v) => !v)}
                    disabled={busy}
                    aria-haspopup="menu"
                    aria-expanded={propMenuOpen}
                    style={{ width: '100%' }}
                >
                    <LayoutGrid size={15} /> {C.addProp}
                </button>
                {propMenuOpen && (
                    <div
                        role="menu"
                        style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20,
                            background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
                            boxShadow: 'var(--shadow)', padding: 6, minWidth: 190,
                            maxHeight: 260, overflowY: 'auto',
                        }}
                    >
                        {PROP_KINDS.map((k) => (
                            <button
                                key={k}
                                role="menuitem"
                                className="btn btn-ghost btn-sm btn-block"
                                style={{ justifyContent: 'flex-start' }}
                                onClick={() => addProp(k)}
                            >
                                <span style={{
                                    width: 10, height: 10, borderRadius: 3, flex: 'none',
                                    background: PROP_STYLE[k].ink, marginRight: 8,
                                }} />
                                {C.prop[k]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button className="btn btn-gold btn-sm" onClick={autoSeat} disabled={busy || data.tables.length === 0}>
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
            {/* A canvas is unusable on the day — banquet staff need a list. */}
            <button className="btn btn-ghost btn-sm" onClick={() => void exportPlan()} disabled={busy || data.tables.length === 0}>
                <Download size={15} /> {C.exportPlan}
            </button>
        </>
    );

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

            {notice && (
                <p
                    style={{
                        marginBottom: 12,
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ok)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                    }}
                >
                    <MailCheck size={15} /> {notice}
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
                    {/* Props render first so they sit behind the tables. */}
                    {data.props.map((p) => {
                        const live = livePos && livePos.id === p.id ? livePos : null;
                        const st = PROP_STYLE[p.kind] ?? PROP_STYLE.walkway;
                        return (
                            <div
                                key={p.id}
                                ref={(el) => { if (el) tableNodes.current.set(p.id, el); else tableNodes.current.delete(p.id); }}
                                style={{
                                    position: 'absolute',
                                    left: live ? live.x : p.pos_x,
                                    top: live ? live.y : p.pos_y,
                                    width: p.width,
                                    height: p.height,
                                    zIndex: 1,
                                }}
                            >
                                <div
                                    onPointerDown={(e) => onPropPointerDown(e, p)}
                                    title={p.label}
                                    style={{
                                        width: '100%',
                                        height: '100%',
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
                                        cursor: 'grab',
                                        userSelect: 'none',
                                        touchAction: 'none',
                                    }}
                                >
                                    {p.label}
                                </div>
                                <button
                                    type="button"
                                    aria-label={`${C.removeProp}: ${p.label}`}
                                    onPointerDown={stopBubble}
                                    onClick={() => void removeProp(p)}
                                    style={{
                                        position: 'absolute', top: -9, right: -9,
                                        width: 22, height: 22, borderRadius: '50%',
                                        border: `1px solid ${st.ink}`, background: '#fff', color: st.ink,
                                        display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0,
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}

                    {data.tables.map((t) => {
                        const g = geom(t);
                        const live = livePos && livePos.id === t.id ? livePos : null;
                        const x = live ? live.x : t.pos_x;
                        const y = live ? live.y : t.pos_y;
                        const isSelected = t.id === selectedTableId;
                        const occ = t.seats.filter((s) => s.guest !== null).length;
                        const tableFree = t.seats.length - occ;
                        // While a party is selected, a table that can't seat the WHOLE
                        // party is greyed out and its empty seats are not selectable.
                        const tableFits = selectedPax === 0 || tableFree >= selectedPax;
                        const dimTable = selectedPax > 0 && !tableFits;
                        const seats = [...t.seats].sort((a, b) => a.seat_index - b.seat_index);

                        return (
                            <div
                                key={t.id}
                                ref={(el) => {
                                    if (el) tableNodes.current.set(t.id, el);
                                    else tableNodes.current.delete(t.id);
                                }}
                                style={{ position: 'absolute', left: x, top: y, width: g.width, height: g.height }}
                            >
                                {/* Table body — the draggable / selectable surface */}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    title={dimTable ? C.wontFit(selectedPax) : C.tableTip}
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
                                        opacity: dimTable ? 0.5 : 1,
                                        cursor: live ? 'grabbing' : 'grab',
                                        touchAction: 'none',
                                        userSelect: 'none',
                                        transition: 'background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
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
                                    const selecting = selectedGuestId !== null;
                                    // Empty seat on a table that can't fit the whole party → blocked.
                                    const blocked = !occupiedSeat && selecting && !tableFits;
                                    const highlight = !occupiedSeat && selecting && tableFits;
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
                                        cursor: blocked ? 'not-allowed' : 'pointer',
                                        userSelect: 'none',
                                        overflow: 'hidden',
                                        transition: '0.15s ease',
                                        opacity: blocked ? 0.4 : 1,
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
                                            aria-disabled={blocked}
                                            title={blocked ? C.wontFit(selectedPax) : s.guest ? s.guest.name : C.emptySeat}
                                            onPointerDown={stopBubble}
                                            onClick={() => { if (!blocked) void seatClick(s); }}
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

                {/* ---- Tools: a bar on desktop, a sheet on a phone ---- */}
                {isNarrow ? (
                    <button
                        data-ui
                        onPointerDown={stopBubble}
                        className="btn btn-primary btn-sm"
                        onClick={() => setToolsOpen(true)}
                        style={{ position: 'absolute', top: 12, left: 12, zIndex: 8, boxShadow: 'var(--shadow)' }}
                    >
                        <Wrench size={15} /> {C.tools}
                        {!autoSave && pending.size > 0 && (
                            <span className="badge badge-gold" style={{ marginLeft: 6, fontSize: 10 }}>{pending.size}</span>
                        )}
                    </button>
                ) : (
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
                            // Stop short of the Guests button parked top-right,
                            // instead of sliding underneath it.
                            maxWidth: 'calc(100% - 220px)',
                        }}
                    >
                        {actionButtons}
                        <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(true)} title={C.settings}>
                            <SlidersHorizontal size={15} /> {C.settings}
                        </button>
                        {!autoSave && (
                            <button
                                className={`btn btn-sm ${pending.size > 0 ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => void saveChanges()}
                                disabled={busy || pending.size === 0}
                            >
                                <Save size={15} /> {pending.size > 0 ? C.saveChangesN(pending.size) : C.saved}
                            </button>
                        )}
                        {busy && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
                    </div>
                )}

                {/* ---- FLOATING: zoom controls ---- */}
                <div
                    data-ui
                    onPointerDown={stopBubble}
                    style={{
                        ...floatCard,
                        position: 'absolute',
                        bottom: isNarrow && panelOpen ? `calc(${sheetH} + 12px)` : 12,
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

                {/* ---- FLOATING: guest-selection banner ---- */}
                {selectedGuestName && (
                    <div
                        data-ui
                        onPointerDown={stopBubble}
                        className="row spread"
                        style={{
                            ...floatCard,
                            position: 'absolute',
                            bottom: isNarrow ? (panelOpen ? `calc(${sheetH} + 12px)` : 64) : 12,
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
                            {C.placePrefix} {selectedGuestName} <span style={{ opacity: 0.8 }}>&times;{selectedPax}</span>
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
                            ...(isNarrow
                                ? {
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      width: '100%',
                                      maxWidth: '100%',
                                      height: sheetH,
                                      maxHeight: sheetH,
                                      borderRadius: '16px 16px 0 0',
                                  }
                                : {
                                      top: 12,
                                      right: 12,
                                      width: 300,
                                      maxHeight: 'calc(100% - 76px)',
                                  }),
                            zIndex: 7,
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
                                    title={C.closePanel}
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
                        style={{
                            position: 'absolute',
                            ...(isNarrow ? { bottom: 12, left: 12 } : { top: 12, right: 12 }),
                            zIndex: 7,
                            boxShadow: 'var(--shadow)',
                        }}
                    >
                        <Users size={15} /> {C.guests} ({data.unassigned.length})
                    </button>
                )}
            </div>

            {/* Tools sheet (phone) — the actions, out of the way until wanted. */}
            {toolsOpen && (
                <SeatingSheet title={C.tools} onClose={() => setToolsOpen(false)}>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {actionButtons}
                        <button className="btn btn-ghost btn-sm" onClick={() => { setToolsOpen(false); setSettingsOpen(true); }}>
                            <SlidersHorizontal size={15} /> {C.settings}
                        </button>
                        {!autoSave && (
                            <button
                                className={`btn btn-sm ${pending.size > 0 ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => void saveChanges()}
                                disabled={busy || pending.size === 0}
                            >
                                <Save size={15} /> {pending.size > 0 ? C.saveChangesN(pending.size) : C.saved}
                            </button>
                        )}
                    </div>
                </SeatingSheet>
            )}

            {/* Settings — switches, not stray checkboxes wrapping in a toolbar. */}
            {settingsOpen && (
                <SeatingSheet title={C.settings} onClose={() => setSettingsOpen(false)}>
                    <div className="sb-toggles">
                        {settingRows.map((r) => (
                            <div className="sb-toggle-row" key={r.label}>
                                <div style={{ minWidth: 0 }}>
                                    <div className="sb-toggle-label">{r.label}</div>
                                    {r.hint && <div className="sb-toggle-hint">{r.hint}</div>}
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={r.on}
                                    aria-label={r.label}
                                    className={`sb-switch${r.on ? ' on' : ''}`}
                                    onClick={() => r.onChange(!r.on)}
                                >
                                    <span className="sb-knob" />
                                </button>
                            </div>
                        ))}
                    </div>
                </SeatingSheet>
            )}

            <p className="muted" style={{ fontSize: 12, margin: '10px 2px 0' }}>
                {C.hint}
            </p>
        </div>
    );
}

/**
 * Modal sheet used by the board's tools and settings: centred on a desktop,
 * bottom-anchored on a phone. Deliberately not the editor's EditorSheet — this
 * one has to sit above a full-bleed canvas and its own floating controls.
 */
function SeatingSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="sb-sheet-root" role="dialog" aria-modal="true" aria-label={title}>
            <style>{SB_SHEET_CSS}</style>
            <div className="sb-sheet-backdrop" onClick={onClose} />
            <div className="sb-sheet">
                <header className="sb-sheet-head">
                    <h3>{title}</h3>
                    <button className="sb-sheet-close" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
                </header>
                <div className="sb-sheet-body">{children}</div>
            </div>
        </div>
    );
}

const SB_SHEET_CSS = `
.sb-sheet-root { position: fixed; inset: 0; z-index: 140; }
.sb-sheet-backdrop {
    position: absolute; inset: 0; background: rgba(30, 26, 51, 0.42);
    -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
}
.sb-sheet {
    position: absolute; left: 50%; transform: translateX(-50%);
    width: min(460px, calc(100% - 24px));
    display: flex; flex-direction: column; max-height: 86vh;
    background: #fff; border: 1px solid var(--line); border-radius: 18px;
    box-shadow: 0 30px 70px -24px rgba(30, 26, 51, 0.5);
    top: 50%; margin-top: -1px; translate: 0 -50%;
}
/* Bottom-anchored on a phone: reachable with a thumb, and it never covers the
   whole plan the way a centred dialog would. */
@media (max-width: 860px) {
    .sb-sheet {
        left: 0; right: 0; bottom: 0; top: auto; width: 100%; transform: none; translate: none;
        margin: 0; max-height: 76vh; border-radius: 18px 18px 0 0;
        padding-bottom: env(safe-area-inset-bottom, 0px);
    }
}
.sb-sheet-head {
    flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 15px 18px; border-bottom: 1px solid var(--line);
}
.sb-sheet-head h3 { margin: 0; font-size: 17px; color: var(--plum); }
.sb-sheet-close {
    flex: none; width: 32px; height: 32px; border: 0; border-radius: 50%; cursor: pointer;
    display: grid; place-items: center; background: var(--cream); color: var(--plum);
}
.sb-sheet-body { overflow-y: auto; padding: 16px 18px 20px; }

.sb-toggles { display: flex; flex-direction: column; }
.sb-toggle-row {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 13px 0; border-bottom: 1px solid var(--line);
}
.sb-toggle-row:last-child { border-bottom: 0; }
.sb-toggle-label { font-size: 14.5px; font-weight: 600; color: var(--ink); }
.sb-toggle-hint { font-size: 12.5px; color: var(--muted); margin-top: 3px; line-height: 1.45; }
.sb-switch {
    flex: 0 0 auto; position: relative; width: 46px; height: 28px; border-radius: 999px;
    border: 0; cursor: pointer; background: #d8d5ea; transition: background .18s ease; padding: 0;
}
.sb-switch.on { background: var(--plum); }
.sb-knob {
    position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%;
    background: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25); transition: transform .18s ease;
}
.sb-switch.on .sb-knob { transform: translateX(18px); }
`;
