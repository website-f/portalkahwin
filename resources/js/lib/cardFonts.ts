/**
 * Display fonts a host can choose for their card.
 *
 * Each entry names a Google font plus a concrete fallback stack, so a card still
 * reads correctly if the webfont is slow or blocked. The chosen family is
 * applied through the `--pk-name` custom property, which each template's NAMES
 * constant falls back to.
 *
 * Scoped to the couple's names on purpose: a script face is beautiful on two
 * names and unreadable on a run-of-show table, an address or a paragraph of
 * ucapan, so it never touches body copy or section headings.
 *
 * Kept to twenty deliberately: enough range to feel like a choice, few enough
 * that a couple can actually look at all of them.
 */
export interface CardFont {
    /** Stored on the invitation. Stable — never renumber or rename these. */
    id: string;
    /** Shown in the picker. */
    label: string;
    /** The full font-family value applied to the card. */
    stack: string;
    /** Google Fonts family spec, e.g. `Playfair+Display:wght@400;700`. */
    google: string;
    /** Grouping in the picker. */
    group: 'serif' | 'script' | 'display' | 'sans';
}

export const CARD_FONTS: CardFont[] = [
    // --- Serif: the default register for a wedding card ---
    { id: 'cormorant', label: 'Cormorant Garamond', google: 'Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400', group: 'serif', stack: "'Cormorant Garamond', Georgia, serif" },
    { id: 'playfair', label: 'Playfair Display', google: 'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400', group: 'serif', stack: "'Playfair Display', Georgia, serif" },
    { id: 'lora', label: 'Lora', google: 'Lora:ital,wght@0,400;0,600;1,400', group: 'serif', stack: "'Lora', Georgia, serif" },
    { id: 'crimson', label: 'Crimson Pro', google: 'Crimson+Pro:ital,wght@0,400;0,600;1,400', group: 'serif', stack: "'Crimson Pro', Georgia, serif" },
    { id: 'eb-garamond', label: 'EB Garamond', google: 'EB+Garamond:ital,wght@0,400;0,600;1,400', group: 'serif', stack: "'EB Garamond', Garamond, serif" },
    { id: 'libre-baskerville', label: 'Libre Baskerville', google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', group: 'serif', stack: "'Libre Baskerville', Georgia, serif" },
    { id: 'spectral', label: 'Spectral', google: 'Spectral:ital,wght@0,400;0,600;1,400', group: 'serif', stack: "'Spectral', Georgia, serif" },

    // --- Script: the "fancy" register ---
    { id: 'great-vibes', label: 'Great Vibes', google: 'Great+Vibes', group: 'script', stack: "'Great Vibes', 'Segoe Script', cursive" },
    { id: 'parisienne', label: 'Parisienne', google: 'Parisienne', group: 'script', stack: "'Parisienne', 'Segoe Script', cursive" },
    { id: 'dancing-script', label: 'Dancing Script', google: 'Dancing+Script:wght@400;600;700', group: 'script', stack: "'Dancing Script', 'Segoe Script', cursive" },
    { id: 'sacramento', label: 'Sacramento', google: 'Sacramento', group: 'script', stack: "'Sacramento', 'Segoe Script', cursive" },
    { id: 'pinyon-script', label: 'Pinyon Script', google: 'Pinyon+Script', group: 'script', stack: "'Pinyon Script', 'Segoe Script', cursive" },
    { id: 'allura', label: 'Allura', google: 'Allura', group: 'script', stack: "'Allura', 'Segoe Script', cursive" },
    { id: 'tangerine', label: 'Tangerine', google: 'Tangerine:wght@400;700', group: 'script', stack: "'Tangerine', 'Segoe Script', cursive" },

    // --- Display: characterful headings ---
    { id: 'cinzel', label: 'Cinzel', google: 'Cinzel:wght@400;600;700', group: 'display', stack: "'Cinzel', Georgia, serif" },
    { id: 'marcellus', label: 'Marcellus', google: 'Marcellus', group: 'display', stack: "'Marcellus', Georgia, serif" },
    { id: 'italiana', label: 'Italiana', google: 'Italiana', group: 'display', stack: "'Italiana', Georgia, serif" },
    { id: 'gilda', label: 'Gilda Display', google: 'Gilda+Display', group: 'display', stack: "'Gilda Display', Georgia, serif" },

    // --- Sans: for a modern, quiet card ---
    { id: 'jost', label: 'Jost', google: 'Jost:wght@300;400;500;600', group: 'sans', stack: "'Jost', 'Segoe UI', sans-serif" },
    { id: 'raleway', label: 'Raleway', google: 'Raleway:wght@300;400;500;600', group: 'sans', stack: "'Raleway', 'Segoe UI', sans-serif" },
];

export const findCardFont = (id?: string | null): CardFont | undefined =>
    id ? CARD_FONTS.find((f) => f.id === id) : undefined;

/**
 * Load a font's stylesheet once, on demand.
 *
 * Twenty families is far too much to ship in the document head for every
 * visitor — a live card needs exactly one, and the editor's picker only needs
 * what it is actually showing.
 */
const loaded = new Set<string>();

export function loadCardFont(id?: string | null): void {
    const font = findCardFont(id);
    if (!font || loaded.has(font.id) || typeof document === 'undefined') return;
    loaded.add(font.id);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
    document.head.appendChild(link);
}

/** Preload every family — only the editor's picker, which shows them all at once. */
export function loadAllCardFonts(): void {
    CARD_FONTS.forEach((f) => loadCardFont(f.id));
}
