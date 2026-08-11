import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ExternalLink, Plus, Trash2, Check, Users, Armchair, Pencil, Eye } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaPanel } from '../../components/MediaPanel';
import { LivePreview } from '../../components/LivePreview';
import { useLang } from '../../context/LangContext';
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
    cover_image?: string | null;
    gallery_images?: string[] | null;
    music_url?: string | null;
    palette?: Palette;
}
interface Tpl { id: string; key: string; name: string; }

type TabId = 'butiran' | 'lokasi' | 'atur' | 'hubungi' | 'gift' | 'hadiah' | 'media';
const TABS: { id: TabId }[] = [
    { id: 'butiran' },
    { id: 'lokasi' },
    { id: 'atur' },
    { id: 'hubungi' },
    { id: 'gift' },
    { id: 'hadiah' },
    { id: 'media' },
];

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
    const [inv, setInv] = useState<Inv | null>(null);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [tab, setTab] = useState<TabId>('butiran');
    const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');

    const isDesktop = useMedia('(min-width: 1024px)');
    const canStick = useMedia('(min-width: 861px)');

    useEffect(() => {
        Promise.all([api.get<Inv>(`/invitations/${id}`), api.get<Tpl[]>('/templates')])
            .then(([i, t]) => { setInv(i.data); setTemplates(t.data); });
    }, [id]);

    const C = ({
        bm: {
            tabs: { butiran: 'Butiran', lokasi: 'Tarikh & Lokasi', atur: 'Atur Cara', hubungi: 'Hubungi', gift: 'Salam Kasih', hadiah: 'Senarai Hadiah', media: 'Galeri & Muzik' } as Record<TabId, string>,
            published: 'Terbit', draft: 'Draf',
            guests: 'Tetamu & RSVP', tables: 'Susun Meja', openLive: 'Lihat Kad',
            setDraft: 'Tukar ke Draf', publish: 'Terbitkan Kad',
            saved: 'Siap disimpan', saving: 'Menyimpan…', save: 'Simpan',
            edit: 'Sunting', preview: 'Pratonton',
            template: 'Rekaan',
            groomName: 'Nama penuh pengantin lelaki', brideName: 'Nama penuh pengantin perempuan',
            groomShort: 'Nama panggilan pengantin lelaki', brideShort: 'Nama panggilan pengantin perempuan',
            groomParents: 'Nama keluarga pengantin lelaki', brideParents: 'Nama keluarga pengantin perempuan',
            opening: 'Kata pembuka', showBismillah: 'Paparkan Bismillah',
            dateLabel: 'Paparan tarikh', dateSample: 'Sabtu, 12 Disember 2026',
            timeLabel: 'Paparan masa', timeSample: '12:00 tengah hari – 4:00 petang',
            hijri: 'Tarikh Hijrah', eventDateTime: 'Tarikh & masa majlis untuk kira detik',
            venueName: 'Nama lokasi', address: 'Alamat penuh',
            mapsLink: 'Pautan Google Maps', wazeLink: 'Pautan Waze',
            mapsHint: 'Tampal pautan Google Maps lokasi anda untuk paparan peta & pin yang tepat.',
            programHint: 'Susun perjalanan majlis mengikut waktu.',
            time: 'Waktu', event: 'Acara', addRow: 'Tambah baris',
            name: 'Nama', role: 'Hubungan / peranan', addContact: 'Tambah nombor',
            bankName: 'Nama bank', accountName: 'Nama pemilik akaun', accountNo: 'No. akaun',
            note: 'Nota ringkas', allowRsvp: 'Benarkan tetamu RSVP',
            giftRegistryHint: 'Senaraikan hadiah yang anda idamkan. Tetamu boleh lihat & tempah sebagai tanda ingatan.',
            wishTitle: 'Tajuk hadiah', wishNote: 'Nota (pilihan)', wishUrl: 'Pautan (pilihan)', addGift: 'Tambah hadiah',
        },
        en: {
            tabs: { butiran: 'Details', lokasi: 'Date & Location', atur: 'Run of show', hubungi: 'Contacts', gift: 'Cash Gift', hadiah: 'Gift Registry', media: 'Gallery & Music' } as Record<TabId, string>,
            published: 'Published', draft: 'Draft',
            guests: 'Guests', tables: 'Tables', openLive: 'Open live',
            setDraft: 'Set as draft', publish: 'Publish',
            saved: 'Saved', saving: 'Saving…', save: 'Save',
            edit: 'Edit', preview: 'Preview',
            template: 'Template',
            groomName: "Groom's full name", brideName: "Bride's full name",
            groomShort: "Groom's short name", brideShort: "Bride's short name",
            groomParents: "Groom's parents (Bin)", brideParents: "Bride's parents (Binti)",
            opening: 'Opening words', showBismillah: 'Show Bismillah',
            dateLabel: 'Date label', dateSample: 'Saturday, 12 December 2026',
            timeLabel: 'Time label', timeSample: '12:00 noon – 4:00 pm',
            hijri: 'Hijri date', eventDateTime: 'Event date & time (countdown)',
            venueName: 'Venue name', address: 'Address',
            mapsLink: 'Google Maps link', wazeLink: 'Waze link',
            mapsHint: 'Paste your Google Maps link for an accurate map & pin.',
            programHint: 'Arrange the run of show by time.',
            time: 'Time', event: 'Event', addRow: 'Add row',
            name: 'Name', role: 'Role', addContact: 'Add contact',
            bankName: 'Bank name', accountName: 'Account holder name', accountNo: 'Account number',
            note: 'Note', allowRsvp: 'Allow RSVP',
            giftRegistryHint: 'List the gifts you would love. Guests can view & reserve them as a token of remembrance.',
            wishTitle: 'Gift title', wishNote: 'Note (optional)', wishUrl: 'Link (optional)', addGift: 'Add gift',
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

    const program = inv.program ?? [];
    const contacts = inv.contacts ?? [];
    const wishlist = inv.wishlist ?? [];

    const headStyle: React.CSSProperties = canStick
        ? {
            position: 'sticky', top: 0, zIndex: 30,
            background: 'rgba(251, 247, 241, 0.92)', backdropFilter: 'blur(8px)',
            borderBottom: '1px solid var(--line)', margin: '-30px -34px 22px', padding: '15px 34px',
        }
        : { marginBottom: 16 };

    // ---- Tabbed editing form (left column / mobile "Sunting") ---------------
    const form = (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="no-scrollbar" style={tabBarS}>
                {TABS.map((t) => (
                    <button key={t.id} style={tabBtnS(tab === t.id)} onClick={() => setTab(t.id)}>
                        {C.tabs[t.id]}
                    </button>
                ))}
            </div>

            <div style={{ padding: 22 }}>
                {tab === 'butiran' && (
                    <>
                        <div className="field"><label>{C.template}</label>
                            <select value={inv.template_key} onChange={(e) => set({ template_key: e.target.value })}>
                                {templates.map((t) => <option key={t.id} value={t.key}>{t.name}</option>)}
                            </select>
                        </div>
                        <Row label={C.groomName} v={inv.groom_name} on={(v) => set({ groom_name: v })} />
                        <Row label={C.brideName} v={inv.bride_name} on={(v) => set({ bride_name: v })} />
                        <Row label={C.groomShort} v={inv.groom_short} on={(v) => set({ groom_short: v })} />
                        <Row label={C.brideShort} v={inv.bride_short} on={(v) => set({ bride_short: v })} />
                        <Row label={C.groomParents} v={inv.groom_parents} on={(v) => set({ groom_parents: v })} />
                        <Row label={C.brideParents} v={inv.bride_parents} on={(v) => set({ bride_parents: v })} />
                        <div className="field"><label>{C.opening}</label>
                            <textarea rows={2} value={inv.opening_line ?? ''} onChange={(e) => set({ opening_line: e.target.value })} />
                        </div>
                        <label className="row" style={{ fontSize: 14 }}>
                            <input type="checkbox" checked={inv.bismillah} onChange={(e) => set({ bismillah: e.target.checked })} /> {C.showBismillah}
                        </label>
                    </>
                )}

                {tab === 'lokasi' && (
                    <>
                        <Row label={C.dateLabel} v={inv.date_label} on={(v) => set({ date_label: v })} placeholder={C.dateSample} />
                        <Row label={C.timeLabel} v={inv.time_label} on={(v) => set({ time_label: v })} placeholder={C.timeSample} />
                        <Row label={C.hijri} v={inv.hijri_label} on={(v) => set({ hijri_label: v })} />
                        <div className="field"><label>{C.eventDateTime}</label>
                            <input type="datetime-local" value={(inv.reception_at ?? '').slice(0, 16)} onChange={(e) => set({ reception_at: e.target.value })} />
                        </div>
                        <Row label={C.venueName} v={inv.venue_name} on={(v) => set({ venue_name: v })} />
                        <div className="field"><label>{C.address}</label>
                            <textarea rows={2} value={inv.venue_address ?? ''} onChange={(e) => set({ venue_address: e.target.value })} />
                        </div>
                        <Row label={C.mapsLink} v={inv.maps_url} on={(v) => set({ maps_url: v })} placeholder="https://maps.google.com/…" hint={C.mapsHint} />
                        <Row label={C.wazeLink} v={inv.waze_url} on={(v) => set({ waze_url: v })} placeholder="https://waze.com/ul/…" />
                    </>
                )}

                {tab === 'atur' && (
                    <>
                        <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>{C.programHint}</p>
                        {program.map((p, i) => (
                            <div className="row" key={i} style={{ marginBottom: 8 }}>
                                <input style={inpS} placeholder={C.time} value={p.time} onChange={(e) => { const n = [...program]; n[i] = { ...p, time: e.target.value }; set({ program: n }); }} />
                                <input style={{ ...inpS, flex: 2 }} placeholder={C.event} value={p.title} onChange={(e) => { const n = [...program]; n[i] = { ...p, title: e.target.value }; set({ program: n }); }} />
                                <button className="btn btn-ghost btn-sm" onClick={() => set({ program: program.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                            </div>
                        ))}
                        <button className="btn btn-ghost btn-sm" onClick={() => set({ program: [...program, { time: '', title: '' }] })}><Plus size={14} /> {C.addRow}</button>
                    </>
                )}

                {tab === 'hubungi' && (
                    <>
                        {contacts.map((c, i) => (
                            <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                                <div className="row" style={{ marginBottom: 6 }}>
                                    <input style={inpS} placeholder={C.name} value={c.name} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, name: e.target.value }; set({ contacts: n }); }} />
                                    <button className="btn btn-ghost btn-sm" onClick={() => set({ contacts: contacts.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                                </div>
                                <div className="row">
                                    <input style={inpS} placeholder={C.role} value={c.role ?? ''} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, role: e.target.value }; set({ contacts: n }); }} />
                                    <input style={inpS} placeholder="+60…" value={c.phone} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, phone: e.target.value }; set({ contacts: n }); }} />
                                </div>
                            </div>
                        ))}
                        <button className="btn btn-ghost btn-sm" onClick={() => set({ contacts: [...contacts, { name: '', role: '', phone: '' }] })}><Plus size={14} /> {C.addContact}</button>
                    </>
                )}

                {tab === 'gift' && (
                    <>
                        <Row label={C.bankName} v={inv.gift?.bankName} on={(v) => set({ gift: { ...inv.gift, bankName: v } })} />
                        <Row label={C.accountName} v={inv.gift?.accountName} on={(v) => set({ gift: { ...inv.gift, accountName: v } })} />
                        <Row label={C.accountNo} v={inv.gift?.accountNo} on={(v) => set({ gift: { ...inv.gift, accountNo: v } })} />
                        <Row label={C.note} v={inv.gift?.note} on={(v) => set({ gift: { ...inv.gift, note: v } })} />
                        <label className="row" style={{ fontSize: 14, marginTop: 8 }}>
                            <input type="checkbox" checked={inv.rsvp_enabled} onChange={(e) => set({ rsvp_enabled: e.target.checked })} /> {C.allowRsvp}
                        </label>
                    </>
                )}

                {tab === 'hadiah' && (
                    <>
                        <p className="muted" style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.5 }}>{C.giftRegistryHint}</p>
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
                )}

                {tab === 'media' && (
                    <MediaPanel
                        invitationId={id}
                        coverImage={inv.cover_image}
                        galleryImages={inv.gallery_images}
                        musicUrl={inv.music_url}
                        onSaved={setInv}
                    />
                )}
            </div>
        </div>
    );

    const preview = <LivePreview inv={inv} />;

    return (
        <div>
            <div className="page-head spread" style={headStyle}>
                <div className="row">
                    <Link to="/app" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div>
                        <h1 style={{ fontSize: 24 }}>{inv.bride_name} & {inv.groom_name}</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>/e/{inv.slug} · {inv.status === 'published' ? C.published : C.draft}</p>
                    </div>
                </div>
                <div className="row wrap">
                    <Link to={`/app/cards/${id}/guests`} className="btn btn-ghost btn-sm"><Users size={14} /> {C.guests}</Link>
                    <Link to={`/app/cards/${id}/seating`} className="btn btn-ghost btn-sm"><Armchair size={14} /> {C.tables}</Link>
                    {inv.status === 'published' && (
                        <a href={`/e/${inv.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> {C.openLive}</a>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => save({ status: inv.status === 'published' ? 'draft' : 'published' })}>
                        {inv.status === 'published' ? C.setDraft : C.publish}
                    </button>
                    <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => save()}>
                        {saved ? <><Check size={15} /> {C.saved}</> : <><Save size={15} /> {saving ? C.saving : C.save}</>}
                    </button>
                </div>
            </div>

            {isDesktop ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 460px', gap: 22, alignItems: 'start' }}>
                    <div>{form}</div>
                    <div style={{ position: 'sticky', top: canStick ? 96 : 16 }}>{preview}</div>
                </div>
            ) : (
                <>
                    <div style={segWrapS}>
                        <button style={segBtnS(mobileView === 'edit')} onClick={() => setMobileView('edit')}>
                            <Pencil size={15} /> {C.edit}
                        </button>
                        <button style={segBtnS(mobileView === 'preview')} onClick={() => setMobileView('preview')}>
                            <Eye size={15} /> {C.preview}
                        </button>
                    </div>
                    {mobileView === 'edit' ? form : preview}
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

const inpS: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, font: 'inherit', flex: 1, minWidth: 0 };

const tabBarS: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', gap: 2, borderBottom: '1px solid var(--line)',
    padding: '2px 6px 0', background: 'var(--cream)',
};
const tabBtnS = (active: boolean): React.CSSProperties => ({
    appearance: 'none', border: 0, background: 'transparent', cursor: 'pointer', flexShrink: 0,
    padding: '11px 12px', fontSize: 13, whiteSpace: 'nowrap',
    fontFamily: 'var(--serif)', fontWeight: active ? 700 : 600,
    color: active ? 'var(--plum)' : 'var(--muted)',
    borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
    marginBottom: -1,
});

const segWrapS: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4,
    background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 999, marginBottom: 16,
};
const segBtnS = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    border: 0, cursor: 'pointer', padding: '9px 12px', borderRadius: 999,
    fontSize: 14, fontWeight: 700,
    background: active ? 'var(--plum)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
});
