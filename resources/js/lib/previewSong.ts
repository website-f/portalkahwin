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
    const type = kind === 'event' ? (normEventType(eventType) ?? 'wedding') : 'wedding';
    const per = s.preview_songs?.[type];
    if (per?.url) return { url: per.url, start: per.start ?? 0, end: per.end ?? null };
    if (s.preview_song_url) return { url: s.preview_song_url, start: s.preview_song_start ?? 0, end: s.preview_song_end ?? null };
    return null;
}
