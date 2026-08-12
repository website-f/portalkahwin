import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, Save, ExternalLink, Plus, Trash2, Check, Users, Armchair, Lock,
    MoreHorizontal, Send, PenLine,
    FileText, MapPin, CalendarClock, Phone, Wallet, Gift, Images, SlidersHorizontal, MailCheck,
} from 'lucide-react';
import { api } from '../../lib/api';
import { MediaPanel } from '../../components/MediaPanel';
import { LivePreview } from '../../components/LivePreview';
import { EditorSheet } from '../../components/EditorSheet';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import type { Palette, WishlistItem } from '../../templates/types';

interface ProgramItem { time: string; title: string; }
interface Contact { name: string; role?: string; phone: string; }

/** Editor state — snake_case, mirrors the API. Exported so LivePreview can map it. */
export interface Inv {
    id: string; slug: string; template_key: string; status: 'draft' | 'published';
    groom_name: string; bride_name: string; groom_short?: string; bride_short?: string;
    groom_parents?: string; bride_parents?: string; opening_line?: string; bismillah: boolean;
    date_label?: string; time_label?: string; hijri_label?: string; akad_at?: string; reception_at?: string;
    venue_name?: string; venue_address?: string; maps_url?: string; waze_url?: string;
    program?: ProgramItem[]; contacts?: Contact[];
    gift?: { bankName?: string; accountName?: string; accountNo?: string; note?: string };
    wishlist?: WishlistItem[];
    rsvp_enabled: boolean;
    /** Per-card optional-section switches (all default true). */
    sections?: Record<string, boolean>;
    cover_image?: string | null;
    gallery_images?: string[] | null;
    music_url?: string | null;
    palette?: Palette;
}
interface Tpl { id: string; key: string; name: string; base_key?: string | null; palette?: Record<string, string> | null; config?: import('../../templates/customConfig').CustomTemplateConfig | null; }

type TabId = 'butiran' | 'lokasi' | 'atur' | 'hubungi' | 'gift' | 'hadiah' | 'media' | 'bahagian' | 'rsvp';

/** Dock tabs. `sectionKey` / `rsvp` drive the "off" indicator when that section is switched off. */
const TABS: { id: TabId; sectionKey?: string; rsvp?: boolean }[] = [
    { id: 'butiran' },
    { id: 'lokasi', sectionKey: 'location' },
    { id: 'atur', sectionKey: 'program' },
    { id: 'hubungi', sectionKey: 'contacts' },
    { id: 'gift', sectionKey: 'gift' },
    { id: 'hadiah', sectionKey: 'wishlist' },
    { id: 'media', sectionKey: 'gallery' },
    { id: 'bahagian' },
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
    bahagian: <SlidersHorizontal size={19} />,
    rsvp: <MailCheck size={19} />,
};

