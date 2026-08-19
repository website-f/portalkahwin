// ============================================================
// Shared contract for every wedding-card template component.
// A template is a self-contained React component:
//   export default function XTemplate({ data }: TemplateProps) { ... }
// It receives InvitationData and renders the full animated card.
// ============================================================

export interface ProgramItem {
    time: string;   // "11:00 pagi"
    title: string;  // "Ketibaan Tetamu"
}

export interface Contact {
    name: string;
    role?: string;  // "Bapa saudara", "Pengurus Majlis"
    phone: string;  // "+60123456789"
}

export interface GiftInfo {
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    qrUrl?: string;      // DuitNow QR image
    note?: string;
}

/** A single item on the couple's gift registry / wishlist. */
export interface WishlistItem {
    title: string;   // "Set Pinggan Mangkuk"
    note?: string;   // colour / preference
    url?: string;    // optional link to buy
}

export interface Palette {
    primary: string;   // main ink / heading
    secondary: string; // supporting
    accent: string;    // florals / lines / buttons
    bg: string;        // page background
    text: string;      // body text
}

export interface InvitationData {
    // Kind — a card is a wedding (default) or a non-wedding event.
    kind?: 'wedding' | 'event';

    // Event fields (kind === 'event'). Generic, poster-forward — no couple.
    eventType?: string;        // "concert" | "gala" | "seminar" | ...
    eventName?: string;        // "Malam Muzik Nusantara"
    eventSubtitle?: string;    // short tagline under the title
    eventDescription?: string; // about / details paragraph (intro)
    /** Flexible host-defined detail rows: Dress code, Parking, RSVP-by, … */
    customFields?: { label: string; value: string }[];
    eventOutro?: string;       // closing message
    posterImage?: string;      // the event poster (hero)
    organizer?: string;        // "Presented by …"

    // Identity (wedding)
    groomName: string;
    brideName: string;
    groomShort?: string;   // "Adam"
    brideShort?: string;   // "Hawa"
    groomParents?: string; // "Bin Encik Ahmad & Puan Siti"
    brideParents?: string;
    /** Which family hosts — a bride-leading side (bride / both_bride) puts her name first. */
    inviteSide?: 'groom' | 'bride' | 'both_groom' | 'both_bride' | 'two_couples';

    // Opening
    openingLine?: string;  // "Dengan penuh kesyukuran, kami menjemput..."
    prayer?: string;       // doa block shown before the countdown
    bismillah?: boolean;   // show Bismillah calligraphy on cover
    bismillahText?: string;// custom Bismillah text (overrides the default Arabic line)
    walimahLabel?: string; // the "Jemputan Walimatulurus" heading (empty = hide, undefined = template default)

    // Timing
    akadAt?: string;       // ISO datetime (akad nikah)
    receptionAt?: string;  // ISO datetime (majlis / walimatulurus) — used for countdown
    dateLabel?: string;    // "Sabtu, 12 Disember 2026"
    timeLabel?: string;    // "11:00 pagi – 4:00 petang"
    hijriLabel?: string;   // optional hijri date

    // Venue
    venueName?: string;
    venueAddress?: string;
    mapsUrl?: string;      // Google Maps
    wazeUrl?: string;

    // Content blocks
    program?: ProgramItem[];   // Atur Cara Majlis
    contacts?: Contact[];      // Hubungi
    gift?: GiftInfo;           // Salam Kasih / cash gift
    wishlist?: WishlistItem[];
    /** Guestbook layout: horizontal carousel (default) or a vertical scroller. */
    wishesLayout?: 'carousel' | 'list'; // Senarai Hadiah (bride-side gift registry)
    galleryImages?: string[];  // Galeri
    coverImage?: string;
    musicUrl?: string;
    /** Background-music trim window in seconds (musicEnd null = to natural end). */
    musicStart?: number | null;
    musicEnd?: number | null;

    // Decorative Lottie layer: a filename in public/lottie, and whether it
    // should be retinted onto the card's palette.
    motionFile?: string | null;
    motionTint?: boolean;

    // Theming — templates may honor this to allow re-coloring
    palette?: Palette;

    // Display font id from lib/cardFonts. Applied as --pk-name by the card
    // wrapper; only the couple's names follow it.
    fontId?: string | null;

    // Per-card section toggles (opening, program, location, wishes, wishlist, contacts, gift, gallery).
    sections?: Record<string, boolean>;

    // Host-chosen order of the movable sections. Applied by useSectionOrder
    // against the <PkSec> anchors, so templates need not honour it themselves.
    sectionOrder?: string[];

    // For the no-code CUSTOM engine: the design config (see customConfig.ts CustomTemplateConfig).
    templateConfig?: import('./customConfig').CustomTemplateConfig;

    // Designer-only: force the ambient particle effect to render even in `preview`
    // mode (the settled preview normally skips it) so the editor can see it live.
    // Never set on real cards or gallery thumbnails.
    previewFx?: boolean;
}

export interface TemplateProps {
    data: InvitationData;
    /** When true, render in a compact non-interactive preview mode (thumbnails). */
    preview?: boolean;
    /** Live interactive widgets injected by the app (RSVP form, guestbook, wishlist). */
    slots?: {
        rsvp?: import('react').ReactNode;
        wishes?: import('react').ReactNode;
        wishlist?: import('react').ReactNode;
    };
}

export type TemplateCategory = 'floral' | 'motion' | 'khat' | 'songket' | 'modern';
