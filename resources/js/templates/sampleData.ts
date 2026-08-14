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

/** "2026年8月14日 星期五" — Chinese form, for the Chinese-genre preview. */
export const SAMPLE_DATE_LABEL_ZH = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
}).format(TODAY);

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

/**
 * Chinese-genre preview content — Chinese names & copy so a 囍 red-and-gold
 * design previews with the couple a Chinese template is actually for (rather
 * than "Adam & Hawa"). Chinese weddings carry no bismillah/akad, so those are
 * dropped; the card chrome still follows the viewer's UI language.
 */
export const CHINESE_SAMPLE: InvitationData = {
    ...SAMPLE_INVITATION,
    groomName: '陈家豪',
    brideName: '林诗雅',
    groomShort: '家豪',
    brideShort: '诗雅',
    groomParents: '陈志明先生 · 王丽华女士 长子',
    brideParents: '林伟强先生 · 张美玲女士 次女',
    openingLine: '谨订于良辰吉日为小儿完婚，敬备喜筵，恭请阁下拨冗光临，共襄喜庆。',
    bismillah: false,
    hijriLabel: undefined,
    dateLabel: SAMPLE_DATE_LABEL_ZH,
    timeLabel: '中午 12:00 – 下午 4:00',
    venueName: '富丽华大酒楼',
    venueAddress: '吉隆坡金河广场 3 楼宴会厅',
    program: [
        { time: '上午 11:00', title: '宾客入席' },
        { time: '中午 12:00', title: '迎接新人' },
        { time: '下午 12:30', title: '喜宴开始' },
        { time: '下午 2:00', title: '合影留念' },
        { time: '下午 4:00', title: '礼成' },
    ],
    contacts: [
        { name: '陈先生', role: '男方家长', phone: '+60123456789' },
        { name: '林女士', role: '女方家长', phone: '+60198765432' },
    ],
    gift: {
        bankName: 'Maybank',
        accountName: '陈家豪',
        accountNo: '1234 5678 9012',
        note: '感谢您的祝福与心意。',
    },
};

/** Indian-genre preview content — Indian names on the otherwise-universal copy. */
export const INDIAN_SAMPLE: InvitationData = {
    ...SAMPLE_INVITATION,
    groomName: 'Arjun',
    brideName: 'Priya',
    groomShort: 'Arjun',
    brideShort: 'Priya',
    groomParents: 'S/O Mr. Rajesh & Mrs. Lakshmi',
    brideParents: 'D/O Mr. Suresh & Mrs. Kavita',
    bismillah: false,
    venueName: 'Sri Devi Grand Hall',
    gift: { ...SAMPLE_INVITATION.gift!, accountName: 'Arjun' },
};

/**
 * Pick the preview couple that fits a template's genre — Chinese names for a
 * Chinese design, Indian names for an Indian one, the default couple otherwise.
 * Pass `cover: true` to drop the countdown timestamps (still thumbnails).
 */
export function sampleFor(
    opts?: { category?: string | null; languages?: string[] | null } | null,
    cover = false,
): InvitationData {
    const cat = (opts?.category ?? '').toLowerCase();
    const langs = opts?.languages ?? [];
    const base =
        cat === 'chinese' || langs.includes('zh') ? CHINESE_SAMPLE
            : cat === 'indian' ? INDIAN_SAMPLE
                : SAMPLE_INVITATION;
    return cover ? { ...base, akadAt: undefined, receptionAt: undefined } : base;
}
