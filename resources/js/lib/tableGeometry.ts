/* Table + seat geometry, shared by the owner's editable seating board and the
 * guest's read-only table view so a table looks identical in both places.
 * Pure functions of (shape, capacity) — no DOM, no state. */

export const CHIP_W = 54;
export const CHIP_H = 30;

export interface Geo {
    width: number;
    height: number;
    seats: { x: number; y: number }[];
    body: { left: number; top: number; w: number; h: number; round: boolean };
}

export function roundGeom(capacity: number): Geo {
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

export function rectGeom(capacity: number): Geo {
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

export const tableGeom = (shape: 'round' | 'rect', capacity: number): Geo =>
    shape === 'round' ? roundGeom(capacity) : rectGeom(capacity);

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;
