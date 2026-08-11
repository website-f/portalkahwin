// ============================================================
// Calendar helpers for the public wedding card action bar.
// Runs in the browser only (uses TextEncoder / btoa), so
// `new Date(startIso)` is fine — no clock reads without args.
// ============================================================

export interface CalendarEvent {
    title: string;
    startIso?: string;
    /** Optional explicit end; defaults to start + 4h. */
    endIso?: string;
    details?: string;
    location?: string;
}

const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

function parseDate(iso?: string): Date | null {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** 2026-12-12T03:00:00.000Z -> 20261212T030000Z */
function toUtcStamp(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Build a Google Calendar "add event" URL.
 * Returns null when there is no usable start datetime.
 */
export function googleCalendarUrl(o: CalendarEvent): string | null {
    const start = parseDate(o.startIso);
    if (!start) return null;
    const end = parseDate(o.endIso) ?? new Date(start.getTime() + DEFAULT_DURATION_MS);

    const parts = [
        'action=TEMPLATE',
        `text=${encodeURIComponent(o.title)}`,
        `dates=${toUtcStamp(start)}/${toUtcStamp(end)}`,
    ];
    if (o.details) parts.push(`details=${encodeURIComponent(o.details)}`);
    if (o.location) parts.push(`location=${encodeURIComponent(o.location)}`);

    return `https://calendar.google.com/calendar/render?${parts.join('&')}`;
}

// RFC 5545 text escaping: backslash, semicolon, comma, newlines.
function escapeIcsText(v: string): string {
    return v
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n|\r|\n/g, '\\n');
}

// Fold lines longer than 75 chars per RFC 5545 (CRLF + leading space).
function foldLine(line: string): string {
    if (line.length <= 75) return line;
    const out: string[] = [line.slice(0, 75)];
    let rest = line.slice(75);
    while (rest.length > 74) {
        out.push(' ' + rest.slice(0, 74));
        rest = rest.slice(74);
    }
    if (rest.length) out.push(' ' + rest);
    return out.join('\r\n');
}

// UTF-8 safe base64 (btoa alone chokes on non-Latin1 chars).
function base64Utf8(s: string): string {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

/**
 * Build a downloadable .ics VEVENT as a base64 data URI.
 * Returns null when there is no usable start datetime.
 */
export function icsDataUri(o: CalendarEvent): string | null {
    const start = parseDate(o.startIso);
    if (!start) return null;
    const end = parseDate(o.endIso) ?? new Date(start.getTime() + DEFAULT_DURATION_MS);
    const stamp = toUtcStamp(start);
    const uidSeed = base64Utf8(o.title).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PortalKahwin//Wedding Invitation//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${stamp}-${uidSeed}@portalkahwin`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${stamp}`,
        `DTEND:${toUtcStamp(end)}`,
        `SUMMARY:${escapeIcsText(o.title)}`,
    ];
    if (o.details) lines.push(`DESCRIPTION:${escapeIcsText(o.details)}`);
    if (o.location) lines.push(`LOCATION:${escapeIcsText(o.location)}`);
    lines.push('END:VEVENT', 'END:VCALENDAR');

    const ics = lines.map(foldLine).join('\r\n');
    return `data:text/calendar;charset=utf-8;base64,${base64Utf8(ics)}`;
}
