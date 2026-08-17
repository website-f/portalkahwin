// ============================================================
//  Event TYPES — distinct content, hero art & copy per kind of event.
//
//  The theme (eventThemes.tsx) gives colour/ground/motif; the TYPE gives the
//  actual identity: an open house shows ketupat + "Rumah Terbuka", a birthday
//  shows a cake + balloons + "Hari Jadi", etc. So two event templates never read
//  as "the same concert, recoloured". Sample content drives the gallery/preview;
//  a live card uses the host's own data with these as fallbacks.
// ============================================================

import type { ReactNode } from 'react';
import { hexA } from './templateArt';

export type EventTypeKey = 'concert' | 'openhouse' | 'birthday' | 'aqiqah' | 'corporate' | 'gala';
export type EventCtaKey = 'tickets' | 'rsvp' | 'register';

export interface EventTypeInfo {
    chip: string;        // default type chip (BM; a host can override with their own)
    cta: EventCtaKey;    // which cover CTA label to show
    art: EventTypeKey;   // hero art motif key
    sample: {
        eventName: string; eventSubtitle: string; eventDescription: string;
        organizer: string; venueName: string; venueAddress: string;
        dateLabel: string; timeLabel: string;
        program: { time: string; title: string }[];
        customFields: { label: string; value: string }[];
    };
}

