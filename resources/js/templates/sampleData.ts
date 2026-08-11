import type { InvitationData } from './types';

// Demo content used by template previews and the gallery.
export const SAMPLE_INVITATION: InvitationData = {
    groomName: 'Muhammad Danial',
    brideName: 'Nur Aisyah',
    groomShort: 'Danial',
    brideShort: 'Aisyah',
    groomParents: 'Bin Encik Ahmad Faizal & Puan Rohana',
    brideParents: 'Binti Encik Kamarul & Puan Zaleha',
    openingLine:
        'Dengan penuh kesyukuran, kami menjemput Dato’ / Datin / Tuan / Puan / Encik / Cik ke majlis perkahwinan anakanda kami',
    bismillah: true,
    akadAt: '2026-12-12T10:00:00',
    receptionAt: '2026-12-12T12:00:00',
    dateLabel: 'Sabtu, 12 Disember 2026',
    timeLabel: '12:00 tengah hari – 4:00 petang',
    hijriLabel: '22 Jamadilakhir 1448H',
    venueName: 'Dewan Seri Melati',
    venueAddress: 'Jalan Mawar 3, Taman Indah, 43000 Kajang, Selangor',
    mapsUrl: 'https://maps.google.com/?q=Dewan+Seri+Melati+Kajang',
    wazeUrl: 'https://waze.com/ul?q=Dewan%20Seri%20Melati%20Kajang',
    program: [
        { time: '11:00 pagi', title: 'Ketibaan Tetamu' },
        { time: '12:00 t/hari', title: 'Ketibaan Pengantin' },
        { time: '12:30 petang', title: 'Jamuan Makan Beradab' },
        { time: '2:00 petang', title: 'Sesi Bergambar' },
        { time: '4:00 petang', title: 'Majlis Bersurai' },
    ],
    contacts: [
        { name: 'Encik Ahmad Faizal', role: 'Bapa Pengantin Lelaki', phone: '+60123456789' },
        { name: 'Puan Zaleha', role: 'Ibu Pengantin Perempuan', phone: '+60198765432' },
    ],
    gift: {
        bankName: 'Maybank',
        accountName: 'Muhammad Danial',
        accountNo: '1234 5678 9012',
        note: 'Sumbangan & doa restu amatlah dihargai 🤍',
    },
    galleryImages: [],
    palette: {
        primary: '#5b3a2e',
        secondary: '#8a6d5f',
        accent: '#c9a24b',
        bg: '#f6efe6',
        text: '#4a3b33',
    },
};