/** Optional sections listed (in order) in the Bahagian sheet. */
const SECTION_KEYS = ['opening', 'program', 'location', 'wishes', 'wishlist', 'contacts', 'gift', 'gallery'] as const;

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
    const isPremium = !!user?.has_paid_access || user?.plan === 'premium' || user?.role === 'admin';
    const [inv, setInv] = useState<Inv | null>(null);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [openTab, setOpenTab] = useState<TabId | null>(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    const isWide = useMedia('(min-width: 900px)');

    useEffect(() => {
        Promise.all([api.get<Inv>(`/invitations/${id}`), api.get<Tpl[]>('/templates')])
            .then(([i, t]) => { setInv(i.data); setTemplates(t.data); });
    }, [id]);

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

    const C = ({
        bm: {
            tabs: { butiran: 'Butiran', lokasi: 'Tarikh & Lokasi', atur: 'Atur Cara', hubungi: 'Hubungi', gift: 'Salam Kaut', hadiah: 'Senarai Hadiah', media: 'Galeri & Muzik', bahagian: 'Bahagian', rsvp: 'RSVP' } as Record<TabId, string>,
            sub: { butiran: 'Nama, keluarga & kata pembuka', lokasi: 'Tarikh, masa & lokasi majlis', atur: 'Perjalanan majlis mengikut waktu', hubungi: 'Nombor untuk dihubungi', gift: 'Maklumat akaun untuk salam kaut', hadiah: 'Senarai hadiah idaman', media: 'Gambar pembuka, galeri & lagu', bahagian: 'Hidupkan atau matikan bahagian kad', rsvp: 'Benarkan tetamu sahkan kehadiran' } as Record<TabId, string>,
            sec: { opening: 'Kata Aluan', program: 'Atur Cara', location: 'Lokasi', wishes: 'Ucapan / Buku Tetamu', wishlist: 'Senarai Hadiah', contacts: 'Hubungi', gift: 'Salam Kaut', gallery: 'Galeri', rsvp: 'RSVP' } as Record<string, string>,
            published: 'Terbit', draft: 'Draf',
            guests: 'Tetamu & RSVP', tables: 'Susun Meja', openLive: 'Lihat Kad', more: 'Lagi',
            setDraft: 'Tukar ke Draf', publish: 'Terbitkan Kad',
            saved: 'Siap disimpan', saving: 'Menyimpan…', save: 'Simpan',
            template: 'Rekaan',
            gCouple: 'Pengantin', gFamily: 'Keluarga', gOpening: 'Kata Aluan', gWhen: 'Tarikh & Masa', gWhere: 'Lokasi', gInteract: 'Interaksi',
            groomName: 'Nama penuh pengantin lelaki', brideName: 'Nama penuh pengantin perempuan',
            groomShort: 'Nama panggilan pengantin lelaki', brideShort: 'Nama panggilan pengantin perempuan',
            groomParents: 'Nama keluarga pengantin lelaki', brideParents: 'Nama keluarga pengantin perempuan',
            opening: 'Kata pembuka', showBismillah: 'Paparkan Bismillah',
            dateLabel: 'Paparan tarikh', dateSample: 'Sabtu, 12 Disember 2026',
            timeLabel: 'Paparan masa', timeSample: '12:00 tengah hari – 4:00 petang',
            hijri: 'Tarikh Hijrah', akadDT: 'Akad Nikah (tarikh & masa)', receptionDT: 'Majlis / Resepsi (untuk kira detik)',
            venueName: 'Nama lokasi', address: 'Alamat penuh',
            mapsLink: 'Pautan Google Maps', wazeLink: 'Pautan Waze',
            mapsHint: 'Tampal pautan Google Maps lokasi anda untuk paparan peta & pin yang tepat.',
            programHint: 'Susun perjalanan majlis mengikut waktu.',
            time: 'Waktu', event: 'Acara', addRow: 'Tambah baris',
            name: 'Nama', role: 'Hubungan / peranan', addContact: 'Tambah nombor',
            bankName: 'Nama bank', accountName: 'Nama pemilik akaun', accountNo: 'No. akaun',
            note: 'Nota ringkas',
            giftRegistryHint: 'Senaraikan hadiah yang anda idamkan. Tetamu boleh lihat & tempah sebagai tanda ingatan.',
            wishTitle: 'Tajuk hadiah', wishNote: 'Nota (pilihan)', wishUrl: 'Pautan (pilihan)', addGift: 'Tambah hadiah',
            sectionsHint: 'Bahagian yang dimatikan tidak akan dipaparkan pada kad langsung.',
            off: 'dimatikan',
            allowRsvp: 'Benarkan tetamu RSVP',
            rsvpDesc: 'Apabila dihidupkan, butang RSVP akan muncul pada kad. Tetamu boleh sahkan kehadiran terus dari telefon mereka.',
            manageGuests: 'Urus tetamu & senarai RSVP',
        },
        en: {
            tabs: { butiran: 'Details', lokasi: 'Date & Location', atur: 'Run of show', hubungi: 'Contacts', gift: 'Cash Gift', hadiah: 'Gift Registry', media: 'Gallery & Music', bahagian: 'Sections', rsvp: 'RSVP' } as Record<TabId, string>,
            sub: { butiran: 'Names, family & opening words', lokasi: 'Date, time & venue', atur: 'Run of show by time', hubungi: 'People to contact', gift: 'Bank details for cash gifts', hadiah: 'Your dream gift registry', media: 'Cover, gallery & music', bahagian: 'Turn card sections on or off', rsvp: 'Let guests confirm attendance' } as Record<TabId, string>,
            sec: { opening: 'Opening words', program: 'Run of show', location: 'Location', wishes: 'Wishes / Guestbook', wishlist: 'Gift Registry', contacts: 'Contacts', gift: 'Cash Gift', gallery: 'Gallery', rsvp: 'RSVP' } as Record<string, string>,
            published: 'Published', draft: 'Draft',
            guests: 'Guests', tables: 'Tables', openLive: 'Open live', more: 'More',
            setDraft: 'Set as draft', publish: 'Publish',
            saved: 'Saved', saving: 'Saving…', save: 'Save',
            template: 'Template',
            gCouple: 'The Couple', gFamily: 'Family', gOpening: 'Opening', gWhen: 'Date & Time', gWhere: 'Venue', gInteract: 'Interaction',
            groomName: "Groom's full name", brideName: "Bride's full name",
            groomShort: "Groom's short name", brideShort: "Bride's short name",
            groomParents: "Groom's parents (Bin)", brideParents: "Bride's parents (Binti)",
            opening: 'Opening words', showBismillah: 'Show Bismillah',
            dateLabel: 'Date label', dateSample: 'Saturday, 12 December 2026',
            timeLabel: 'Time label', timeSample: '12:00 noon – 4:00 pm',
            hijri: 'Hijri date', akadDT: 'Akad Nikah (date & time)', receptionDT: 'Reception (used for countdown)',
            venueName: 'Venue name', address: 'Address',
            mapsLink: 'Google Maps link', wazeLink: 'Waze link',
            mapsHint: 'Paste your Google Maps link for an accurate map & pin.',
            programHint: 'Arrange the run of show by time.',
            time: 'Time', event: 'Event', addRow: 'Add row',
            name: 'Name', role: 'Role', addContact: 'Add contact',
            bankName: 'Bank name', accountName: 'Account holder name', accountNo: 'Account number',
            note: 'Note',
            giftRegistryHint: 'List the gifts you would love. Guests can view & reserve them as a token of remembrance.',
            wishTitle: 'Gift title', wishNote: 'Note (optional)', wishUrl: 'Link (optional)', addGift: 'Add gift',
            sectionsHint: 'Sections switched off will not appear on the live card.',
            off: 'off',
            allowRsvp: 'Allow guests to RSVP',
            rsvpDesc: 'When on, an RSVP button appears on the card. Guests can confirm attendance right from their phone.',
            manageGuests: 'Manage guests & RSVP list',
        },
    })[lang];

    if (!inv) return <div className="loading-screen"><div className="spinner" /></div>;

    const set = (patch: Partial<Inv>) => setInv({ ...inv, ...patch });

    async function save(extra: Partial<Inv> = {}) {
        setSaving(true);
        const payload = { ...inv, ...extra };
        try {
            const r = await api.put<Inv>(`/invitations/${id}`, payload);
            setInv(r.data);
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
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
    function setRsvp(val: boolean) {
        set({ rsvp_enabled: val });
        void save({ rsvp_enabled: val });
    }

    const tabOff = (t: (typeof TABS)[number]): boolean => {
        if (t.rsvp) return !inv.rsvp_enabled;
        if (t.sectionKey) return !secOn(t.sectionKey);
        return false;
    };

    const program = inv.program ?? [];
    const contacts = inv.contacts ?? [];
    const wishlist = inv.wishlist ?? [];

    // ---- Header action buttons (reused inline on wide, in the menu on narrow) ----
    const saveBtn = (
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => save()}>
            {saved ? <><Check size={15} /> {C.saved}</> : <><Save size={15} /> {saving ? C.saving : C.save}</>}
        </button>
    );

    return (
        <div className="pke">
            <style>{PKE_CSS}</style>

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
                        <Link to={`/panel/cards/${id}/seating`} className="btn btn-ghost btn-sm" title={isPremium ? undefined : 'Premium'}>
                            <Armchair size={14} /> {C.tables}
                            {!isPremium && <Lock size={12} style={{ marginLeft: 4, opacity: 0.7 }} />}
                        </Link>
                        {inv.status === 'published' && (
                            <a href={`/e/${inv.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> {C.openLive}</a>
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
                                        {!isPremium && <Lock size={13} className="sp" style={{ opacity: 0.7 }} />}
                                    </Link>
                                    {inv.status === 'published' && (
                                        <a href={`/e/${inv.slug}`} target="_blank" rel="noreferrer" className="pke-menu-item" role="menuitem" onClick={() => setMoreOpen(false)}>
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

            {/* ---------- Preview hero ---------- */}
            <div className="pke-stage">
                <LivePreview
                    inv={inv}
                    baseKey={templates.find((t) => t.key === inv.template_key)?.base_key ?? undefined}
                    templateConfig={templates.find((t) => t.key === inv.template_key)?.config ?? undefined}
                />
            </div>

            {/* ---------- Bottom dock toolbar ---------- */}
            <nav className="pke-dock" aria-label={lang === 'bm' ? 'Bahagian kad' : 'Card sections'}>
                <div className="pke-dock-track">
                    {TABS.map((t) => {
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

            {/* ---------- Sheets ---------- */}
            <EditorSheet open={openTab === 'butiran'} onClose={() => setOpenTab(null)} title={C.tabs.butiran} subtitle={C.sub.butiran}>
                <div className="field">
                    <label>{C.template}</label>
                    <select value={inv.template_key} onChange={(e) => {
                        const nt = templates.find((t) => t.key === e.target.value);
                        // Adopt a contributed design's palette; built-ins clear it (own defaults).
                        set({ template_key: e.target.value, palette: (nt?.palette as Palette | undefined) ?? undefined });
                    }}>
                        {templates.map((t) => <option key={t.id} value={t.key}>{t.name}</option>)}
                    </select>
                </div>
                <div className="pke-glabel">{C.gCouple}</div>
                <Row label={C.groomName} v={inv.groom_name} on={(v) => set({ groom_name: v })} />
                <Row label={C.brideName} v={inv.bride_name} on={(v) => set({ bride_name: v })} />
                <Row label={C.groomShort} v={inv.groom_short} on={(v) => set({ groom_short: v })} />
                <Row label={C.brideShort} v={inv.bride_short} on={(v) => set({ bride_short: v })} />
                <div className="pke-glabel">{C.gFamily}</div>
                <Row label={C.groomParents} v={inv.groom_parents} on={(v) => set({ groom_parents: v })} />
                <Row label={C.brideParents} v={inv.bride_parents} on={(v) => set({ bride_parents: v })} />
                <div className="pke-glabel">{C.gOpening}</div>
                <div className="field">
                    <label>{C.opening}</label>
                    <textarea rows={2} value={inv.opening_line ?? ''} onChange={(e) => set({ opening_line: e.target.value })} />
                </div>
                <label className="row" style={{ fontSize: 14 }}>
                    <input type="checkbox" checked={inv.bismillah} onChange={(e) => set({ bismillah: e.target.checked })} /> {C.showBismillah}
                </label>
            </EditorSheet>

            <EditorSheet open={openTab === 'lokasi'} onClose={() => setOpenTab(null)} title={C.tabs.lokasi} subtitle={C.sub.lokasi}>
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
            </EditorSheet>

            <EditorSheet open={openTab === 'atur'} onClose={() => setOpenTab(null)} title={C.tabs.atur} subtitle={C.sub.atur}>
                <p className="pke-hint">{C.programHint}</p>
                {program.map((p, i) => (
                    <div className="row" key={i} style={{ marginBottom: 8 }}>
                        <input style={inpS} placeholder={C.time} value={p.time} onChange={(e) => { const n = [...program]; n[i] = { ...p, time: e.target.value }; set({ program: n }); }} />
                        <input style={{ ...inpS, flex: 2 }} placeholder={C.event} value={p.title} onChange={(e) => { const n = [...program]; n[i] = { ...p, title: e.target.value }; set({ program: n }); }} />
                        <button className="btn btn-ghost btn-sm" aria-label={C.event} onClick={() => set({ program: program.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                    </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => set({ program: [...program, { time: '', title: '' }] })}><Plus size={14} /> {C.addRow}</button>
            </EditorSheet>

            <EditorSheet open={openTab === 'hubungi'} onClose={() => setOpenTab(null)} title={C.tabs.hubungi} subtitle={C.sub.hubungi}>
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
            </EditorSheet>

            <EditorSheet open={openTab === 'gift'} onClose={() => setOpenTab(null)} title={C.tabs.gift} subtitle={C.sub.gift}>
                <Row label={C.bankName} v={inv.gift?.bankName} on={(v) => set({ gift: { ...inv.gift, bankName: v } })} />
                <Row label={C.accountName} v={inv.gift?.accountName} on={(v) => set({ gift: { ...inv.gift, accountName: v } })} />
                <Row label={C.accountNo} v={inv.gift?.accountNo} on={(v) => set({ gift: { ...inv.gift, accountNo: v } })} />
                <Row label={C.note} v={inv.gift?.note} on={(v) => set({ gift: { ...inv.gift, note: v } })} />
            </EditorSheet>

            <EditorSheet open={openTab === 'hadiah'} onClose={() => setOpenTab(null)} title={C.tabs.hadiah} subtitle={C.sub.hadiah}>
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
            </EditorSheet>

            <EditorSheet open={openTab === 'media'} onClose={() => setOpenTab(null)} title={C.tabs.media} subtitle={C.sub.media}>
                <MediaPanel
                    invitationId={id}
                    coverImage={inv.cover_image}
                    galleryImages={inv.gallery_images}
                    musicUrl={inv.music_url}
                    onSaved={setInv}
                />
            </EditorSheet>

            {/* Bahagian — section on/off switches */}
            <EditorSheet open={openTab === 'bahagian'} onClose={() => setOpenTab(null)} title={C.tabs.bahagian} subtitle={C.sub.bahagian}>
                <p className="pke-hint">{C.sectionsHint}</p>
                <div className="pke-toggle-list">
                    {SECTION_KEYS.map((key) => (
                        <ToggleRow key={key} label={C.sec[key]} on={secOn(key)} onChange={(v) => setSection(key, v)} />
                    ))}
                </div>
                <div className="pke-glabel">{C.gInteract}</div>
                <div className="pke-toggle-list">
                    <ToggleRow label={C.sec.rsvp} hint={C.rsvpDesc} on={inv.rsvp_enabled} onChange={setRsvp} />
                </div>
            </EditorSheet>

            {/* RSVP — dedicated switch + manage link */}
            <EditorSheet open={openTab === 'rsvp'} onClose={() => setOpenTab(null)} title={C.tabs.rsvp} subtitle={C.sub.rsvp}>
                <p className="pke-hint">{C.rsvpDesc}</p>
                <div className="pke-toggle-list">
                    <ToggleRow label={C.allowRsvp} on={inv.rsvp_enabled} onChange={setRsvp} />
                </div>
                <Link to={`/panel/cards/${id}/guests`} className="btn btn-ghost btn-block" style={{ marginTop: 18 }}>
                    <Users size={16} /> {C.manageGuests}
                </Link>
            </EditorSheet>
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

/** iOS-style on/off row — indigo when on. */
function ToggleRow({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="pke-toggle-row">
            <div className="pke-toggle-l">
                <div className="pke-toggle-label">{label}</div>
                {hint && <div className="pke-toggle-hint">{hint}</div>}
            </div>
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
        </div>
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

/* Group label inside sheets */
.pke-glabel { font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--plum); margin: 22px 0 12px; display: flex; align-items: center; gap: 10px; }
.pke-glabel:first-child { margin-top: 4px; }
.pke-glabel::after { content: ''; flex: 1; height: 1px; background: var(--line); }
.pke-hint { color: var(--muted); font-size: 13px; line-height: 1.55; margin: 0 0 16px; }

/* iOS switch */
.pke-toggle-list { display: flex; flex-direction: column; }
.pke-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 2px; border-bottom: 1px solid var(--line); }
.pke-toggle-row:last-child { border-bottom: 0; }
.pke-toggle-l { min-width: 0; }
.pke-toggle-label { font-size: 15px; font-weight: 600; color: var(--ink); }
.pke-toggle-hint { font-size: 12.5px; color: var(--muted); margin-top: 3px; line-height: 1.45; }
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
@media (max-width: 400px) {
    .pke-tab { min-width: 52px; }
    .pke-tab .lbl { font-size: 10px; }
}
@media print { .pke-dock { display: none !important; } }
`;
