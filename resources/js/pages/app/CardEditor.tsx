import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { NumberInput } from '../../components/NumberInput';
import {
    ArrowLeft, Save, ExternalLink, Plus, Trash2, Check, Users, Armchair, Lock,
    MoreHorizontal, Send, PenLine, ChevronUp, ChevronDown,
    FileText, MapPin, CalendarClock, Phone, Wallet, Gift, Images, ListOrdered, MailCheck,
    Loader2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { url as appUrl } from '../../lib/base';
import { MediaPanel } from '../../components/MediaPanel';
import { GiftQrField } from '../../components/GiftQrField';
import { LivePreview } from '../../components/LivePreview';
import { EditorSheet } from '../../components/EditorSheet';
import { useLang, dict } from '../../context/LangContext';
import { useAuth, can } from '../../context/AuthContext';
import { resolveSectionOrder, MOVABLE_SECTIONS } from '../../templates/PkSec';
import { loadAllCardFonts } from '../../lib/cardFonts';
import { FontPicker } from '../../components/FontPicker';
import { toTimeInputValue } from '../../lib/datetime';
import type { Palette, WishlistItem } from '../../templates/types';
import { EVENT_TYPE_KEYS, EVENT_TYPE_LABELS, EVENT_FIELD_SUGGESTIONS, normEventType } from '../../templates/eventTypes';

interface ProgramItem { time: string; title: string; }
interface Contact { name: string; role?: string; phone: string; }

/** One family's parents for the intro. `show` omits the absent/deceased parent. */
export interface ParentSide { father?: string; mother?: string; show?: 'both' | 'father' | 'mother'; }

/** Editor state — snake_case, mirrors the API. Exported so LivePreview can map it. */
export interface Inv {
    id: string; slug: string; template_key: string; status: 'draft' | 'published';
    /** Reseller "billed to": the client an affiliate made this card for (affiliate + reseller mode only). */
    client_name?: string | null;
    /** wedding (default) | event — decides which field set the editor shows. */
    kind?: string;
    event_type?: string; event_name?: string; event_subtitle?: string; event_description?: string; organizer?: string;
    custom_fields?: { label: string; value: string }[]; event_outro?: string;
    groom_name: string; bride_name: string; groom_short?: string; bride_short?: string;
    groom_parents?: string; bride_parents?: string; opening_line?: string; prayer?: string; bismillah: boolean;
    bismillah_text?: string; walimah_label?: string; hosts_intro?: string;
    parents?: { groom?: ParentSide; bride?: ParentSide };
    date_label?: string; time_label?: string; hijri_label?: string; akad_at?: string; reception_at?: string;
    venue_name?: string; venue_address?: string; maps_url?: string; waze_url?: string;
    program?: ProgramItem[]; contacts?: Contact[];
    gift?: { bankName?: string; accountName?: string; accountNo?: string; note?: string; qrUrl?: string };
    wishlist?: WishlistItem[];
    /** Guestbook display: horizontal carousel (default) or vertical scroller. */
    wishes_layout?: 'carousel' | 'list';
    rsvp_enabled: boolean;
    /** Flexible seating cap (0/null = uncapped, or governed by the table layout). */
    seat_limit?: number | null;
    /** Ticketed event (vendor only): charge guests per RSVP entry. */
    rsvp_pay_enabled?: boolean;
    rsvp_price?: number | null;
    rsvp_tax_percent?: number | null;
    /** Per-card optional-section switches (all default true). */
    sections?: Record<string, boolean>;
    /** Host-chosen order of the movable sections; null = the template's own. */
    section_order?: string[];
    /** Contact details the RSVP form asks a guest for. */
    rsvp_fields?: 'both' | 'email' | 'phone';
    /** Who is inviting — decides whose parents are named on the card. */
    invite_side?: InviteSide;
    /** Display font id from lib/cardFonts; null keeps the template's own. */
    font_id?: string | null;
    cover_image?: string | null;
    gallery_images?: string[] | null;
    music_url?: string | null;
    music_start?: number | null;
    music_end?: number | null;
    /** Decorative animation: a filename in public/lottie. */
    motion_file?: string | null;
    motion_tint?: boolean;
    palette?: Palette;
}
interface Tpl { id: string; key: string; name: string; base_key?: string | null; palette?: Record<string, string> | null; config?: import('../../templates/customConfig').CustomTemplateConfig | null; }

/**
 * Who the card is sent by. A Malay wedding card is issued by one side, by both,
 * or by two couples together, and that decides whose parents appear as hosts.
 */
const INVITE_SIDES = ['groom', 'bride', 'both_groom', 'both_bride', 'two_couples'] as const;
type InviteSide = (typeof INVITE_SIDES)[number];

type TabId = 'butiran' | 'lokasi' | 'atur' | 'hubungi' | 'gift' | 'hadiah' | 'media' | 'susunan' | 'rsvp';

/**
 * Editor tabs, in dock/rail order.
 *
 * `sectionKey` is what makes a tab switchable: the tab owns that section's
 * on/off state, so the switch lives in the tab's own header rather than in a
 * separate list the host has to go hunting for.
 */
const TABS: { id: TabId; sectionKey?: string; rsvp?: boolean }[] = [
    { id: 'butiran' },
    { id: 'lokasi', sectionKey: 'location' },
    { id: 'atur', sectionKey: 'program' },
    { id: 'hubungi', sectionKey: 'contacts' },
    { id: 'gift', sectionKey: 'gift' },
    { id: 'hadiah', sectionKey: 'wishlist' },
    { id: 'media', sectionKey: 'gallery' },
    { id: 'susunan' },
    { id: 'rsvp', rsvp: true },
];

const TAB_ICON: Record<TabId, ReactNode> = {
    butiran: <FileText size={19} />,
    lokasi: <MapPin size={19} />,
    atur: <CalendarClock size={19} />,
    hubungi: <Phone size={19} />,
    gift: <Wallet size={19} />,
    hadiah: <Gift size={19} />,
    media: <Images size={19} />,
    susunan: <ListOrdered size={19} />,
    rsvp: <MailCheck size={19} />,
};

/** Tailwind-free media-query hook. */
function useMedia(query: string): boolean {
    const [match, setMatch] = useState<boolean>(
        () => typeof window !== 'undefined' && window.matchMedia(query).matches,
    );
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = () => setMatch(mq.matches);
        on();
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, [query]);
    return match;
}

