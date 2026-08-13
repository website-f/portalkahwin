import type { InvitationData } from './types';
import { formatHijri } from '../lib/datetime';

/**
 * Today's date, so every preview and preset looks current rather than frozen on
 * a date that quietly ages into the past. Computed at module load — a preview is
 * never open long enough for midnight to matter.
 */
const TODAY = new Date();

const pad = (n: number): string => String(n).padStart(2, '0');
const iso = (h: number): string =>
    `${TODAY.getFullYear()}-${pad(TODAY.getMonth() + 1)}-${pad(TODAY.getDate())}T${pad(h)}:00:00`;

/** "Sabtu, 12 Disember 2026" in Malay, matching the format hosts type by hand. */
export const SAMPLE_DATE_LABEL = new Intl.DateTimeFormat('ms-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(TODAY);

/** "12 . 07 . 2026" — the spaced form used in the auth-panel mock card. */
export const SAMPLE_DATE_DOTTED =
    `${pad(TODAY.getDate())} . ${pad(TODAY.getMonth() + 1)} . ${TODAY.getFullYear()}`;

// Demo content used by template previews and the gallery.
export const SAMPLE_INVITATION: InvitationData = {
    groomName: 'Adam',
    brideName: 'Hawa',
    groomShort: 'Adam',
    brideShort: 'Hawa',
    groomParents: 'Bin Encik Ahmad Faizal & Puan Rohana',
    brideParents: 'Binti Encik Kamarul & Puan Zaleha',
    openingLine:
        'Dengan penuh rasa syukur, kami berbesar hati menjemput Dato’ / Datin / Tuan / Puan / Encik / Cik ke majlis perkahwinan anakanda kami',
    bismillah: true,
    akadAt: iso(10),
    receptionAt: iso(12),
    dateLabel: SAMPLE_DATE_LABEL,
    hijriLabel: formatHijri(iso(10), 'bm'),
    timeLabel: '12:00 tengah hari – 4:00 petang',
    venueName: 'Dewan Seri Melati',
    venueAddress: 'Jalan Mawar 3, Taman Indah, 43000 Kajang, Selangor',
    mapsUrl: 'https://maps.google.com/?q=Dewan+Seri+Melati+Kajang',
    wazeUrl: 'https://waze.com/ul?q=Dewan%20Seri%20Melati%20Kajang',
    program: [
        { time: '11:00 pagi', title: 'Kehadiran Tetamu' },
        { time: '12:00 tengah hari', title: 'Majlis Menyambut Pengantin' },
        { time: '12:30 petang', title: 'Santapan Beradab' },
        { time: '2:00 petang', title: 'Sesi Bergambar' },
        { time: '4:00 petang', title: 'Majlis Beransur Selesai' },
    ],
    contacts: [
        { name: 'Encik Ahmad Faizal', role: 'Bapa Pengantin Lelaki', phone: '+60123456789' },
        { name: 'Puan Zaleha', role: 'Ibu Pengantin Perempuan', phone: '+60198765432' },
    ],
    gift: {
        bankName: 'Maybank',
        accountName: 'Adam',
        accountNo: '1234 5678 9012',
        note: 'Setiap sumbangan dan doa restu amat kami hargai.',
    },
    galleryImages: [],
    // No palette here on purpose: previews/gallery should use each template's OWN
    // default theme colours (a real card can still override via its own palette).
};

/**
 * Sample content for a *still* cover — a card thumbnail or a captured image.
 *
 * Identical to SAMPLE_INVITATION but without the timestamps: every template runs
 * a one-second countdown off them, and a gallery showing a dozen covers would
 * re-render a dozen full templates every second. The countdown block simply does
 * not render without a target date, and it sits below the cover anyway.
 */
export const COVER_SAMPLE: InvitationData = {
    ...SAMPLE_INVITATION,
    akadAt: undefined,
    receptionAt: undefined,
};
