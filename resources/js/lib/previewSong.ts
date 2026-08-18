import { normEventType } from '../templates/eventTypes';

/** The settings shape the public /settings endpoint returns for default songs. */
export interface PreviewSongSettings {
    preview_song_url?: string;
    preview_song_start?: number;
    preview_song_end?: number | null;
    /** Per-card-type overrides, keyed by type → { url, start, end }. */
    preview_songs?: Record<string, { url?: string; start?: number; end?: number | null }> | null;
}

export interface ResolvedSong { url: string; start: number; end: number | null }

/**
 * Pick the default preview/test song for a card by its type. Event cards use the
 * per-type override for their event_type when the admin has set one; everything
 * else (weddings + any type without an override) falls back to the general default.
 * Returns null when no default is configured (the card then shows just the FAB).
 */
export function resolvePreviewSong(
    s: PreviewSongSettings | null | undefined,
    kind?: string | null,
    eventType?: string | null,
): ResolvedSong | null {
    if (!s) return null;
    const per = s.preview_songs ?? {};
    const pick = (k: string): ResolvedSong | null => {
        const e = per[k];
        return e?.url ? { url: e.url, start: e.start ?? 0, end: e.end ?? null } : null;
    };
    // Event cards: their specific type → the generic 'event' default → wedding.
    // Wedding (and everything else): the 'wedding' default. Then the legacy fallback.
    let r: ResolvedSong | null;
    if (kind === 'event') {
        const t = normEventType(eventType);
        r = (t ? pick(t) : null) ?? pick('event') ?? pick('wedding');
    } else {
        r = pick('wedding');
    }
    if (!r && s.preview_song_url) r = { url: s.preview_song_url, start: s.preview_song_start ?? 0, end: s.preview_song_end ?? null };
    return r;
}