export const EVENT_TYPES: Record<EventTypeKey, EventTypeInfo> = {
    concert: {
        chip: 'Konsert', cta: 'tickets', art: 'concert',
        sample: {
            eventName: 'Malam Muzik Nusantara', eventSubtitle: 'Satu malam penuh irama, lampu & memori.',
            eventDescription: 'Nikmati persembahan langsung artis tempatan dalam satu malam yang tak dilupakan.',
            organizer: 'Nusantara Live', venueName: 'Dewan Filharmonik, KLCC', venueAddress: 'Jalan Ampang, 50088 Kuala Lumpur',
            dateLabel: 'Sabtu, 20 Disember 2026', timeLabel: '8:00 malam',
            program: [{ time: '20:00', title: 'Ketibaan tetamu' }, { time: '20:30', title: 'Persembahan utama' }, { time: '22:30', title: 'Encore' }],
            customFields: [{ label: 'Kod pakaian', value: 'Smart casual' }, { label: 'Umur', value: '18 tahun ke atas' }],
        },
    },
    openhouse: {
        chip: 'Rumah Terbuka', cta: 'rsvp', art: 'openhouse',
        sample: {
            eventName: 'Rumah Terbuka Aidilfitri', eventSubtitle: 'Pintu kami terbuka — datanglah beramai-ramai.',
            eventDescription: 'Dengan penuh kesyukuran, kami menjemput Dato\' / Datin / Tuan / Puan seisi keluarga hadir ke rumah terbuka kami.',
            organizer: 'Keluarga Ahmad', venueName: 'No. 12, Jalan Mawar', venueAddress: 'Taman Seri Indah, 43000 Kajang, Selangor',
            dateLabel: 'Sabtu, 20 Disember 2026', timeLabel: '11 pagi – 5 petang',
            program: [],
            customFields: [{ label: 'Aturan', value: 'Datang bila-bila masa' }, { label: 'Juadah', value: 'Nasi beriani, rendang, kuih raya' }],
        },
    },
    birthday: {
        chip: 'Hari Jadi', cta: 'rsvp', art: 'birthday',
        sample: {
            eventName: 'Hari Jadi Adam', eventSubtitle: 'Jom raikan hari istimewa penuh ceria!',
            eventDescription: 'Kek, permainan dan gelak tawa menanti — sertai kami meraikan hari jadi si manja.',
            organizer: 'Keluarga Adam', venueName: 'Kidz Fun Park', venueAddress: 'Lot 5, Pusat Beli-belah Ceria, Shah Alam',
            dateLabel: 'Sabtu, 20 Disember 2026', timeLabel: '3 – 6 petang',
            program: [],
            customFields: [{ label: 'Tema', value: 'Superhero' }, { label: 'Umur', value: 'Menyambut 7 tahun' }],
        },
    },
    aqiqah: {
        chip: 'Aqiqah', cta: 'rsvp', art: 'aqiqah',
        sample: {
            eventName: 'Aqiqah & Cukur Jambul', eventSubtitle: 'Kesyukuran atas kurniaan cahaya mata.',
            eventDescription: 'Dengan penuh kesyukuran, kami menjemput tuan/puan ke majlis aqiqah & cukur jambul cahaya mata kami.',
            organizer: 'Keluarga Kamarul', venueName: 'Surau An-Nur', venueAddress: 'Taman Damai, 68000 Ampang, Selangor',
            dateLabel: 'Ahad, 21 Disember 2026', timeLabel: '10 pagi',
            program: [{ time: '10:00', title: 'Bacaan doa & marhaban' }, { time: '10:30', title: 'Cukur jambul' }, { time: '11:00', title: 'Jamuan' }],
            customFields: [{ label: 'Nama cahaya mata', value: 'Muhammad Adam' }],
        },
    },
    corporate: {
        chip: 'Majlis Rasmi', cta: 'register', art: 'corporate',
        sample: {
            eventName: 'Majlis Perasmian', eventSubtitle: 'Sertai kami di majlis rasmi tahunan.',
            eventDescription: 'Satu majlis rasmi menghimpunkan rakan industri, ucaptama & sesi rangkaian.',
            organizer: 'Syarikat XYZ Sdn Bhd', venueName: 'Sunway Convention Centre', venueAddress: 'Persiaran Lagoon, Bandar Sunway, Selangor',
            dateLabel: 'Isnin, 22 Disember 2026', timeLabel: '9 pagi – 1 petang',
            program: [{ time: '09:00', title: 'Pendaftaran' }, { time: '09:30', title: 'Ucaptama' }, { time: '10:30', title: 'Majlis perasmian' }, { time: '12:00', title: 'Jamuan & rangkaian' }],
            customFields: [{ label: 'Kod pakaian', value: 'Formal / lounge suit' }],
        },
    },
    gala: {
        chip: 'Gala', cta: 'tickets', art: 'gala',
        sample: {
            eventName: 'Malam Gala Amal', eventSubtitle: 'Malam anggun untuk tujuan mulia.',
            eventDescription: 'Sertai kami di malam gala amal — jamuan istimewa, persembahan & lelongan amal.',
            organizer: 'Yayasan Harapan', venueName: 'Grand Ballroom', venueAddress: 'Hotel Majestic, Kuala Lumpur',
            dateLabel: 'Sabtu, 20 Disember 2026', timeLabel: '7:30 malam',
            program: [{ time: '19:30', title: 'Karpet merah' }, { time: '20:00', title: 'Jamuan malam' }, { time: '21:30', title: 'Lelongan amal' }],
            customFields: [{ label: 'Kod pakaian', value: 'Black tie' }],
        },
    },
};

export function eventTypeInfo(key: string | undefined): EventTypeInfo {
    return EVENT_TYPES[(key as EventTypeKey)] ?? EVENT_TYPES.concert;
}

/** Normalise a stored/typed value to a known event-type key (case-insensitive),
 *  or undefined if it's a free-text label like "Seminar". */
export function normEventType(v: string | undefined | null): EventTypeKey | undefined {
    if (!v) return undefined;
    const k = v.trim().toLowerCase();
    return (Object.prototype.hasOwnProperty.call(EVENT_TYPES, k)) ? (k as EventTypeKey) : undefined;
}

/** All type keys in a stable display order (for editor selects). */
export const EVENT_TYPE_KEYS: EventTypeKey[] = ['concert', 'gala', 'birthday', 'openhouse', 'aqiqah', 'corporate'];

