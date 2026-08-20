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
 * The wedding "genre" of a design, used to pick a per-genre default song
 * (Chinese / Indian weddings get their own track). Detected from the template's
 * category, its language tags, or its key prefix. Returns null for a plain
 * (Malay) wedding, which uses the generic 'wedding' song.
 */
export function songGenre(opts: { category?: string | null; languages?: string[] | null; templateKey?: string | null }): string | null {
    const cat = (opts.category ?? '').toLowerCase();
    const langs = (opts.languages ?? []).map((l) => l.toLowerCase());
    const key = (opts.templateKey ?? '').toLowerCase();
    if (cat === 'chinese' || cat === 'peranakan' || langs.includes('zh') || key.startsWith('zh-')) return 'chinese';
    if (cat === 'indian' || langs.includes('ta') || langs.includes('in') || key.startsWith('in-') || key.startsWith('ta-')) return 'indian';
    return null;
}

/**
 * The sample-gallery bucket a design draws from. Weddings use their genre
 * ('malay' | 'chinese' | 'indian'); events use their specific type key when the
 * admin has a set for it (e.g. 'birthday', 'aqiqah'), else the generic 'event'
 * set. So an aqiqah card and a birthday card can show different sample photos.
 */
export function galleryGenre(opts: { category?: string | null; languages?: string[] | null; templateKey?: string | null; kind?: string | null; eventType?: string | null }): string {
    const cat = (opts.category ?? '').toLowerCase();
    if (opts.kind === 'event' || cat === 'event') {
        return normEventType(opts.eventType) ?? 'event';
    }
    const g = songGenre(opts);
    return g === 'chinese' ? 'chinese' : g === 'indian' ? 'indian' : 'malay';
}

/**
 * Pick the default preview/test song for a card by its type. Event cards use the
 * per-type override for their event_type; wedding cards use their genre override
 * (Chinese / Indian) when set, else the generic 'wedding' song; then the legacy
 * fallback. Returns null when no default is configured (card shows just the FAB).
 */
export function resolvePreviewSong(
    s: PreviewSongSettings | null | undefined,
    kind?: string | null,
    eventType?: string | null,
    genre?: string | null,
): ResolvedSong | null {
    if (!s) return null;
    const per = s.preview_songs ?? {};
    const pick = (k: string): ResolvedSong | null => {
        const e = per[k];
        return e?.url ? { url: e.url, start: e.start ?? 0, end: e.end ?? null } : null;
    };
    let r: ResolvedSong | null;
    if (kind === 'event') {
        const t = normEventType(eventType);
        r = (t ? pick(t) : null) ?? pick('event') ?? pick('wedding');
    } else {
        // Wedding: its genre (chinese/indian) → the generic wedding song.
        r = (genre ? pick(genre) : null) ?? pick('wedding');
    }
    if (!r && s.preview_song_url) r = { url: s.preview_song_url, start: s.preview_song_start ?? 0, end: s.preview_song_end ?? null };
    return r;
}