export function CardEditor() {
    const { id = '' } = useParams();
    const { lang } = useLang();
    const { user } = useAuth();
    // Table management is admin-configurable per role — gate on the seating feature, not on payment.
    const canSeat = can(user, 'seating');
    const [inv, setInv] = useState<Inv | null>(null);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    // Affiliate reseller mode (superadmin toggle) — unlocks the "billed-to client" field.
    const [resellerOn, setResellerOn] = useState(false);
    useEffect(() => { api.get<{ affiliate_reseller_enabled?: boolean }>('/settings').then((r) => setResellerOn(!!r.data?.affiliate_reseller_enabled)).catch(() => undefined); }, []);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveErr, setSaveErr] = useState<string | null>(null);
    // Autosave: JSON of the last-persisted card + a small status pill. Edits persist
    // automatically (debounced) so hosts never lose changes by forgetting to Save —
    // the previous behaviour, where typed details lived only in local state until a
    // manual Save, is exactly why edits "didn't reflect" on the published card.
    const lastSavedRef = useRef<string | null>(null);
    const [autoStatus, setAutoStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [openTab, setOpenTab] = useState<TabId | null>(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    // Wide screens get the three-pane editor (rail · form · live preview);
    // narrow ones keep the bottom dock and off-canvas sheets.
    const isWide = useMedia('(min-width: 1080px)');
    // The desktop rail always has a tab selected — there is nowhere to close to.
    const deskTab: TabId = openTab ?? 'butiran';

    // The picker renders each family in its own face, so they all have to be
    // present — but only in the editor, never on a guest's card.
    useEffect(() => { loadAllCardFonts(); }, []);

    useEffect(() => {
        Promise.all([api.get<Inv>(`/invitations/${id}`), api.get<Tpl[]>('/templates')])
            .then(([i, t]) => { lastSavedRef.current = JSON.stringify(i.data); setInv(i.data); setTemplates(t.data); });
    }, [id]);

    // Debounced autosave. Whenever the card differs from what was last persisted,
    // push it in the background 1.2s after the host stops editing. Background saves
    // never touch local state (so they can't clobber what's being typed) and don't
    // consume the per-card edit cap — only an explicit Save / Publish does.
    useEffect(() => {
        if (!inv || !id) return;
        const snap = JSON.stringify(inv);
        if (lastSavedRef.current === null) { lastSavedRef.current = snap; return; }
        if (snap === lastSavedRef.current) return;
        const t = window.setTimeout(async () => {
            setAutoStatus('saving');
            try {
                await api.put(`/invitations/${id}`, { ...inv, background: true });
                lastSavedRef.current = snap;
                setAutoStatus('saved');
                window.setTimeout(() => setAutoStatus((s) => (s === 'saved' ? 'idle' : s)), 1600);
            } catch {
                // A blocked/failed autosave leaves the card dirty; the manual Save
                // button will retry and surface the real error (e.g. edit cap).
                setAutoStatus('idle');
            }
        }, 1200);
        return () => window.clearTimeout(t);
    }, [inv, id]);

    // Overflow menu: close on outside click / Esc.
    useEffect(() => {
        if (!moreOpen) return;
        function onDoc(e: MouseEvent) {
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMoreOpen(false); }
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [moreOpen]);

    const C = dict({
        bm: {
            tabs: { butiran: 'Butiran', lokasi: 'Tarikh & Lokasi', atur: 'Atur Cara', hubungi: 'Hubungi', gift: 'Salam Kaut', hadiah: 'Senarai Hadiah', media: 'Galeri & Muzik', susunan: 'Susunan', rsvp: 'RSVP' } as Record<TabId, string>,
            sub: { butiran: 'Nama, keluarga & kata pembuka', lokasi: 'Tarikh, masa & lokasi majlis', atur: 'Perjalanan majlis mengikut waktu', hubungi: 'Nombor untuk dihubungi', gift: 'Maklumat akaun untuk salam kaut', hadiah: 'Senarai hadiah idaman', media: 'Gambar pembuka, galeri & lagu', susunan: 'Atur kedudukan setiap bahagian pada kad', rsvp: 'Benarkan tetamu sahkan kehadiran' } as Record<TabId, string>,
            sec: { opening: 'Kata Aluan', prayer: 'Doa', program: 'Atur Cara', location: 'Lokasi', wishes: 'Ucapan / Buku Tetamu', wishlist: 'Senarai Hadiah', contacts: 'Hubungi', gift: 'Salam Kaut', gallery: 'Galeri', rsvp: 'RSVP' } as Record<string, string>,
            published: 'Terbit', draft: 'Draf',
            guests: 'Tetamu & RSVP', tables: 'Susun Meja', openLive: 'Lihat Kad', more: 'Lagi',
            saveFailed: 'Perubahan belum berjaya disimpan. Sila cuba lagi.', dismiss: 'Tutup',
            setDraft: 'Tukar ke Draf', publish: 'Terbitkan Kad',
            saved: 'Siap disimpan', saving: 'Menyimpan…', save: 'Simpan', autoSaving: 'Menyimpan automatik…', autoSaved: 'Disimpan automatik',
            template: 'Rekaan',
            gCouple: 'Pengantin', gFamily: 'Keluarga', gOpening: 'Kata Aluan', gPrayer: 'Doa', gWhen: 'Tarikh & Masa', gWhere: 'Lokasi',
            evDetails: 'Butiran Acara', evName: 'Nama acara', evSubtitle: 'Tagline / sari kata', evType: 'Jenis acara', evTypePh: 'cth. Konsert, Gala, Seminar', evOrganizer: 'Dianjurkan oleh', evAbout: 'Mengenai acara (intro)', evPosterHint: 'Muat naik poster acara di tab "Galeri & Muzik" (Gambar Pembuka).',
            evCustom: 'Medan Tersuai', evCustomHint: 'Tambah apa-apa butiran acara anda sendiri — cth. "Kod Pakaian: Batik", "Tempat Letak Kereta: Aras B2", "RSVP sebelum: 10 Dis". Setiap medan (tajuk + nilai) akan dipaparkan pada kad. Fleksibel sepenuhnya.', evAddField: 'Tambah Medan Tersuai', evFieldLabel: 'Tajuk (cth. Kod Pakaian)', evFieldValue: 'Nilai (cth. Batik / Formal)',
            evOutroLabel: 'Penutup (outro)', evOutroPh: 'cth. Kehadiran anda amat kami hargai. Jumpa di sana!',
            groomName: 'Nama penuh pengantin lelaki', brideName: 'Nama penuh pengantin perempuan',
            groomShort: 'Nama panggilan pengantin lelaki', brideShort: 'Nama panggilan pengantin perempuan',
            groomParents: 'Ibu bapa pengantin lelaki', brideParents: 'Ibu bapa pengantin perempuan',
            pFather: 'Nama ayah', pMother: 'Nama ibu',
            pmLabel: 'Papar ibu bapa',
            pmCouple: 'Ibu Bapa Pengantin', pmBoth: 'Ibu Bapa Pengantin & Ibu Bapa Pasangan',
            pmMother: 'Ibu Pengantin Sahaja (Jika Ayah Meninggal Dunia)', pmFather: 'Bapa Pengantin Sahaja (Jika Ibu Meninggal Dunia)',
            hostsIntro: 'Kata alu-aluan (di atas nama ibu bapa)', hostsIntroHint: 'cth. “Assalamualaikum W.B.T & Salam Sejahtera…”. Kosongkan untuk menyembunyikannya.',
            walimahLabel: 'Tajuk jemputan', walimahHint: 'cth. “Jemputan Walimatulurus”. Kosongkan untuk menyembunyikannya.',
            bismillahCustom: 'Teks Bismillah tersuai (pilihan)', bismillahCustomHint: 'Biarkan kosong untuk guna kaligrafi Bismillah lalai.',
            opening: 'Kata pembuka', prayer: 'Teks doa', prayerHint: 'Dipaparkan sebelum kira detik. Baris bermula dengan # (cth. #AdamHawa) dipaparkan dalam warna aksen.', showBismillah: 'Paparkan Bismillah',
            font: 'Gaya tulisan', fontDefault: 'Ikut rekaan',
            fontHint: 'Menukar tulisan tajuk pada kad. Pilih “Ikut rekaan” untuk kekalkan tulisan asal templat.',
            fontSerif: 'Klasik', fontScript: 'Tulisan Tangan', fontDisplay: 'Paparan', fontSans: 'Moden',
            inviteSide: 'Pihak menjemput',
            inviteSideHint: 'Menentukan nama keluarga siapa yang dipaparkan pada kad.',
            side: {
                groom: 'Belah Pengantin Lelaki',
                bride: 'Belah Pengantin Perempuan',
                both_groom: 'Kedua-dua Belah Pihak (Lelaki)',
                both_bride: 'Kedua-dua Belah Pihak (Perempuan)',
                two_couples: 'Dua Pasangan',
            } as Record<InviteSide, string>,
            dateLabel: 'Paparan tarikh', dateSample: 'Sabtu, 12 Disember 2026',
            timeLabel: 'Paparan masa', timeSample: '12:00 tengah hari – 4:00 petang',
            hijri: 'Tarikh Hijrah', akadDT: 'Akad Nikah (tarikh & masa)', receptionDT: 'Majlis / Resepsi (untuk kira detik)',
            venueName: 'Nama lokasi', address: 'Alamat penuh',
            mapsLink: 'Pautan Google Maps', wazeLink: 'Pautan Waze',
            mapsHint: 'Tampal pautan Google Maps lokasi anda untuk paparan peta & pin yang tepat.',
            programHint: 'Susun perjalanan majlis mengikut waktu.',
            time: 'Waktu', event: 'Acara', addRow: 'Tambah baris',
            timeFreeform: 'Waktu ini ditaip sendiri. Padamkan dan taip semula untuk guna pemilih waktu.',
            programTimeHint: 'Waktu dipaparkan mengikut bahasa tetamu — 14:00 menjadi “2:00 petang”.',
            name: 'Nama', role: 'Hubungan / peranan', addContact: 'Tambah nombor',
            bankName: 'Nama bank', accountName: 'Nama pemilik akaun', accountNo: 'No. akaun',
            note: 'Nota ringkas',
            giftRegistryHint: 'Senaraikan hadiah yang anda idamkan. Tetamu boleh lihat & tempah sebagai tanda ingatan.',
            wishTitle: 'Tajuk hadiah', wishNote: 'Nota (pilihan)', wishUrl: 'Pautan (pilihan)', addGift: 'Tambah hadiah',
            includeInCard: 'Papar dalam kad',
            orderHint: 'Naik atau turunkan setiap bahagian mengikut susunan yang anda mahu. Kulit kad, nama pengantin dan penutup kekal di tempatnya.',
            moveUp: 'Naik', moveDown: 'Turun', resetOrder: 'Pulihkan susunan asal',
            wishesLayout: 'Paparan Ucapan', wishesLayoutHint: 'Karusel = tatal mendatar; Senarai = tatal menegak dalam ruangannya sendiri (bar tatal ikut tema kad).', wishesCarousel: 'Karusel (mendatar)', wishesList: 'Senarai (menegak)',
            off: 'dimatikan',
            allowRsvp: 'Benarkan tetamu RSVP',
            rsvpDesc: 'Apabila dihidupkan, butang RSVP akan muncul pada kad. Tetamu boleh sahkan kehadiran terus dari telefon mereka.',
            manageGuests: 'Urus tetamu & senarai RSVP',
            rsvpFields: 'Butiran tetamu yang diminta',
            rsvpBoth: 'E-mel & telefon', rsvpEmail: 'E-mel sahaja', rsvpPhone: 'Telefon sahaja',
            rsvpFieldsHint: 'Medan yang dipilih adalah wajib diisi oleh tetamu.',
            rsvpEmailLocked: 'E-mel diperlukan kerana kad ini menggunakan susun meja — pautan tempat duduk dihantar melalui e-mel.',
            sectionsNav: 'Bahagian kad',
        },
        en: {
            tabs: { butiran: 'Details', lokasi: 'Date & Location', atur: 'Run of show', hubungi: 'Contacts', gift: 'Cash Gift', hadiah: 'Gift Registry', media: 'Gallery & Music', susunan: 'Order', rsvp: 'RSVP' } as Record<TabId, string>,
            sub: { butiran: 'Names, family & opening words', lokasi: 'Date, time & venue', atur: 'Run of show by time', hubungi: 'People to contact', gift: 'Bank details for cash gifts', hadiah: 'Your dream gift registry', media: 'Cover, gallery & music', susunan: 'Arrange where each section sits on the card', rsvp: 'Let guests confirm attendance' } as Record<TabId, string>,
            sec: { opening: 'Opening words', prayer: 'Prayer (Doa)', program: 'Run of show', location: 'Location', wishes: 'Wishes / Guestbook', wishlist: 'Gift Registry', contacts: 'Contacts', gift: 'Cash Gift', gallery: 'Gallery', rsvp: 'RSVP' } as Record<string, string>,
            published: 'Published', draft: 'Draft',
            guests: 'Guests', tables: 'Tables', openLive: 'Open live', more: 'More',
            saveFailed: 'Could not save your changes. Please try again.', dismiss: 'Dismiss',
            setDraft: 'Set as draft', publish: 'Publish',
            saved: 'Saved', saving: 'Saving…', save: 'Save', autoSaving: 'Autosaving…', autoSaved: 'Autosaved',
            template: 'Template',
            gCouple: 'The Couple', gFamily: 'Family', gOpening: 'Opening', gPrayer: 'Prayer (Doa)', gWhen: 'Date & Time', gWhere: 'Venue',
            evDetails: 'Event details', evName: 'Event name', evSubtitle: 'Tagline / subtitle', evType: 'Event type', evTypePh: 'e.g. Concert, Gala, Seminar', evOrganizer: 'Organized by', evAbout: 'About the event (intro)', evPosterHint: 'Upload the event poster in the "Gallery & Music" tab (Cover image).',
            evCustom: 'Custom fields', evCustomHint: 'Add any event detail you like — e.g. "Dress code: Batik", "Parking: Level B2", "RSVP by: 10 Dec". Each field (a label + value) shows on the card. Fully flexible — this is how you tailor an event card to your needs.', evAddField: 'Add custom field', evFieldLabel: 'Label (e.g. Dress code)', evFieldValue: 'Value (e.g. Batik / Formal)',
            evOutroLabel: 'Closing note (outro)', evOutroPh: 'e.g. We look forward to seeing you there!',
            groomName: "Groom's full name", brideName: "Bride's full name",
            groomShort: "Groom's short name", brideShort: "Bride's short name",
            groomParents: "Groom's parents", brideParents: "Bride's parents",
            pFather: "Father's name", pMother: "Mother's name",
            pmLabel: 'Parents shown',
            pmCouple: 'The host’s parents', pmBoth: 'Both families’ parents',
            pmMother: 'Mother only (if the father has passed away)', pmFather: 'Father only (if the mother has passed away)',
            hostsIntro: 'Greeting (above the parents)', hostsIntroHint: 'e.g. “Assalamualaikum W.B.T & Salam Sejahtera…”. Leave empty to hide it.',
            walimahLabel: 'Invitation heading', walimahHint: 'e.g. “Jemputan Walimatulurus”. Leave empty to hide it.',
            bismillahCustom: 'Custom Bismillah text (optional)', bismillahCustomHint: 'Leave blank to use the default Bismillah calligraphy.',
            opening: 'Opening words', prayer: 'Prayer text', prayerHint: 'Shown just before the countdown. A line starting with # (e.g. #AdamHawa) shows in the accent colour.', showBismillah: 'Show Bismillah',
            font: 'Display font', fontDefault: 'Match the design',
            fontHint: 'Changes the heading type on your card. “Match the design” keeps the template’s own.',
            fontSerif: 'Classic', fontScript: 'Script', fontDisplay: 'Display', fontSans: 'Modern',
            inviteSide: 'Inviting party',
            inviteSideHint: 'Decides whose family names appear on the card.',
            side: {
                groom: "Groom's side",
                bride: "Bride's side",
                both_groom: "Both sides (groom's first)",
                both_bride: "Both sides (bride's first)",
                two_couples: 'Two couples',
            } as Record<InviteSide, string>,
            dateLabel: 'Date label', dateSample: 'Saturday, 12 December 2026',
            timeLabel: 'Time label', timeSample: '12:00 noon – 4:00 pm',
            hijri: 'Hijri date', akadDT: 'Akad Nikah (date & time)', receptionDT: 'Reception (used for countdown)',
            venueName: 'Venue name', address: 'Address',
            mapsLink: 'Google Maps link', wazeLink: 'Waze link',
            mapsHint: 'Paste your Google Maps link for an accurate map & pin.',
            programHint: 'Arrange the run of show by time.',
            time: 'Time', event: 'Event', addRow: 'Add row',
            timeFreeform: 'This time was typed by hand. Clear it to use the time picker.',
            programTimeHint: 'Times display in each guest’s language — 14:00 becomes “2:00 petang”.',
            name: 'Name', role: 'Role', addContact: 'Add contact',
            bankName: 'Bank name', accountName: 'Account holder name', accountNo: 'Account number',
            note: 'Note',
            giftRegistryHint: 'List the gifts you would love. Guests can view & reserve them as a token of remembrance.',
            wishTitle: 'Gift title', wishNote: 'Note (optional)', wishUrl: 'Link (optional)', addGift: 'Add gift',
            includeInCard: 'Show on card',
            orderHint: 'Move each section into the order you want. The cover, the couple block and the footer stay where they are.',
            moveUp: 'Move up', moveDown: 'Move down', resetOrder: 'Reset to the default order',
            wishesLayout: 'Wishes (Ucapan) layout', wishesLayoutHint: 'Carousel = horizontal scroll; List = vertical scroll in its own section (with a card-themed scrollbar).', wishesCarousel: 'Carousel (horizontal)', wishesList: 'List (vertical)',
            off: 'off',
            allowRsvp: 'Allow guests to RSVP',
            rsvpDesc: 'When on, an RSVP button appears on the card. Guests can confirm attendance right from their phone.',
            manageGuests: 'Manage guests & RSVP list',
            rsvpFields: 'Guest details to collect',
            rsvpBoth: 'Email & phone', rsvpEmail: 'Email only', rsvpPhone: 'Phone only',
            rsvpFieldsHint: 'Whatever you choose is required — a guest cannot skip it.',
            rsvpEmailLocked: 'Email is required because this card uses seating — the seat link is delivered by email.',
            sectionsNav: 'Card sections',
        },
        zh: {
            tabs: { butiran: '基本资料', lokasi: '日期与地点', atur: '婚礼流程', hubungi: '联络人', gift: '礼金', hadiah: '礼物清单', media: '相册与音乐', susunan: '版块顺序', rsvp: '出席回复' } as Record<TabId, string>,
            sub: { butiran: '姓名、家庭与开场语', lokasi: '日期、时间与场地', atur: '按时间安排流程', hubungi: '可联络的人', gift: '收取礼金的银行资料', hadiah: '您心仪的礼物清单', media: '封面、相册与音乐', susunan: '调整各版块在请柬上的位置', rsvp: '让宾客确认出席' } as Record<TabId, string>,
            sec: { opening: '开场语', prayer: '祈祷文', program: '婚礼流程', location: '地点', wishes: '祝福 / 留言簿', wishlist: '礼物清单', contacts: '联络人', gift: '礼金', gallery: '相册', rsvp: '出席回复' } as Record<string, string>,
            published: '已发布', draft: '草稿',
            guests: '宾客', tables: '座位安排', openLive: '查看请柬', more: '更多',
            saveFailed: '更改保存失败，请重试。', dismiss: '关闭',
            setDraft: '转为草稿', publish: '发布请柬',
            saved: '已保存', saving: '保存中…', save: '保存', autoSaving: '自动保存中…', autoSaved: '已自动保存',
            template: '设计',
            gCouple: '新人', gFamily: '家庭', gOpening: '开场语', gPrayer: '祈祷文', gWhen: '日期与时间', gWhere: '场地',
            evDetails: '活动详情', evName: '活动名称', evSubtitle: '标语 / 副标题', evType: '活动类型', evTypePh: '例如 演唱会、晚宴、研讨会', evOrganizer: '主办方', evAbout: '活动介绍（开场）', evPosterHint: '在「相册与音乐」标签上传活动海报（封面图片）。',
            evCustom: '自定义字段', evCustomHint: '添加任意活动信息——例如「着装：Batik」「停车：B2 层」「回复截止：12月10日」。每个字段（标题+内容）都会显示在请柬上。完全灵活——按需定制活动请柬。', evAddField: '添加自定义字段', evFieldLabel: '标题（例如 着装）', evFieldValue: '内容（例如 Batik / 正装）',
            evOutroLabel: '结束语（outro）', evOutroPh: '例如 期待与您相见！',
            groomName: '男方全名', brideName: '女方全名',
            groomShort: '男方昵称', brideShort: '女方昵称',
            groomParents: '男方父母', brideParents: '女方父母',
            pFather: '父亲姓名', pMother: '母亲姓名',
            pmLabel: '显示父母',
            pmCouple: '新人父母', pmBoth: '新人父母及对方父母',
            pmMother: '仅母亲（若父亲已故）', pmFather: '仅父亲（若母亲已故）',
            hostsIntro: '问候语（父母姓名上方）', hostsIntroHint: '例如 “Assalamualaikum W.B.T & Salam Sejahtera…”。留空则隐藏。',
            walimahLabel: '请柬标题', walimahHint: '例如 “Jemputan Walimatulurus”。留空则隐藏。',
            bismillahCustom: '自定义 Bismillah 文本（可选）', bismillahCustomHint: '留空则使用默认 Bismillah 书法。',
            opening: '开场语', prayer: '祈祷文', prayerHint: '显示在倒计时之前。以 # 开头的行（如 #AdamHawa）会以强调色显示。', showBismillah: '显示 Bismillah',
            font: '标题字体', fontDefault: '跟随设计',
            fontHint: '更改请柬标题的字体。“跟随设计”保留模板原本的字体。',
            fontSerif: '经典', fontScript: '手写', fontDisplay: '展示', fontSans: '现代',
            inviteSide: '邀请方',
            inviteSideHint: '决定请柬上显示哪一方的家庭姓名。',
            side: {
                groom: '男方',
                bride: '女方',
                both_groom: '双方（男方在前）',
                both_bride: '双方（女方在前）',
                two_couples: '两对新人',
            } as Record<InviteSide, string>,
            dateLabel: '日期显示文字', dateSample: '2026年12月12日 星期六',
            timeLabel: '时间显示文字', timeSample: '中午 12:00 – 下午 4:00',
            hijri: '回历日期', akadDT: '证婚仪式（日期与时间）', receptionDT: '婚宴（用于倒计时）',
            venueName: '场地名称', address: '详细地址',
            mapsLink: 'Google 地图链接', wazeLink: 'Waze 链接',
            mapsHint: '粘贴您的 Google 地图链接，以显示准确的地图与定位。',
            programHint: '按时间顺序安排婚礼流程。',
            time: '时间', event: '环节', addRow: '添加一行',
            timeFreeform: '此时间为手动输入。清空后即可使用时间选择器。',
            programTimeHint: '时间会按宾客的语言显示 — 14:00 显示为“下午2:00”。',
            name: '姓名', role: '身份', addContact: '添加联络人',
            bankName: '银行名称', accountName: '账户名称', accountNo: '账号',
            note: '备注',
            giftRegistryHint: '列出您心仪的礼物。宾客可以浏览并预订，作为一份心意。',
            wishTitle: '礼物名称', wishNote: '备注（可选）', wishUrl: '链接（可选）', addGift: '添加礼物',
            includeInCard: '显示在请柬上',
            orderHint: '将各版块调整到您想要的顺序。封面、新人版块与页尾保持不变。',
            moveUp: '上移', moveDown: '下移', resetOrder: '恢复默认顺序',
            wishesLayout: '祝福展示方式', wishesLayoutHint: '轮播 = 水平滚动；列表 = 在自己的区域内垂直滚动（滚动条随请柬主题）。', wishesCarousel: '轮播（水平）', wishesList: '列表（垂直）',
            off: '已关闭',
            allowRsvp: '允许宾客回复出席',
            rsvpDesc: '开启后，请柬上会出现出席回复按钮，宾客可直接用手机确认出席。',
            manageGuests: '管理宾客与出席名单',
            rsvpFields: '需要收集的宾客资料',
            rsvpBoth: '邮箱与电话', rsvpEmail: '仅邮箱', rsvpPhone: '仅电话',
            rsvpFieldsHint: '所选字段为必填，宾客无法跳过。',
            rsvpEmailLocked: '本请柬使用座位安排，座位链接通过邮件发送，因此必须收集邮箱。',
            sectionsNav: '请柬版块',
        },
    }, lang);

    if (!inv) return <div className="loading-screen"><div className="spinner" /></div>;

    const set = (patch: Partial<Inv>) => setInv({ ...inv, ...patch });

    async function save(extra: Partial<Inv> = {}) {
        setSaving(true);
        setSaveErr(null);
        const payload = { ...inv, ...extra };
        try {
            const r = await api.put<Inv>(`/invitations/${id}`, payload);
            setInv(r.data);
            lastSavedRef.current = JSON.stringify(r.data);
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
        } catch (e) {
            // Surface a blocked save (e.g. the per-card edit limit) instead of failing silently.
            const err = e as { response?: { data?: { message?: string } } };
            setSaveErr(err?.response?.data?.message ?? C.saveFailed);
        } finally {
            setSaving(false);
        }
    }

    const secOn = (key: string): boolean => inv.sections?.[key] ?? true;
    // Toggle a section: optimistic local update (instant preview) + persist.
    function setSection(key: string, val: boolean) {
        const next = { ...(inv!.sections ?? {}), [key]: val };
        set({ sections: next });
        void save({ sections: next });
    }
    // Seating is a role feature, so the constraint lives with the host, not
    // the card: any host who can seat guests must collect an email.
    const seats = canSeat;
    const fieldSet: 'both' | 'email' | 'phone' =
        seats && inv.rsvp_fields === 'phone' ? 'both' : (inv.rsvp_fields ?? 'both');

    function setRsvpFields(val: 'both' | 'email' | 'phone') {
        if (val === 'phone' && seats) return;
        set({ rsvp_fields: val });
        void save({ rsvp_fields: val });
    }

    function setRsvp(val: boolean) {
        set({ rsvp_enabled: val });
        void save({ rsvp_enabled: val });
    }

    // Pay-per-entry (vendor ticketed events) — only offered when the master switch
    // is on for this account (can_pay_per_entry from the auth payload).
    const canPay = !!user?.can_pay_per_entry;
    const setPayEnabled = (val: boolean) => { set({ rsvp_pay_enabled: val }); void save({ rsvp_pay_enabled: val }); };
    const payPrice = Number(inv.rsvp_price ?? 0);
    const payT = dict({
        bm: {
            title: 'Bayaran setiap kehadiran', hint: 'Caj tetamu untuk sahkan kehadiran (majlis berbayar).',
            price: 'Harga sekepala (RM)',
            guestPays: 'Tetamu bayar', perPax: 'seorang', note: 'Bayaran masuk ke platform dahulu. Caj platform (komisen, yuran FPX) ditolak dan baki dibayar kepada anda. Jumlah bersih anda dipaparkan di halaman Bayaran.',
        },
        en: {
            title: 'Charge per entry', hint: 'Charge guests to confirm attendance (ticketed event).',
            price: 'Price per person (RM)',
            guestPays: 'Guest pays', perPax: 'per person', note: 'Payment goes to the platform first. Platform charges (commission, FPX fee) are deducted and the balance is paid out to you. Your net is shown on the Payments page.',
        },
        zh: {
            title: '按人收费', hint: '向宾客收取出席费用（售票活动）。',
            price: '每人价格（RM）',
            guestPays: '宾客支付', perPax: '每人', note: '款项先进入平台。平台费用（佣金、FPX 手续费）扣除后，余额支付给您。您的净额显示在「收款」页面。',
        },
    }, lang);
    const seatT = dict({
        bm: { title: 'Had tempat duduk', hint: 'Bilangan maksimum tetamu (0 = tiada had). RSVP akan ditutup apabila penuh. Jika anda menyusun meja, jumlah kerusi meja digunakan.' },
        en: { title: 'Seat limit', hint: 'Maximum guests (0 = unlimited). RSVP closes when full. If you build a table layout, its total seats are used instead.' },
        zh: { title: '座位上限', hint: '最多宾客人数（0 = 不限）。满员后停止 RSVP。若已排桌，则以餐桌总座位为准。' },
    }, lang);

    /** RSVP has its own column; everything else lives in the sections bag. */
    const sectionShown = (key: string): boolean => (key === 'rsvp' ? inv!.rsvp_enabled : secOn(key));
    const setSectionShown = (key: string, val: boolean) => (key === 'rsvp' ? setRsvp(val) : setSection(key, val));

    const side: InviteSide = inv.invite_side ?? 'two_couples';

    const order = resolveSectionOrder(inv.section_order);

    /** Swap a section with its neighbour, then persist the whole order. */
    function moveSection(key: (typeof order)[number], dir: -1 | 1) {
        const next = [...order];
        const i = next.indexOf(key);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        set({ section_order: next });
        void save({ section_order: next });
    }

    function resetOrder() {
        const next = [...MOVABLE_SECTIONS];
        set({ section_order: next });
        void save({ section_order: next });
    }

    const tabOff = (t: (typeof TABS)[number]): boolean => {
        if (t.rsvp) return !inv.rsvp_enabled;
        if (t.sectionKey) return !secOn(t.sectionKey);
        return false;
    };

    /** The include-in-card switch a switchable tab shows in its own header. */
    function tabSwitch(t: (typeof TABS)[number]): ReactNode {
        const key = t.rsvp ? 'rsvp' : t.sectionKey;
        if (!key) return null;
        const on = sectionShown(key);
        return (
            <span className="pke-headtoggle">
                <span className="lbl">{C.includeInCard}</span>
                <Switch label={C.includeInCard} on={on} onChange={(v) => setSectionShown(key, v)} />
            </span>
        );
    }

    const isEvent = inv.kind === 'event';
    // The chosen template's own config type — used to default the type picker
    // when the host hasn't overridden it (a premade "birthday" design shows
    // "Birthday" selected, not "Other").
    const tplEventType = templates.find((t) => t.key === inv.template_key)?.config?.eventType;
    const customFields = inv.custom_fields ?? [];
    const program = inv.program ?? [];
    const contacts = inv.contacts ?? [];
    const wishlist = inv.wishlist ?? [];
    // Gift + registry tabs show for events too (e.g. a birthday wish-list). They
    // render on the card only when the host actually fills them, so they're
    // effectively off by default for events that don't need them.
    const visibleTabs = TABS;

    // Reseller "billed to" — only for an affiliate while reseller mode is on.
    const resellerField = (user?.role === 'affiliate' && resellerOn) ? (
        <div className="field" style={{ background: 'var(--cream)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <label>{dict({ bm: 'Nama pelanggan (Dibilkan kepada)', en: 'Client name (Billed to)', zh: '客户姓名（付款人）' }, lang)}</label>
            <input value={inv.client_name ?? ''} onChange={(e) => set({ client_name: e.target.value })} placeholder={dict({ bm: 'cth. Muhammad bin Isa', en: 'e.g. Muhammad bin Isa', zh: '例如：Muhammad bin Isa' }, lang)} />
            <small className="muted" style={{ marginTop: 6, display: 'block' }}>{dict({ bm: 'Nama ini akan muncul sebagai "Dibilkan kepada" pada resit — bukan nama anda.', en: 'This name appears as "Billed to" on the receipt — not yours.', zh: '此名称将作为收据上的“付款人”，而非你的名字。' }, lang)}</small>
        </div>
    ) : null;

    // ---- Tab bodies. Rendered inside a sheet on mobile, inline on desktop. ----
    const BODY: Record<TabId, ReactNode> = {
        butiran: isEvent ? (
            <>
                {resellerField}
                {/* Event (non-wedding) details — no couple, gift or bismillah. */}
                <div className="pke-glabel">{C.evDetails}</div>
                <Row label={C.evName} v={inv.event_name} on={(v) => set({ event_name: v })} />
                <Row label={C.evSubtitle} v={inv.event_subtitle} on={(v) => set({ event_subtitle: v })} />
                {/* Structured event type — drives the design (hero art, theme, CTA)
                    and surfaces per-type quick-add fields below. "Other" keeps a
                    free-text label for the long tail (seminar, workshop, …). */}
                {(() => {
                    const known = normEventType(inv.event_type);
                    const sel: string = known ?? normEventType(tplEventType) ?? 'other';
                    return (
                        <div className="field">
                            <label>{C.evType}</label>
                            <select style={inpS} value={sel} onChange={(e) => set({ event_type: e.target.value === 'other' ? '' : e.target.value })}>
                                {EVENT_TYPE_KEYS.map((k) => (
                                    <option key={k} value={k}>{dict(EVENT_TYPE_LABELS[k], lang)}</option>
                                ))}
                                <option value="other">{dict({ bm: 'Lain-lain (taip sendiri)', en: 'Other (type your own)', zh: '其他（自定义）' }, lang)}</option>
                            </select>
                            {sel === 'other' && (
                                <input style={{ ...inpS, marginTop: 8 }} placeholder={C.evTypePh}
                                    value={inv.event_type ?? ''} onChange={(e) => set({ event_type: e.target.value })} />
                            )}
                            <p className="pke-hint" style={{ marginTop: 6 }}>{dict({ bm: 'Jenis acara menentukan rekaan (grafik, tema & butang) kad anda.', en: 'The event type sets your card design (art, theme & button).', zh: '活动类型决定卡片设计（图形、主题与按钮）。' }, lang)}</p>
                        </div>
                    );
                })()}
                <Row label={C.evOrganizer} v={inv.organizer} on={(v) => set({ organizer: v })} />
                <div className="field">
                    <label>{C.evAbout}</label>
                    <textarea rows={4} value={inv.event_description ?? ''} onChange={(e) => set({ event_description: e.target.value })} />
                </div>
                <p className="pke-hint">{C.evPosterHint}</p>

                {/* Flexible custom fields — the open-ended part of the event format. */}
                <div className="pke-glabel">{C.evCustom}</div>
                <p className="pke-hint" style={{ marginTop: 0 }}>{C.evCustomHint}</p>
                {/* Per-type quick-add: tap to append a relevant labelled field. */}
                {(() => {
                    const known = normEventType(inv.event_type) ?? normEventType(tplEventType);
                    if (!known) return null;
                    const sugg = EVENT_FIELD_SUGGESTIONS[known] ?? [];
                    if (!sugg.length) return null;
                    return (
                        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            {sugg.map((s) => {
                                const label = dict(s, lang);
                                const already = customFields.some((f) => f.label.trim().toLowerCase() === label.toLowerCase());
                                return (
                                    <button key={label} type="button" className="btn btn-ghost btn-sm" disabled={already}
                                        onClick={() => set({ custom_fields: [...customFields, { label, value: '' }] })}>
                                        <Plus size={12} /> {label}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })()}
                {customFields.map((f, i) => (
                    <div className="row" key={i} style={{ marginBottom: 8 }}>
                        <input style={inpS} placeholder={C.evFieldLabel} value={f.label}
                            onChange={(e) => { const n = [...customFields]; n[i] = { ...f, label: e.target.value }; set({ custom_fields: n }); }} />
                        <input style={{ ...inpS, flex: 2 }} placeholder={C.evFieldValue} value={f.value}
                            onChange={(e) => { const n = [...customFields]; n[i] = { ...f, value: e.target.value }; set({ custom_fields: n }); }} />
                        <button className="btn btn-ghost btn-sm" aria-label={C.evFieldLabel} onClick={() => set({ custom_fields: customFields.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                    </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => set({ custom_fields: [...customFields, { label: '', value: '' }] })}><Plus size={14} /> {C.evAddField}</button>

                <div className="pke-glabel">{C.evOutroLabel}</div>
                <div className="field">
                    <textarea rows={2} value={inv.event_outro ?? ''} onChange={(e) => set({ event_outro: e.target.value })} placeholder={C.evOutroPh} />
                </div>
            </>
        ) : (
            <>
                {resellerField}
                {/* The design is fixed at creation — swapping it would change a
                    card that may already be in guests' hands, and let a paid
                    design be adopted after the fact. Create a new card instead. */}
                <div className="pke-glabel">{C.gCouple}</div>
                <Row label={C.groomName} v={inv.groom_name} on={(v) => set({ groom_name: v })} />
                <Row label={C.brideName} v={inv.bride_name} on={(v) => set({ bride_name: v })} />
                <Row label={C.groomShort} v={inv.groom_short} on={(v) => set({ groom_short: v })} />
                <Row label={C.brideShort} v={inv.bride_short} on={(v) => set({ bride_short: v })} />
                <div className="pke-glabel">{C.font}</div>
                {/* A dropdown where each option is drawn in its own face — a font
                    name tells a couple nothing, the letters tell them everything. */}
                <FontPicker value={inv.font_id} onChange={(id) => set({ font_id: id })} defaultLabel={C.fontDefault} />
                <p className="pke-hint" style={{ marginTop: 10 }}>{C.fontHint}</p>

                {/* Family / hosts. Two plain choices drive the underlying invite_side +
                    per-side "show": (1) whose side is inviting, and (2) a single "Papar
                    ibu bapa" mode — the couple's parents, both families, or a single
                    surviving parent. We derive both controls from the stored fields and
                    write back to them, so the card renderer is unchanged. */}
                {(() => {
                    const primarySide: 'groom' | 'bride' = (side === 'bride' || side === 'both_bride') ? 'bride' : 'groom';
                    const partnerSide: 'groom' | 'bride' = primarySide === 'groom' ? 'bride' : 'groom';
                    const isBoth = side === 'both_groom' || side === 'both_bride' || side === 'two_couples';
                    const primaryShow = inv.parents?.[primarySide]?.show ?? 'both';
                    const parentsMode: 'couple' | 'both' | 'mother' | 'father' =
                        isBoth ? 'both' : primaryShow === 'mother' ? 'mother' : primaryShow === 'father' ? 'father' : 'couple';

                    // Recompute invite_side + per-side show from the two selectors, in one write.
                    const apply = (nextPrimary: 'groom' | 'bride', nextMode: typeof parentsMode) => {
                        const nextSide: InviteSide = nextMode === 'both'
                            ? (nextPrimary === 'groom' ? 'both_groom' : 'both_bride')
                            : nextPrimary;
                        const showFor: ParentSide['show'] = nextMode === 'mother' ? 'mother' : nextMode === 'father' ? 'father' : 'both';
                        const parents = { ...(inv!.parents ?? {}) };
                        parents[nextPrimary] = { ...(parents[nextPrimary] ?? {}), show: showFor };
                        if (nextMode === 'both') {
                            const partner = nextPrimary === 'groom' ? 'bride' : 'groom';
                            parents[partner] = { ...(parents[partner] ?? {}), show: 'both' };
                        }
                        set({ invite_side: nextSide, parents });
                    };

                    const setSideNames = (which: 'groom' | 'bride', patch: Partial<ParentSide>) =>
                        set({ parents: { ...(inv!.parents ?? {}), [which]: { ...(inv!.parents?.[which] ?? {}), ...patch } } });

                    const pL = { father: C.pFather, mother: C.pMother };
                    const titleFor = (s: 'groom' | 'bride') => (s === 'groom' ? C.groomParents : C.brideParents);
                    const primaryInputShow: ParentSide['show'] = parentsMode === 'mother' ? 'mother' : parentsMode === 'father' ? 'father' : 'both';

                    return (
                        <>
                            <div className="pke-glabel">{C.gFamily}</div>
                            <div className="field">
                                <label>{C.inviteSide}</label>
                                <select value={primarySide} onChange={(e) => apply(e.target.value as 'groom' | 'bride', parentsMode)}>
                                    <option value="groom">{C.side.groom}</option>
                                    <option value="bride">{C.side.bride}</option>
                                </select>
                                <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{C.inviteSideHint}</p>
                            </div>
                            {/* Greeting/lead-in shown above the inviting parents. */}
                            <div className="field">
                                <label>{C.hostsIntro}</label>
                                <textarea rows={2} value={inv.hosts_intro ?? ''} onChange={(e) => set({ hosts_intro: e.target.value })} />
                                <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{C.hostsIntroHint}</p>
                            </div>
                            {/* The single combined "Papar ibu bapa" selector. */}
                            <div className="field">
                                <label>{C.pmLabel}</label>
                                <select value={parentsMode} onChange={(e) => apply(primarySide, e.target.value as typeof parentsMode)}>
                                    <option value="couple">{C.pmCouple}</option>
                                    <option value="both">{C.pmBoth}</option>
                                    <option value="mother">{C.pmMother}</option>
                                    <option value="father">{C.pmFather}</option>
                                </select>
                            </div>
                            <ParentBlock title={titleFor(primarySide)} side={inv.parents?.[primarySide]} show={primaryInputShow} on={(p) => setSideNames(primarySide, p)} L={pL} />
                            {parentsMode === 'both' && (
                                <ParentBlock title={titleFor(partnerSide)} side={inv.parents?.[partnerSide]} show="both" on={(p) => setSideNames(partnerSide, p)} L={pL} />
                            )}
                        </>
                    );
                })()}

                <div className="pke-glabel">{C.gOpening}</div>
                {/* Editable invitation heading (Walimatulurus); blank hides it. */}
                <Row label={C.walimahLabel} v={inv.walimah_label} on={(v) => set({ walimah_label: v })} hint={C.walimahHint} />
                {/* The opening words are written here, so their show/hide switch
                    belongs here too — it is not one of the movable sections. */}
                <div className="pke-order-row" style={{ borderBottom: 0, paddingTop: 0 }}>
                    <span className="pke-order-name">{C.sec.opening}</span>
                    <Switch label={`${C.includeInCard}: ${C.sec.opening}`} on={secOn('opening')} onChange={(v) => setSection('opening', v)} />
                </div>
                <div className="field">
                    <label>{C.opening}</label>
                    <textarea rows={2} value={inv.opening_line ?? ''} onChange={(e) => set({ opening_line: e.target.value })} />
                </div>
                <label className="row" style={{ fontSize: 14 }}>
                    <input type="checkbox" checked={inv.bismillah} onChange={(e) => set({ bismillah: e.target.checked })} /> {C.showBismillah}
                </label>
                {inv.bismillah && <Row label={C.bismillahCustom} v={inv.bismillah_text} on={(v) => set({ bismillah_text: v })} hint={C.bismillahCustomHint} />}

                {/* Doa — a fixed block shown just before the countdown; its
                    show/hide switch lives here (not a movable section). */}
                <div className="pke-glabel">{C.gPrayer}</div>
                <div className="pke-order-row" style={{ borderBottom: 0, paddingTop: 0 }}>
                    <span className="pke-order-name">{C.sec.prayer}</span>
                    <Switch label={`${C.includeInCard}: ${C.sec.prayer}`} on={secOn('prayer')} onChange={(v) => setSection('prayer', v)} />
                </div>
                <div className="field">
                    <label>{C.prayer}</label>
                    <textarea rows={5} value={inv.prayer ?? ''} onChange={(e) => set({ prayer: e.target.value })} />
                    <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{C.prayerHint}</p>
                </div>
            </>
        ),

        lokasi: (
            <>
                <div className="pke-glabel">{C.gWhen}</div>
                <Row label={C.dateLabel} v={inv.date_label} on={(v) => set({ date_label: v })} placeholder={C.dateSample} />
                <Row label={C.timeLabel} v={inv.time_label} on={(v) => set({ time_label: v })} placeholder={C.timeSample} />
                <Row label={C.hijri} v={inv.hijri_label} on={(v) => set({ hijri_label: v })} />
                <div className="field">
                    <label>{C.akadDT}</label>
                    <input type="datetime-local" value={(inv.akad_at ?? '').slice(0, 16)} onChange={(e) => set({ akad_at: e.target.value })} />
                </div>
                <div className="field">
                    <label>{C.receptionDT}</label>
                    <input type="datetime-local" value={(inv.reception_at ?? '').slice(0, 16)} onChange={(e) => set({ reception_at: e.target.value })} />
                </div>
                <div className="pke-glabel">{C.gWhere}</div>
                <Row label={C.venueName} v={inv.venue_name} on={(v) => set({ venue_name: v })} />
                <div className="field">
                    <label>{C.address}</label>
                    <textarea rows={2} value={inv.venue_address ?? ''} onChange={(e) => set({ venue_address: e.target.value })} />
                </div>
                <Row label={C.mapsLink} v={inv.maps_url} on={(v) => set({ maps_url: v })} placeholder="https://maps.google.com/…" hint={C.mapsHint} />
                <Row label={C.wazeLink} v={inv.waze_url} on={(v) => set({ waze_url: v })} placeholder="https://waze.com/ul/…" />
            </>
        ),

        atur: (
            <>
                <p className="pke-hint">{C.programHint} {C.programTimeHint}</p>
                {program.map((p, i) => {
                    // A clock is far easier than typing "12:30 petang" by hand, but
                    // an older card may hold something no time input can show —
                    // that row keeps a text field rather than losing its value.
                    const asTime = toTimeInputValue(p.time);
                    return (
                    <div className="row" key={i} style={{ marginBottom: 8 }}>
                        {asTime === null ? (
                            <input style={inpS} placeholder={C.time} value={p.time} title={C.timeFreeform}
                                onChange={(e) => { const n = [...program]; n[i] = { ...p, time: e.target.value }; set({ program: n }); }} />
                        ) : (
                            <input type="time" style={inpS} value={asTime} aria-label={C.time}
                                onChange={(e) => { const n = [...program]; n[i] = { ...p, time: e.target.value }; set({ program: n }); }} />
                        )}
                        <input style={{ ...inpS, flex: 2 }} placeholder={C.event} value={p.title} onChange={(e) => { const n = [...program]; n[i] = { ...p, title: e.target.value }; set({ program: n }); }} />
                        <button className="btn btn-ghost btn-sm" aria-label={C.event} onClick={() => set({ program: program.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                    </div>
                    );
                })}
                <button className="btn btn-ghost btn-sm" onClick={() => set({ program: [...program, { time: '', title: '' }] })}><Plus size={14} /> {C.addRow}</button>
            </>
        ),

        hubungi: (
            <>
                {contacts.map((c, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                        <div className="row" style={{ marginBottom: 6 }}>
                            <input style={inpS} placeholder={C.name} value={c.name} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, name: e.target.value }; set({ contacts: n }); }} />
                            <button className="btn btn-ghost btn-sm" aria-label={C.name} onClick={() => set({ contacts: contacts.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                        </div>
                        <div className="row">
                            <input style={inpS} placeholder={C.role} value={c.role ?? ''} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, role: e.target.value }; set({ contacts: n }); }} />
                            <input style={inpS} placeholder="+60…" value={c.phone} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, phone: e.target.value }; set({ contacts: n }); }} />
                        </div>
                    </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => set({ contacts: [...contacts, { name: '', role: '', phone: '' }] })}><Plus size={14} /> {C.addContact}</button>
            </>
        ),

        gift: (
            <>
                <Row label={C.bankName} v={inv.gift?.bankName} on={(v) => set({ gift: { ...inv.gift, bankName: v } })} />
                <Row label={C.accountName} v={inv.gift?.accountName} on={(v) => set({ gift: { ...inv.gift, accountName: v } })} />
                <Row label={C.accountNo} v={inv.gift?.accountNo} on={(v) => set({ gift: { ...inv.gift, accountNo: v } })} />
                <Row label={C.note} v={inv.gift?.note} on={(v) => set({ gift: { ...inv.gift, note: v } })} />
                <GiftQrField invitationId={id} gift={inv.gift} onSaved={setInv} />
            </>
        ),

        hadiah: (
            <>
                <p className="pke-hint">{C.giftRegistryHint}</p>
                {wishlist.map((w, i) => (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
                        <div className="row" style={{ marginBottom: 6 }}>
                            <input
                                style={inpS}
                                placeholder={C.wishTitle}
                                required
                                value={w.title}
                                onChange={(e) => { const n = [...wishlist]; n[i] = { ...w, title: e.target.value }; set({ wishlist: n }); }}
                            />
                            <button className="btn btn-ghost btn-sm" aria-label={C.wishTitle} onClick={() => set({ wishlist: wishlist.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                        </div>
                        <input
                            style={{ ...inpS, display: 'block', width: '100%', marginBottom: 6 }}
                            placeholder={C.wishNote}
                            value={w.note ?? ''}
                            onChange={(e) => { const n = [...wishlist]; n[i] = { ...w, note: e.target.value }; set({ wishlist: n }); }}
                        />
                        <input
                            style={{ ...inpS, display: 'block', width: '100%' }}
                            type="url"
                            inputMode="url"
                            placeholder={C.wishUrl}
                            value={w.url ?? ''}
                            onChange={(e) => { const n = [...wishlist]; n[i] = { ...w, url: e.target.value }; set({ wishlist: n }); }}
                        />
                    </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => set({ wishlist: [...wishlist, { title: '' }] })}><Plus size={14} /> {C.addGift}</button>
            </>
        ),

        media: (
            <MediaPanel
                invitationId={id}
                coverImage={inv.cover_image}
                galleryImages={inv.gallery_images}
                musicUrl={inv.music_url}
                motionFile={inv.motion_file}
                motionTint={inv.motion_tint}
                onSaved={setInv}
            />
        ),

        /* Susunan — one place to see the whole card top-to-bottom, move any
           section, and switch it off. Every section is switchable here, including
           the guestbook, which has no tab of its own. */
        susunan: (
            <>
                <p className="pke-hint">{C.orderHint}</p>
                <ol className="pke-order">
                    {order.map((key, i) => {
                        const on = sectionShown(key);
                        return (
                            <li className={`pke-order-row${on ? '' : ' is-off'}`} key={key}>
                                <span className="pke-order-no">{i + 1}</span>
                                <span className="pke-order-name">{C.sec[key] ?? key}</span>
                                <span className="pke-order-btns">
                                    <button className="pke-move" aria-label={`${C.moveUp}: ${C.sec[key] ?? key}`} disabled={i === 0} onClick={() => moveSection(key, -1)}>
                                        <ChevronUp size={16} />
                                    </button>
                                    <button className="pke-move" aria-label={`${C.moveDown}: ${C.sec[key] ?? key}`} disabled={i === order.length - 1} onClick={() => moveSection(key, 1)}>
                                        <ChevronDown size={16} />
                                    </button>
                                </span>
                                <Switch label={`${C.includeInCard}: ${C.sec[key] ?? key}`} on={on} onChange={(v) => setSectionShown(key, v)} />
                            </li>
                        );
                    })}
                </ol>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={resetOrder}>{C.resetOrder}</button>

                {/* How the guestbook (ucapan) shows its wishes on the card. */}
                <div className="pke-glabel" style={{ marginTop: 22 }}>{C.wishesLayout}</div>
                <p className="pke-hint" style={{ marginTop: 0 }}>{C.wishesLayoutHint}</p>
                <div className="pke-choice" role="radiogroup" aria-label={C.wishesLayout}>
                    {(['carousel', 'list'] as const).map((v) => {
                        const on = (inv.wishes_layout ?? 'carousel') === v;
                        return (
                            <button
                                key={v}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                className={`pke-choice-btn${on ? ' is-on' : ''}`}
                                onClick={() => { set({ wishes_layout: v }); void save({ wishes_layout: v }); }}
                            >
                                {v === 'carousel' ? C.wishesCarousel : C.wishesList}
                            </button>
                        );
                    })}
                </div>
            </>
        ),

        rsvp: (
            <>
                <p className="pke-hint">{C.rsvpDesc}</p>

                <div className="pke-glabel">{C.rsvpFields}</div>
                {/* Seating delivers a guest's table by email, so a host who can
                    seat guests cannot turn email collection off. */}
                <div className="pke-choice" role="radiogroup" aria-label={C.rsvpFields}>
                    {(['both', 'email', 'phone'] as const).map((v) => {
                        const on = fieldSet === v;
                        const locked = v === 'phone' && seats;
                        return (
                            <button
                                key={v}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                disabled={locked}
                                className={`pke-choice-btn${on ? ' is-on' : ''}`}
                                onClick={() => setRsvpFields(v)}
                            >
                                {v === 'both' ? C.rsvpBoth : v === 'email' ? C.rsvpEmail : C.rsvpPhone}
                            </button>
                        );
                    })}
                </div>
                <p className="pke-hint" style={{ margin: '10px 0 0' }}>
                    {seats ? C.rsvpEmailLocked : C.rsvpFieldsHint}
                </p>

                <div className="field" style={{ marginTop: 18 }}>
                    <label>{seatT.title}</label>
                    <NumberInput
                        min={0} value={inv.seat_limit || ''}
                        onChange={(t) => set({ seat_limit: t === '' ? 0 : Number(t) })}
                        onBlur={() => void save({ seat_limit: inv.seat_limit ?? 0 })}
                    />
                    <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{seatT.hint}</p>
                </div>

                {canPay && (
                    <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                            <div style={{ minWidth: 0 }}>
                                <div className="pke-glabel" style={{ margin: 0 }}>{payT.title}</div>
                                <p className="pke-hint" style={{ margin: '4px 0 0' }}>{payT.hint}</p>
                            </div>
                            <Switch label={payT.title} on={!!inv.rsvp_pay_enabled} onChange={setPayEnabled} />
                        </div>

                        {inv.rsvp_pay_enabled && (
                            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                                <div className="field">
                                    <label>{payT.price}</label>
                                    <NumberInput
                                        decimals min={0} step="0.01"
                                        value={inv.rsvp_price ?? ''} placeholder="0.00"
                                        onChange={(t) => set({ rsvp_price: t === '' ? null : Number(t) })}
                                        onBlur={() => void save({ rsvp_price: inv.rsvp_price ?? null })}
                                    />
                                </div>
                                <div style={{ padding: '11px 13px', borderRadius: 10, background: 'rgba(74,59,196,0.06)', border: '1px solid rgba(74,59,196,0.18)', fontSize: 13.5 }}>
                                    {payT.guestPays}: <strong>RM {payPrice.toFixed(2)}</strong> <span className="muted">/ {payT.perPax}</span>
                                    <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.5 }}>{payT.note}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <Link to={`/panel/cards/${id}/guests`} className="btn btn-ghost btn-block" style={{ marginTop: 20 }}>
                    <Users size={16} /> {C.manageGuests}
                </Link>
            </>
        ),
    };

    // ---- Header action buttons (reused inline on wide, in the menu on narrow) ----
    const saveBtn = (
        <span className="row" style={{ gap: 8, alignItems: 'center' }}>
            {autoStatus !== 'idle' && (
                <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {autoStatus === 'saving' ? <Loader2 size={13} className="spin" /> : <Check size={13} color="var(--ok)" />}
                    {autoStatus === 'saving' ? C.autoSaving : C.autoSaved}
                </span>
            )}
            <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => save()}>
                {saved ? <><Check size={15} /> {C.saved}</> : <><Save size={15} /> {saving ? C.saving : C.save}</>}
            </button>
        </span>
    );

    const preview = (
        <LivePreview
            inv={inv}
            baseKey={templates.find((t) => t.key === inv.template_key)?.base_key ?? undefined}
            templateConfig={templates.find((t) => t.key === inv.template_key)?.config ?? undefined}
            focusSection={openTab ? (TABS.find((t) => t.id === openTab)?.sectionKey ?? null) : null}
        />
    );

    return (
        <div className="pke">
            <style>{PKE_CSS}</style>

            {/* A blocked/failed save (e.g. the per-card edit limit) — surfaced, not silent. */}
            {saveErr && (
                <div role="alert" style={{
                    position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 300,
                    maxWidth: 'min(92vw, 460px)', display: 'flex', alignItems: 'center', gap: 12,
                    background: '#fff', border: '1px solid var(--bad)', borderRadius: 12,
                    boxShadow: '0 16px 40px -14px rgba(30,26,51,0.45)', padding: '11px 14px',
                }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--bad)', lineHeight: 1.5 }}>{saveErr}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSaveErr(null)} style={{ flexShrink: 0 }}>{C.dismiss}</button>
                </div>
            )}

            {/* ---------- Header ---------- */}
            <div className="pke-head">
                <div className="pke-head-l">
                    <Link to="/panel" className="btn btn-ghost btn-sm" aria-label="Back"><ArrowLeft size={15} /></Link>
                    <div className="pke-title">
                        <h1>{inv.bride_name} &amp; {inv.groom_name}</h1>
                        <p>
                            /e/{inv.slug}
                            <span className={`badge${inv.status === 'published' ? '' : ' badge-gold'}`}>
                                {inv.status === 'published' ? C.published : C.draft}
                            </span>
                        </p>
                    </div>
                </div>

                {isWide ? (
                    <div className="pke-head-r">
                        <Link to={`/panel/cards/${id}/guests`} className="btn btn-ghost btn-sm"><Users size={14} /> {C.guests}</Link>
                        <Link to={`/panel/cards/${id}/seating`} className="btn btn-ghost btn-sm" title={canSeat ? undefined : 'Premium'}>
                            <Armchair size={14} /> {C.tables}
                            {!canSeat && <Lock size={12} style={{ marginLeft: 4, opacity: 0.7 }} />}
                        </Link>
                        {inv.status === 'published' && (
                            <a href={appUrl(`/e/${inv.slug}`)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> {C.openLive}</a>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => save({ status: inv.status === 'published' ? 'draft' : 'published' })}>
                            {inv.status === 'published' ? <><PenLine size={14} /> {C.setDraft}</> : <><Send size={14} /> {C.publish}</>}
                        </button>
                        {saveBtn}
                    </div>
                ) : (
                    <div className="pke-head-r">
                        {saveBtn}
                        <div className="pke-more" ref={moreRef}>
                            <button className="btn btn-ghost btn-sm" aria-label={C.more} aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
                                <MoreHorizontal size={16} />
                            </button>
                            {moreOpen && (
                                <div className="pke-menu" role="menu">
                                    <Link to={`/panel/cards/${id}/guests`} className="pke-menu-item" role="menuitem" onClick={() => setMoreOpen(false)}>
                                        <Users size={16} /> {C.guests}
                                    </Link>
                                    <Link to={`/panel/cards/${id}/seating`} className="pke-menu-item" role="menuitem" onClick={() => setMoreOpen(false)}>
                                        <Armchair size={16} /> {C.tables}
                                        {!canSeat && <Lock size={13} className="sp" style={{ opacity: 0.7 }} />}
                                    </Link>
                                    {inv.status === 'published' && (
                                        <a href={appUrl(`/e/${inv.slug}`)} target="_blank" rel="noreferrer" className="pke-menu-item" role="menuitem" onClick={() => setMoreOpen(false)}>
                                            <ExternalLink size={16} /> {C.openLive}
                                        </a>
                                    )}
                                    <button className="pke-menu-item" role="menuitem" onClick={() => { setMoreOpen(false); save({ status: inv.status === 'published' ? 'draft' : 'published' }); }}>
                                        {inv.status === 'published' ? <><PenLine size={16} /> {C.setDraft}</> : <><Send size={16} /> {C.publish}</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isWide ? (
                /* ---------- Desktop: horizontal tabs, form left, preview right ---------- */
                <div className="pke-desk">
                    {/* Tabs run across the top so the form below gets the full
                        column width — the rail was eating space the fields needed. */}
                    <nav className="pke-tabbar" role="tablist" aria-label={C.sectionsNav}>
                        {visibleTabs.map((t) => {
                            const off = tabOff(t);
                            const active = deskTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    role="tab"
                                    aria-selected={active}
                                    className={`pke-toptab${active ? ' is-active' : ''}${off ? ' is-off' : ''}`}
                                    onClick={() => setOpenTab(t.id)}
                                    title={off ? `${C.tabs[t.id]} · ${C.off}` : C.tabs[t.id]}
                                >
                                    {TAB_ICON[t.id]}
                                    <span className="lbl">{C.tabs[t.id]}</span>
                                    {off && <span className="off-dot" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="pke-cols">
                        <section className="panel pke-pane" aria-label={C.tabs[deskTab]}>
                            <header className="pke-pane-head">
                                <div style={{ minWidth: 0 }}>
                                    <h2>{C.tabs[deskTab]}</h2>
                                    <p>{C.sub[deskTab]}</p>
                                </div>
                                {tabSwitch(visibleTabs.find((t) => t.id === deskTab)!)}
                            </header>
                            <div className="pke-pane-body pk-scroll">{BODY[deskTab]}</div>
                        </section>

                        <aside className="pke-side">{preview}</aside>
                    </div>
                </div>
            ) : (
                <>
                    {/* ---------- Mobile: preview hero + bottom dock + sheets ---------- */}
                    <div className="pke-stage">{preview}</div>

                    <nav className="pke-dock" aria-label={C.sectionsNav}>
                        <div className="pke-dock-track">
                            {visibleTabs.map((t) => {
                                const off = tabOff(t);
                                return (
                                    <button
                                        key={t.id}
                                        className={`pke-tab${off ? ' is-off' : ''}`}
                                        onClick={() => setOpenTab(t.id)}
                                        aria-haspopup="dialog"
                                        title={off ? `${C.tabs[t.id]} · ${C.off}` : C.tabs[t.id]}
                                    >
                                        {TAB_ICON[t.id]}
                                        <span className="lbl">{C.tabs[t.id]}</span>
                                        {off && <span className="off-dot" aria-hidden="true" />}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* One sheet per tab, each carrying its own include-in-card switch
                        in the header — no separate sections screen to hunt through. */}
                    {visibleTabs.map((t) => (
                        <EditorSheet
                            key={t.id}
                            open={openTab === t.id}
                            onClose={() => setOpenTab(null)}
                            title={C.tabs[t.id]}
                            subtitle={C.sub[t.id]}
                            headAction={tabSwitch(t)}
                        >
                            {BODY[t.id]}
                        </EditorSheet>
                    ))}
                </>
            )}
        </div>
    );
}

function Row({ label, v, on, placeholder, hint }: { label: string; v?: string; on: (v: string) => void; placeholder?: string; hint?: string }) {
    return (
        <div className="field">
            <label>{label}</label>
            <input value={v ?? ''} placeholder={placeholder} onChange={(e) => on(e.target.value)} />
            {hint && <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{hint}</p>}
        </div>
    );
}

/**
 * One family's parents for the intro: father + mother names and a selector for
 * which to show. The omitted parent's field is hidden so the host only fills in
 * what will actually appear (the absent/deceased one is simply left out).
 */
function ParentBlock({ title, side, show, on, L }: {
    title: string;
    side?: ParentSide;
    show: ParentSide['show'];
    on: (patch: Partial<ParentSide>) => void;
    L: { father: string; mother: string };
}) {
    return (
        <div style={{ marginBottom: 8 }}>
            <div className="pke-order-name" style={{ fontWeight: 600, margin: '4px 0 10px' }}>{title}</div>
            {show !== 'mother' && <Row label={L.father} v={side?.father} on={(v) => on({ father: v })} />}
            {show !== 'father' && <Row label={L.mother} v={side?.mother} on={(v) => on({ mother: v })} />}
        </div>
    );
}

/** iOS-style on/off switch — indigo when on. */
function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            className={`pke-switch${on ? ' on' : ''}`}
            onClick={() => onChange(!on)}
        >
            <span className="pke-knob" />
        </button>
    );
}

const inpS: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, font: 'inherit', flex: 1, minWidth: 0 };

const PKE_CSS = `
.pke { position: relative; overflow-x: clip; }

/* Header */
.pke-head {
    display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
    padding-bottom: 16px; margin-bottom: 4px; border-bottom: 1px solid var(--line);
}
.pke-head-l { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1 1 auto; }
.pke-title { min-width: 0; }
.pke-title h1 { font-size: clamp(18px, 3.4vw, 24px); margin: 0; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pke-title p { margin: 3px 0 0; font-size: 12.5px; color: var(--muted); display: flex; align-items: center; gap: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pke-head-r { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

/* Overflow menu (narrow) */
.pke-more { position: relative; }
.pke-menu {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 50; min-width: 220px;
    background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 6px;
    box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 2px;
}
.pke-menu-item {
    display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
    padding: 10px 12px; border: 0; background: transparent; border-radius: 10px; cursor: pointer;
    font: inherit; font-size: 14px; font-weight: 600; color: var(--ink);
}
.pke-menu-item:hover { background: var(--cream); }
.pke-menu-item .sp { margin-left: auto; }

/* ---- Desktop: horizontal tab bar over a form + live preview ---- */
.pke-desk { margin-top: 18px; }
.pke-cols {
    display: grid; gap: 18px; align-items: start;
    grid-template-columns: minmax(0, 1fr) clamp(324px, 26vw, 400px);
}
.pke-tabbar {
    display: flex; gap: 4px; margin-bottom: 14px; padding: 6px;
    background: #fff; border: 1px solid var(--line); border-radius: 16px;
    overflow-x: auto; overscroll-behavior-x: contain;
    scrollbar-width: thin; scrollbar-color: rgba(74, 59, 196, 0.45) transparent;
}
.pke-tabbar::-webkit-scrollbar { height: 4px; }
.pke-tabbar::-webkit-scrollbar-thumb { background: rgba(74, 59, 196, 0.45); border-radius: 999px; }
.pke-toptab {
    position: relative; display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto;
    padding: 9px 14px; border: 0; background: transparent; border-radius: 11px; cursor: pointer;
    font: inherit; font-size: 13.5px; font-weight: 600; color: var(--muted); white-space: nowrap;
    transition: background .15s ease, color .15s ease;
}
.pke-toptab > svg { flex: none; }
.pke-toptab:hover { background: var(--cream); color: var(--plum); }
.pke-toptab.is-active { background: var(--plum); color: #fff; }
.pke-toptab.is-off:not(.is-active) { opacity: 0.5; }
.pke-toptab .off-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: 0.6; flex: none; }

.pke-pane { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.pke-pane-head {
    flex: none; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
    padding: 18px 20px 14px; border-bottom: 1px solid var(--line);
}
.pke-pane-head h2 { margin: 0; font-size: 19px; color: var(--plum); line-height: 1.2; }
.pke-pane-head p { margin: 3px 0 0; font-size: 13px; color: var(--muted); line-height: 1.45; }
.pke-pane-body { padding: 18px 20px 24px; overflow-y: auto; max-height: calc(100vh - 268px); }
.pke-side { position: sticky; top: 16px; }

/* The include-in-card switch, in a tab header (sheet or pane). */
.pke-headtoggle { flex: none; display: inline-flex; align-items: center; gap: 9px; }
.pke-headtoggle .lbl { font-size: 12.5px; font-weight: 700; color: var(--muted); white-space: nowrap; }

/* Preview hero — flex (not grid) so the device measures against the real
   viewport width and shrinks on mobile instead of forcing its 452px max. */
.pke-stage {
    display: flex; flex-direction: column; align-items: center; padding: 26px 8px 156px; min-height: 60vh;
    background: radial-gradient(620px 340px at 50% 0%, #efeefb 0%, rgba(239, 238, 251, 0) 72%);
}

/* Bottom dock */
.pke-dock {
    position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 96;
    display: flex; max-width: min(94vw, 900px); overflow-x: auto; overscroll-behavior-x: contain;
    background: rgba(255, 255, 255, 0.94);
    -webkit-backdrop-filter: blur(12px) saturate(1.2); backdrop-filter: blur(12px) saturate(1.2);
    border: 1px solid var(--line); border-radius: 22px;
    padding: 7px 8px calc(6px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 22px 50px -22px rgba(74, 59, 196, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.7);
    /* Custom small horizontal scroll indicator */
    scrollbar-width: thin; scrollbar-color: rgba(74, 59, 196, 0.55) transparent;
    scroll-snap-type: x proximity;
}
.pke-dock::-webkit-scrollbar { height: 4px; }
.pke-dock::-webkit-scrollbar-track { background: transparent; margin: 0 14px; }
.pke-dock::-webkit-scrollbar-thumb { background: rgba(74, 59, 196, 0.5); border-radius: 999px; }
.pke-dock::-webkit-scrollbar-thumb:hover { background: var(--plum); }
@media (min-width: 861px) { .pke-dock { left: calc(50% + 122px); } }
.pke-dock-track { display: flex; gap: 3px; width: max-content; margin: 0 auto; }
.pke-tab { scroll-snap-align: center; }
.pke-tab {
    position: relative; appearance: none; border: 0; background: transparent; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 0 0 auto;
    min-width: 60px; padding: 8px 9px 7px; border-radius: 14px; color: var(--muted); font-family: inherit;
    transition: background .15s ease, color .15s ease, transform .12s ease, opacity .15s ease;
}
.pke-tab:hover { background: var(--cream); color: var(--plum); }
.pke-tab:active { transform: scale(0.94); }
.pke-tab .lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.2px; line-height: 1; white-space: nowrap; }
.pke-tab.is-off { opacity: 0.45; }
.pke-tab .off-dot { position: absolute; top: 5px; right: 11px; width: 7px; height: 7px; border-radius: 50%; background: var(--muted); box-shadow: 0 0 0 2px #fff; }

/* Group label inside sheets / panes */
.pke-glabel { font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--plum); margin: 22px 0 12px; display: flex; align-items: center; gap: 10px; }
.pke-glabel:first-child { margin-top: 4px; }
.pke-glabel::after { content: ''; flex: 1; height: 1px; background: var(--line); }
.pke-hint { color: var(--muted); font-size: 13px; line-height: 1.55; margin: 0 0 16px; }

/* Font picker */
.pke-fonts { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.pke-font {
    display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
    padding: 11px 13px; cursor: pointer; text-align: left; font: inherit;
    border: 1px solid var(--line); border-radius: 12px; background: #fff;
    transition: border-color .15s ease, background .15s ease;
}
.pke-font:hover { border-color: var(--plum); }
.pke-font.is-on { border-color: var(--plum); background: var(--cream); box-shadow: inset 0 0 0 1px var(--plum); }
.pke-font-sample {
    font-size: 21px; line-height: 1.25; color: var(--ink);
    max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pke-font-name { font-size: 11.5px; font-weight: 600; color: var(--muted); }

/* Segmented choice (RSVP field set) */
.pke-choice { display: flex; gap: 6px; flex-wrap: wrap; }
.pke-choice-btn {
    flex: 1 1 auto; min-width: 118px; padding: 10px 12px; border-radius: 11px; cursor: pointer;
    border: 1px solid var(--line); background: #fff; font: inherit; font-size: 13.5px; font-weight: 600;
    color: var(--muted); transition: background .15s ease, color .15s ease, border-color .15s ease;
}
.pke-choice-btn:hover:not(:disabled) { border-color: var(--plum); color: var(--plum); }
.pke-choice-btn.is-on { background: var(--plum); border-color: var(--plum); color: #fff; }
.pke-choice-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Section order list */
.pke-order { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.pke-order-row { display: flex; align-items: center; gap: 12px; padding: 11px 2px; border-bottom: 1px solid var(--line); }
.pke-order-row:last-child { border-bottom: 0; }
.pke-order-row.is-off { opacity: 0.55; }
.pke-order-no {
    flex: none; width: 25px; height: 25px; border-radius: 8px; background: var(--cream); color: var(--plum);
    display: grid; place-items: center; font-size: 12px; font-weight: 800;
}
.pke-order-name { flex: 1; min-width: 0; font-size: 14.5px; font-weight: 600; color: var(--ink); }
.pke-order-btns { flex: none; display: flex; gap: 4px; }
.pke-move {
    width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--line); background: #fff;
    display: grid; place-items: center; cursor: pointer; color: var(--plum); transition: background .15s ease;
}
.pke-move:hover:not(:disabled) { background: var(--cream); }
.pke-move:disabled { opacity: 0.35; cursor: default; }

/* iOS switch */
.pke-switch { flex: 0 0 auto; position: relative; width: 46px; height: 28px; border-radius: 999px; border: 0; cursor: pointer; background: #d8d5ea; transition: background .18s ease; padding: 0; }
.pke-switch.on { background: var(--plum); }
.pke-knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25); transition: transform .18s ease; }
.pke-switch.on .pke-knob { transform: translateX(18px); }

/* ---- Mobile ---- */
@media (max-width: 860px) {
    .pke-head { gap: 10px; }
    .pke-head-r { flex: 1 1 100%; }              /* full row → Save + ⋯ pinned right */
    .pke-menu { min-width: 200px; max-width: calc(100vw - 28px); }
    .pke-stage { padding: 16px 4px 150px; }
    .pke-dock { max-width: calc(100vw - 20px); }
    .pke-tab { min-width: 56px; padding: 8px 8px 7px; }
}
@media (max-width: 560px) {
    .pke-headtoggle .lbl { display: none; }      /* the switch alone reads clearly here */
    .pke-order-row { gap: 8px; }
    .pke-move { width: 30px; height: 30px; }
}
@media (max-width: 400px) {
    .pke-tab { min-width: 52px; }
    .pke-tab .lbl { font-size: 10px; }
}
@media print { .pke-dock { display: none !important; } }
`;