/** Trilingual editor labels for the type picker. */
export const EVENT_TYPE_LABELS: Record<EventTypeKey, { bm: string; en: string; zh: string }> = {
    concert: { bm: 'Konsert', en: 'Concert', zh: '音乐会' },
    gala: { bm: 'Gala / Jamuan', en: 'Gala Dinner', zh: '晚宴' },
    birthday: { bm: 'Hari Jadi', en: 'Birthday', zh: '生日会' },
    openhouse: { bm: 'Rumah Terbuka', en: 'Open House', zh: '开放日' },
    aqiqah: { bm: 'Aqiqah / Cukur Jambul', en: 'Aqiqah', zh: '满月剃发' },
    corporate: { bm: 'Majlis Rasmi / Korporat', en: 'Corporate / Official', zh: '企业活动' },
};

/** Per-type suggested custom-field labels — quick-add scaffolding in the editor.
 *  They pre-fill a flexible {label, value} row; the host still edits freely. */
export const EVENT_FIELD_SUGGESTIONS: Record<EventTypeKey, { bm: string; en: string; zh: string }[]> = {
    concert: [
        { bm: 'Barisan Persembahan', en: 'Line-up', zh: '演出阵容' },
        { bm: 'Kod Pakaian', en: 'Dress code', zh: '着装要求' },
        { bm: 'Pintu Dibuka', en: 'Doors open', zh: '入场时间' },
        { bm: 'Harga Tiket', en: 'Ticket price', zh: '票价' },
    ],
    gala: [
        { bm: 'Kod Pakaian', en: 'Dress code', zh: '着装要求' },
        { bm: 'Nombor Meja', en: 'Table', zh: '桌号' },
        { bm: 'Pintu Dibuka', en: 'Doors open', zh: '入场时间' },
        { bm: 'Sumbangan', en: 'Contribution', zh: '捐款' },
    ],
    birthday: [
        { bm: 'Tema', en: 'Theme', zh: '主题' },
        { bm: 'Senarai Hadiah (pautan)', en: 'Gift registry (link)', zh: '礼物清单（链接）' },
        { bm: 'Sambutan Ke', en: 'Turning', zh: '岁数' },
        { bm: 'Warna Tema', en: 'Dress colour', zh: '主题色' },
    ],
    openhouse: [
        { bm: 'Waktu Terbuka', en: 'Open hours', zh: '开放时间' },
        { bm: 'Tempat Letak Kereta', en: 'Parking', zh: '停车' },
        { bm: 'Menu', en: 'Menu', zh: '菜单' },
        { bm: 'RSVP Sebelum', en: 'RSVP by', zh: '回复截止' },
    ],
    aqiqah: [
        { bm: 'Nama Cahaya Mata', en: "Baby's name", zh: '宝宝姓名' },
        { bm: 'Tarikh Lahir', en: 'Date of birth', zh: '出生日期' },
        { bm: 'Berat & Panjang', en: 'Weight & length', zh: '体重身长' },
        { bm: 'Tema', en: 'Theme', zh: '主题' },
    ],
    corporate: [
        { bm: 'Atur Cara', en: 'Agenda', zh: '议程' },
        { bm: 'Kod Pakaian', en: 'Dress code', zh: '着装要求' },
        { bm: 'Daftar Sebelum', en: 'Register by', zh: '报名截止' },
        { bm: 'Penginapan', en: 'Accommodation', zh: '住宿' },
    ],
};

/* ------------------------- per-type hero art ------------------------- */

