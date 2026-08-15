/**
 * A browsable slice of the Google Fonts catalogue for the admin font picker.
 *
 * Not the full ~1800 — that needs the metered Developer API and a key. This is a
 * generous, hand-kept set of the families couples actually reach for (plus the
 * Chinese faces a zh card needs), each tagged with the category we group by.
 * Anything missing can still be added by pasting its <link>/@import from Google.
 *
 * Built-in families (see CARD_FONTS) are intentionally omitted so the picker
 * never lists the same face twice.
 */
export type FontCat = 'serif' | 'sans' | 'display' | 'script';

export interface CatalogFont {
    name: string;
    cat: FontCat;
}

export const GOOGLE_FONTS_CATALOG: CatalogFont[] = [
    // ---- Sans-serif ----
    { name: 'Roboto', cat: 'sans' }, { name: 'Open Sans', cat: 'sans' }, { name: 'Lato', cat: 'sans' },
    { name: 'Montserrat', cat: 'sans' }, { name: 'Poppins', cat: 'sans' }, { name: 'Inter', cat: 'sans' },
    { name: 'Nunito', cat: 'sans' }, { name: 'Nunito Sans', cat: 'sans' }, { name: 'Work Sans', cat: 'sans' },
    { name: 'Rubik', cat: 'sans' }, { name: 'Mulish', cat: 'sans' }, { name: 'Manrope', cat: 'sans' },
    { name: 'DM Sans', cat: 'sans' }, { name: 'Quicksand', cat: 'sans' }, { name: 'Josefin Sans', cat: 'sans' },
    { name: 'Karla', cat: 'sans' }, { name: 'Barlow', cat: 'sans' }, { name: 'Barlow Condensed', cat: 'sans' },
    { name: 'Cabin', cat: 'sans' }, { name: 'Source Sans 3', cat: 'sans' }, { name: 'PT Sans', cat: 'sans' },
    { name: 'Fira Sans', cat: 'sans' }, { name: 'Hind', cat: 'sans' }, { name: 'Heebo', cat: 'sans' },
    { name: 'Kanit', cat: 'sans' }, { name: 'Titillium Web', cat: 'sans' }, { name: 'Assistant', cat: 'sans' },
    { name: 'Signika', cat: 'sans' }, { name: 'Signika Negative', cat: 'sans' }, { name: 'Archivo', cat: 'sans' },
    { name: 'Archivo Narrow', cat: 'sans' }, { name: 'Public Sans', cat: 'sans' }, { name: 'Sora', cat: 'sans' },
    { name: 'Outfit', cat: 'sans' }, { name: 'Lexend', cat: 'sans' }, { name: 'Figtree', cat: 'sans' },
    { name: 'Plus Jakarta Sans', cat: 'sans' }, { name: 'Red Hat Display', cat: 'sans' }, { name: 'Red Hat Text', cat: 'sans' },
    { name: 'Urbanist', cat: 'sans' }, { name: 'Albert Sans', cat: 'sans' }, { name: 'Be Vietnam Pro', cat: 'sans' },
    { name: 'Epilogue', cat: 'sans' }, { name: 'Space Grotesk', cat: 'sans' }, { name: 'Instrument Sans', cat: 'sans' },
    { name: 'Hanken Grotesk', cat: 'sans' }, { name: 'Overpass', cat: 'sans' }, { name: 'Prompt', cat: 'sans' },
    { name: 'Mukta', cat: 'sans' }, { name: 'Catamaran', cat: 'sans' }, { name: 'Dosis', cat: 'sans' },
    { name: 'Comfortaa', cat: 'sans' }, { name: 'Varela Round', cat: 'sans' }, { name: 'Baloo 2', cat: 'sans' },
    { name: 'Fredoka', cat: 'sans' }, { name: 'M PLUS Rounded 1c', cat: 'sans' }, { name: 'Noto Sans', cat: 'sans' },
    { name: 'IBM Plex Sans', cat: 'sans' }, { name: 'Roboto Condensed', cat: 'sans' }, { name: 'Encode Sans', cat: 'sans' },
    { name: 'Chivo', cat: 'sans' }, { name: 'Saira', cat: 'sans' }, { name: 'Exo 2', cat: 'sans' },
    { name: 'Maven Pro', cat: 'sans' }, { name: 'Oxygen', cat: 'sans' }, { name: 'Ubuntu', cat: 'sans' },
    { name: 'Cantarell', cat: 'sans' }, { name: 'Questrial', cat: 'sans' }, { name: 'Rajdhani', cat: 'sans' },
    { name: 'Play', cat: 'sans' }, { name: 'Alata', cat: 'sans' }, { name: 'Sarabun', cat: 'sans' },
    { name: 'Onest', cat: 'sans' }, { name: 'Geist', cat: 'sans' }, { name: 'Schibsted Grotesk', cat: 'sans' },
    { name: 'League Spartan', cat: 'sans' }, { name: 'Gabarito', cat: 'sans' }, { name: 'Readex Pro', cat: 'sans' },
    { name: 'Wix Madefor Text', cat: 'sans' }, { name: 'Didact Gothic', cat: 'sans' }, { name: 'Muli', cat: 'sans' },

    // ---- Serif ----
    { name: 'Merriweather', cat: 'serif' }, { name: 'PT Serif', cat: 'serif' }, { name: 'Noto Serif', cat: 'serif' },
    { name: 'Roboto Slab', cat: 'serif' }, { name: 'Bitter', cat: 'serif' }, { name: 'Source Serif 4', cat: 'serif' },
    { name: 'Domine', cat: 'serif' }, { name: 'Cardo', cat: 'serif' }, { name: 'Vollkorn', cat: 'serif' },
    { name: 'Arvo', cat: 'serif' }, { name: 'Zilla Slab', cat: 'serif' }, { name: 'Frank Ruhl Libre', cat: 'serif' },
    { name: 'Bree Serif', cat: 'serif' }, { name: 'Alegreya', cat: 'serif' }, { name: 'Cormorant', cat: 'serif' },
    { name: 'Cormorant Infant', cat: 'serif' }, { name: 'Cormorant SC', cat: 'serif' }, { name: 'Fraunces', cat: 'serif' },
    { name: 'DM Serif Display', cat: 'serif' }, { name: 'DM Serif Text', cat: 'serif' }, { name: 'Prata', cat: 'serif' },
    { name: 'Petrona', cat: 'serif' }, { name: 'Newsreader', cat: 'serif' }, { name: 'Literata', cat: 'serif' },
    { name: 'Lustria', cat: 'serif' }, { name: 'Rufina', cat: 'serif' }, { name: 'Yeseva One', cat: 'serif' },
    { name: 'Sorts Mill Goudy', cat: 'serif' }, { name: 'Old Standard TT', cat: 'serif' }, { name: 'Ibarra Real Nova', cat: 'serif' },
    { name: 'Instrument Serif', cat: 'serif' }, { name: 'Bodoni Moda', cat: 'serif' }, { name: 'Tenor Sans', cat: 'serif' },
    { name: 'Crimson Text', cat: 'serif' }, { name: 'Gelasio', cat: 'serif' }, { name: 'Alice', cat: 'serif' },
    { name: 'Marcellus SC', cat: 'serif' }, { name: 'Playfair Display SC', cat: 'serif' }, { name: 'Spectral SC', cat: 'serif' },
    { name: 'Kreon', cat: 'serif' }, { name: 'Aleo', cat: 'serif' }, { name: 'Slabo 27px', cat: 'serif' },
    { name: 'Josefin Slab', cat: 'serif' }, { name: 'Enriqueta', cat: 'serif' }, { name: 'Faustina', cat: 'serif' },
    { name: 'Piazzolla', cat: 'serif' }, { name: 'Sumana', cat: 'serif' }, { name: 'Halant', cat: 'serif' },
    { name: 'Rozha One', cat: 'serif' }, { name: 'Cutive', cat: 'serif' }, { name: 'Amiri', cat: 'serif' },

    // ---- Display ----
    { name: 'Oswald', cat: 'display' }, { name: 'Bebas Neue', cat: 'display' }, { name: 'Anton', cat: 'display' },
    { name: 'Abril Fatface', cat: 'display' }, { name: 'Righteous', cat: 'display' }, { name: 'Alfa Slab One', cat: 'display' },
    { name: 'Lobster', cat: 'display' }, { name: 'Lobster Two', cat: 'display' }, { name: 'Fjalla One', cat: 'display' },
    { name: 'Archivo Black', cat: 'display' }, { name: 'Passion One', cat: 'display' }, { name: 'Bungee', cat: 'display' },
    { name: 'Bungee Inline', cat: 'display' }, { name: 'Staatliches', cat: 'display' }, { name: 'Teko', cat: 'display' },
    { name: 'Monoton', cat: 'display' }, { name: 'Ultra', cat: 'display' }, { name: 'Titan One', cat: 'display' },
    { name: 'Cinzel Decorative', cat: 'display' }, { name: 'Unbounded', cat: 'display' }, { name: 'Syne', cat: 'display' },
    { name: 'Chonburi', cat: 'display' }, { name: 'Bowlby One SC', cat: 'display' }, { name: 'Paytone One', cat: 'display' },
    { name: 'Concert One', cat: 'display' }, { name: 'Rowdies', cat: 'display' }, { name: 'Squada One', cat: 'display' },
    { name: 'Sigmar One', cat: 'display' }, { name: 'Shrikhand', cat: 'display' }, { name: 'Gravitas One', cat: 'display' },
    { name: 'Big Shoulders Display', cat: 'display' }, { name: 'Kalnia', cat: 'display' }, { name: 'Fredericka the Great', cat: 'display' },
    { name: 'Rye', cat: 'display' }, { name: 'Vast Shadow', cat: 'display' }, { name: 'Pirata One', cat: 'display' },
    { name: 'Bungee Shade', cat: 'display' }, { name: 'Cherry Bomb One', cat: 'display' }, { name: 'Rampart One', cat: 'display' },
    { name: 'Bricolage Grotesque', cat: 'display' }, { name: 'Zilla Slab Highlight', cat: 'display' },

    // ---- Script / handwriting ----
    { name: 'Pacifico', cat: 'script' }, { name: 'Satisfy', cat: 'script' }, { name: 'Caveat', cat: 'script' },
    { name: 'Kaushan Script', cat: 'script' }, { name: 'Shadows Into Light', cat: 'script' }, { name: 'Amatic SC', cat: 'script' },
    { name: 'Permanent Marker', cat: 'script' }, { name: 'Indie Flower', cat: 'script' }, { name: 'Handlee', cat: 'script' },
    { name: 'Courgette', cat: 'script' }, { name: 'Marck Script', cat: 'script' }, { name: 'Yellowtail', cat: 'script' },
    { name: 'Cookie', cat: 'script' }, { name: 'Alex Brush', cat: 'script' }, { name: 'Homemade Apple', cat: 'script' },
    { name: 'Nothing You Could Do', cat: 'script' }, { name: 'Bad Script', cat: 'script' }, { name: 'Rouge Script', cat: 'script' },
    { name: 'Petit Formal Script', cat: 'script' }, { name: 'Herr Von Muellerhoff', cat: 'script' }, { name: 'Mr De Haviland', cat: 'script' },
    { name: 'Italianno', cat: 'script' }, { name: 'Ephesis', cat: 'script' }, { name: 'Mrs Saint Delafield', cat: 'script' },
    { name: 'Sofia', cat: 'script' }, { name: 'Norican', cat: 'script' }, { name: 'Niconne', cat: 'script' },
    { name: 'Berkshire Swash', cat: 'script' }, { name: 'Yesteryear', cat: 'script' }, { name: 'Meddon', cat: 'script' },
    { name: 'Playball', cat: 'script' }, { name: 'Damion', cat: 'script' }, { name: 'Clicker Script', cat: 'script' },
    { name: 'Lovers Quarrel', cat: 'script' }, { name: 'Qwigley', cat: 'script' }, { name: 'Monsieur La Doulaise', cat: 'script' },
    { name: 'League Script', cat: 'script' }, { name: 'Style Script', cat: 'script' }, { name: 'WindSong', cat: 'script' },
    { name: 'Birthstone', cat: 'script' }, { name: 'Birthstone Bounce', cat: 'script' }, { name: 'Estonia', cat: 'script' },
    { name: 'Island Moments', cat: 'script' }, { name: 'Moon Dance', cat: 'script' }, { name: 'Whisper', cat: 'script' },
    { name: 'Ballet', cat: 'script' }, { name: 'Corinthia', cat: 'script' }, { name: 'Imperial Script', cat: 'script' },
    { name: 'Petemoss', cat: 'script' }, { name: 'Cedarville Cursive', cat: 'script' }, { name: 'Fuggles', cat: 'script' },

    // ---- Chinese (for zh cards) ----
    { name: 'Noto Sans SC', cat: 'sans' }, { name: 'Noto Serif SC', cat: 'serif' },
    { name: 'Noto Sans TC', cat: 'sans' }, { name: 'Noto Serif TC', cat: 'serif' },
    { name: 'Ma Shan Zheng', cat: 'script' }, { name: 'Long Cang', cat: 'script' },
    { name: 'Liu Jian Mao Cao', cat: 'script' }, { name: 'Zhi Mang Xing', cat: 'script' },
    { name: 'ZCOOL XiaoWei', cat: 'serif' }, { name: 'ZCOOL QingKe HuangYou', cat: 'display' },
    { name: 'ZCOOL KuaiLe', cat: 'display' },
];

/** Category → the card-font group we store. */
export function catToGroup(cat: FontCat): 'serif' | 'script' | 'display' | 'sans' {
    return cat;
}

/** Lowercased family → category, for enriching a pasted @import that has no category. */
const CAT_BY_NAME: Record<string, FontCat> = Object.fromEntries(
    GOOGLE_FONTS_CATALOG.map((f) => [f.name.toLowerCase(), f.cat]),
);

export function catalogGroupFor(family: string): 'serif' | 'script' | 'display' | 'sans' {
    return CAT_BY_NAME[family.trim().toLowerCase()] ?? 'sans';
}
