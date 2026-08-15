import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { GOOGLE_FONTS_CATALOG, catToGroup, type FontCat, type CatalogFont } from '../lib/googleFontsCatalog';

const CAT_LABEL: Record<FontCat, string> = { serif: 'Serif', sans: 'Sans', display: 'Display', script: 'Script' };
const FALLBACK: Record<FontCat, string> = {
    serif: 'Georgia, serif',
    sans: "'Segoe UI', system-ui, sans-serif",
    display: 'Georgia, serif',
    script: "'Segoe Script', cursive",
};
const stackFor = (f: CatalogFont) => `'${f.name}', ${FALLBACK[f.cat]}`;

// Load a catalogue family's stylesheet once, on demand — family only (lightest),
// display=swap so the name shows in a fallback then swaps to the real face.
const previewLoaded = new Set<string>();
function loadPreview(name: string): void {
    if (previewLoaded.has(name) || typeof document === 'undefined') return;
    previewLoaded.add(name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}&display=swap`;
    document.head.appendChild(link);
}

/** One row — renders its name in its own face, loading that face only when it scrolls into view. */
function FontOption({
    f,
    rootRef,
    onPick,
}: {
    f: CatalogFont;
    rootRef: React.RefObject<HTMLDivElement | null>;
    onPick: (name: string, group: 'serif' | 'script' | 'display' | 'sans') => void;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => { if (entries.some((e) => e.isIntersecting)) { loadPreview(f.name); io.disconnect(); } },
            { root: rootRef.current, rootMargin: '120px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [f.name, rootRef]);

    return (
        <button ref={ref} type="button" role="option" className="fss-opt" onClick={() => onPick(f.name, catToGroup(f.cat))}>
            <span className="fss-name" style={{ fontFamily: stackFor(f) }}>{f.name}</span>
            <span className={`fss-badge fss-${f.cat}`}>{CAT_LABEL[f.cat]}</span>
        </button>
    );
}

/**
 * A Select2-style searchable dropdown over the Google Fonts catalogue: type to
 * filter, click to add. Each option renders in its own font so the shape of the
 * letters — not just the name — tells you what you're picking; the face is
 * lazy-loaded as the row scrolls into view, so opening the list doesn't pull
 * hundreds of webfonts at once. Anything not listed can be typed and added as a
 * custom family, so the catalogue is a convenience, not a ceiling.
 */
export function FontSearchSelect({
    taken,
    onPick,
    placeholder,
    noMatch,
    useCustom,
}: {
    taken: Set<string>;
    onPick: (name: string, group: 'serif' | 'script' | 'display' | 'sans') => void;
    placeholder: string;
    noMatch: string;
    useCustom: (q: string) => string;
}) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const popRef = useRef<HTMLDivElement>(null);

    const results = useMemo(() => {
        const query = q.trim().toLowerCase();
        return GOOGLE_FONTS_CATALOG
            .filter((f) => !taken.has(f.name.toLowerCase()))
            .filter((f) => !query || f.name.toLowerCase().includes(query))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 60);
    }, [q, taken]);

    const query = q.trim();
    const exact = query && GOOGLE_FONTS_CATALOG.some((f) => f.name.toLowerCase() === query.toLowerCase());
    const alreadyTaken = query && taken.has(query.toLowerCase());
    const showCustom = query.length > 0 && !exact && !alreadyTaken;

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const pick = (name: string, group: 'serif' | 'script' | 'display' | 'sans') => {
        onPick(name, group);
        setQ('');
        setOpen(false);
    };

    return (
        <div ref={ref} className="fss">
            <style>{FSS_CSS}</style>
            <div className="fss-inputwrap">
                <Search size={16} className="fss-search-icon" />
                <input
                    className="fss-input"
                    value={q}
                    placeholder={placeholder}
                    onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (results[0] && !showCustom) pick(results[0].name, catToGroup(results[0].cat));
                            else if (showCustom) pick(query, 'sans');
                        }
                    }}
                />
            </div>

            {open && (
                <div ref={popRef} className="fss-pop" role="listbox">
                    {results.map((f) => (
                        <FontOption key={f.name} f={f} rootRef={popRef} onPick={pick} />
                    ))}
                    {showCustom && (
                        <button type="button" className="fss-opt fss-custom" onClick={() => pick(query, 'sans')}>
                            <Plus size={14} /> <span className="fss-name">{useCustom(query)}</span>
                        </button>
                    )}
                    {!results.length && !showCustom && <div className="fss-empty">{noMatch}</div>}
                </div>
            )}
        </div>
    );
}

const FSS_CSS = `
.fss { position: relative; }
.fss-inputwrap { position: relative; display: flex; align-items: center; }
.fss-search-icon { position: absolute; left: 13px; color: var(--muted); pointer-events: none; z-index: 1; }
/* Scoped under .fss so it out-specifies the global ".field input" padding. */
.fss .fss-input {
    width: 100%; padding: 11px 13px 11px 40px; border: 1px solid var(--line); border-radius: 10px;
    background: #fff; color: var(--ink); font: inherit; transition: border-color .15s ease;
}
.fss .fss-input:focus { outline: none; border-color: var(--plum); }
.fss-pop {
    position: absolute; z-index: 50; top: calc(100% + 6px); left: 0; right: 0;
    max-height: 360px; overflow-y: auto; padding: 6px;
    background: #fff; border: 1px solid var(--line); border-radius: 12px;
    box-shadow: 0 22px 50px -22px rgba(74,59,196,.5), 0 0 0 1px rgba(74,59,196,.06);
}
.fss-opt {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 12px; border: 0; border-radius: 8px; background: transparent; color: var(--ink);
    font: inherit; cursor: pointer; text-align: left;
}
.fss-opt:hover { background: var(--cream); }
.fss-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 19px; line-height: 1.25; }
.fss-custom { color: var(--plum); border-top: 1px solid var(--line); border-radius: 0; margin-top: 4px; }
.fss-custom .fss-name { font-size: 15px; font-weight: 600; }
.fss-badge { flex: 0 0 auto; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--cream); color: var(--muted); }
.fss-serif { color: #7a5230; background: #f6ecdf; }
.fss-sans { color: #2f6b52; background: #e4f3ec; }
.fss-display { color: #7a3a63; background: #f6e6f0; }
.fss-script { color: #4a3bc4; background: #ebe8fb; }
.fss-empty { padding: 14px 12px; font-size: 13px; color: var(--muted); text-align: center; }
`;