/** Recognisable hero motif per event type — inline SVG, recoloured from accent. */
export function EventTypeArt({ type, accent, accent2, ink }: { type: EventTypeKey; accent: string; accent2: string; ink: string }): ReactNode {
    const wrap = { width: 'min(58%, 220px)', margin: '0 auto', display: 'block' } as const;
    switch (type) {
        case 'openhouse':
            // Two hanging ketupat (woven diamonds).
            return (
                <svg viewBox="0 0 200 120" style={wrap} aria-hidden>
                    {[60, 140].map((cx, i) => (
                        <g key={i} transform={`translate(${cx},${20 + i * 6})`}>
                            <line x1="0" y1="-18" x2="0" y2="0" stroke={hexA(ink, 0.5)} strokeWidth="1.5" />
                            <g transform="rotate(45)">
                                <rect x="-22" y="-22" width="44" height="44" rx="4" fill={hexA(accent, 0.18)} stroke={accent} strokeWidth="2" />
                                <path d="M-22 -8 L22 -8 M-22 8 L22 8 M-8 -22 L-8 22 M8 -22 L8 22" stroke={hexA(accent2, 0.8)} strokeWidth="1.4" />
                            </g>
                        </g>
                    ))}
                </svg>
            );
        case 'birthday':
            // Tiered cake with candles + a couple of balloons.
            return (
                <svg viewBox="0 0 200 150" style={wrap} aria-hidden>
                    <circle cx="42" cy="30" r="16" fill={hexA(accent, 0.7)} /><line x1="42" y1="46" x2="52" y2="86" stroke={hexA(ink, 0.4)} strokeWidth="1.3" />
                    <circle cx="166" cy="26" r="14" fill={hexA(accent2, 0.7)} /><line x1="166" y1="40" x2="152" y2="82" stroke={hexA(ink, 0.4)} strokeWidth="1.3" />
                    {[86, 100, 114].map((x) => (<g key={x}><line x1={x} y1="52" x2={x} y2="70" stroke={accent2} strokeWidth="2.4" /><circle cx={x} cy="49" r="4" fill={accent} /></g>))}
                    <rect x="72" y="70" width="56" height="22" rx="4" fill={hexA(accent, 0.85)} />
                    <rect x="62" y="92" width="76" height="30" rx="5" fill={accent} />
                    <path d="M62 100 q10 8 19 0 q10 8 19 0 q10 8 19 0 q10 8 19 0" fill="none" stroke={hexA('#ffffff', 0.6)} strokeWidth="2" />
                </svg>
            );
        case 'aqiqah':
            // Crescent + star (soft, gentle).
            return (
                <svg viewBox="0 0 200 120" style={wrap} aria-hidden>
                    <path d="M118 20 a40 40 0 1 0 0 80 a30 30 0 1 1 0 -80 Z" fill={hexA(accent, 0.85)} />
                    <path d="M150 34 l4 10 11 1 -8 8 2 11 -9 -6 -9 6 2 -11 -8 -8 11 -1 Z" fill={accent2} />
                </svg>
            );
        case 'corporate':
            // Ribbon-cut / rising bars.
            return (
                <svg viewBox="0 0 200 120" style={wrap} aria-hidden>
                    {[[70, 60], [100, 42], [130, 24]].map(([x, y], i) => (<rect key={i} x={x} y={y} width="22" height={100 - y} rx="3" fill={i === 2 ? accent : hexA(accent, 0.55)} />))}
                    <line x1="40" y1="100" x2="170" y2="100" stroke={hexA(ink, 0.5)} strokeWidth="2" />
                    <path d="M46 40 l14 8 -14 8 Z" fill={accent2} />
                </svg>
            );
        case 'gala':
            // Champagne flutes + sparkle.
            return (
                <svg viewBox="0 0 200 120" style={wrap} aria-hidden>
                    {[80, 120].map((x, i) => (
                        <g key={i} transform={`rotate(${i ? 12 : -12} ${x} 60)`}>
                            <path d={`M${x - 12} 24 L${x + 12} 24 L${x + 4} 60 L${x - 4} 60 Z`} fill={hexA(accent, 0.8)} />
                            <line x1={x} y1="60" x2={x} y2="96" stroke={accent} strokeWidth="2" /><line x1={x - 10} y1="96" x2={x + 10} y2="96" stroke={accent} strokeWidth="2" />
                        </g>
                    ))}
                    <path d="M150 20 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 Z" fill={accent2} />
                </svg>
            );
        default: // concert — equaliser bars + note
            return (
                <svg viewBox="0 0 200 120" style={wrap} aria-hidden>
                    {[50, 70, 90, 110, 130, 150].map((x, i) => { const h = [40, 68, 30, 80, 50, 62][i]; return <rect key={x} x={x} y={100 - h} width="12" height={h} rx="4" fill={i % 2 ? hexA(accent2, 0.8) : accent} />; })}
                </svg>
            );
    }
}
