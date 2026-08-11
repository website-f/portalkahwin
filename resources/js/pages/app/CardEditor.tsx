import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ExternalLink, Plus, Trash2, Check, Users, Armchair } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaPanel } from '../../components/MediaPanel';

interface ProgramItem { time: string; title: string; }
interface Contact { name: string; role?: string; phone: string; }
interface Inv {
    id: string; slug: string; template_key: string; status: 'draft' | 'published';
    groom_name: string; bride_name: string; groom_short?: string; bride_short?: string;
    groom_parents?: string; bride_parents?: string; opening_line?: string; bismillah: boolean;
    date_label?: string; time_label?: string; hijri_label?: string; reception_at?: string;
    venue_name?: string; venue_address?: string; maps_url?: string; waze_url?: string;
    program?: ProgramItem[]; contacts?: Contact[];
    gift?: { bankName?: string; accountName?: string; accountNo?: string; note?: string };
    rsvp_enabled: boolean;
    cover_image?: string | null;
    gallery_images?: string[] | null;
    music_url?: string | null;
}
interface Tpl { id: string; key: string; name: string; }

export function CardEditor() {
    const { id = '' } = useParams();
    const [inv, setInv] = useState<Inv | null>(null);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        Promise.all([api.get<Inv>(`/invitations/${id}`), api.get<Tpl[]>('/templates')])
            .then(([i, t]) => { setInv(i.data); setTemplates(t.data); });
    }, [id]);

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

    return (
        <div>
            <div className="page-head spread">
                <div className="row">
                    <Link to="/app" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div>
                        <h1 style={{ fontSize: 24 }}>{inv.bride_name} & {inv.groom_name}</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>/e/{inv.slug} · {inv.status === 'published' ? 'Diterbitkan' : 'Draf'}</p>
                    </div>
                </div>
                <div className="row wrap">
                    <Link to={`/app/cards/${id}/guests`} className="btn btn-ghost btn-sm"><Users size={14} /> Tetamu</Link>
                    <Link to={`/app/cards/${id}/seating`} className="btn btn-ghost btn-sm"><Armchair size={14} /> Meja</Link>
                    {inv.status === 'published' && (
                        <a href={`/e/${inv.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> Lihat</a>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => save({ status: inv.status === 'published' ? 'draft' : 'published' })}>
                        {inv.status === 'published' ? 'Jadikan Draf' : 'Terbitkan'}
                    </button>
                    <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => save()}>
                        {saved ? <><Check size={15} /> Disimpan</> : <><Save size={15} /> {saving ? 'Menyimpan…' : 'Simpan'}</>}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                {/* Butiran */}
                <div className="panel">
                    <h3>Butiran Pengantin</h3>
                    <div className="field"><label>Templat</label>
                        <select value={inv.template_key} onChange={(e) => set({ template_key: e.target.value })}>
                            {templates.map((t) => <option key={t.id} value={t.key}>{t.name}</option>)}
                        </select>
                    </div>
                    <Row label="Nama penuh lelaki" v={inv.groom_name} on={(v) => set({ groom_name: v })} />
                    <Row label="Nama penuh perempuan" v={inv.bride_name} on={(v) => set({ bride_name: v })} />
                    <Row label="Nama ringkas lelaki" v={inv.groom_short} on={(v) => set({ groom_short: v })} />
                    <Row label="Nama ringkas perempuan" v={inv.bride_short} on={(v) => set({ bride_short: v })} />
                    <Row label="Bin (keluarga lelaki)" v={inv.groom_parents} on={(v) => set({ groom_parents: v })} />
                    <Row label="Binti (keluarga perempuan)" v={inv.bride_parents} on={(v) => set({ bride_parents: v })} />
                    <div className="field"><label>Kata alu-aluan</label>
                        <textarea rows={2} value={inv.opening_line ?? ''} onChange={(e) => set({ opening_line: e.target.value })} />
                    </div>
                    <label className="row" style={{ fontSize: 14 }}>
                        <input type="checkbox" checked={inv.bismillah} onChange={(e) => set({ bismillah: e.target.checked })} /> Papar Bismillah
                    </label>
                </div>

                {/* Tarikh & Lokasi */}
                <div className="panel">
                    <h3>Tarikh & Lokasi</h3>
                    <Row label="Label tarikh" v={inv.date_label} on={(v) => set({ date_label: v })} placeholder="Sabtu, 12 Disember 2026" />
                    <Row label="Label masa" v={inv.time_label} on={(v) => set({ time_label: v })} placeholder="12:00 t/hari – 4:00 petang" />
                    <Row label="Tarikh Hijri" v={inv.hijri_label} on={(v) => set({ hijri_label: v })} />
                    <div className="field"><label>Tarikh & masa majlis (countdown)</label>
                        <input type="datetime-local" value={(inv.reception_at ?? '').slice(0, 16)} onChange={(e) => set({ reception_at: e.target.value })} />
                    </div>
                    <Row label="Nama tempat" v={inv.venue_name} on={(v) => set({ venue_name: v })} />
                    <div className="field"><label>Alamat</label>
                        <textarea rows={2} value={inv.venue_address ?? ''} onChange={(e) => set({ venue_address: e.target.value })} />
                    </div>
                    <Row label="Pautan Google Maps" v={inv.maps_url} on={(v) => set({ maps_url: v })} />
                    <Row label="Pautan Waze" v={inv.waze_url} on={(v) => set({ waze_url: v })} />
                </div>

                {/* Atur Cara */}
                <div className="panel">
                    <h3>Atur Cara Majlis</h3>
                    {program.map((p, i) => (
                        <div className="row" key={i} style={{ marginBottom: 8 }}>
                            <input style={inpS} placeholder="Masa" value={p.time} onChange={(e) => { const n = [...program]; n[i] = { ...p, time: e.target.value }; set({ program: n }); }} />
                            <input style={{ ...inpS, flex: 2 }} placeholder="Acara" value={p.title} onChange={(e) => { const n = [...program]; n[i] = { ...p, title: e.target.value }; set({ program: n }); }} />
                            <button className="btn btn-ghost btn-sm" onClick={() => set({ program: program.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                        </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={() => set({ program: [...program, { time: '', title: '' }] })}><Plus size={14} /> Tambah baris</button>
                </div>

                {/* Hubungi */}
                <div className="panel">
                    <h3>Hubungi</h3>
                    {contacts.map((c, i) => (
                        <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                            <div className="row" style={{ marginBottom: 6 }}>
                                <input style={inpS} placeholder="Nama" value={c.name} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, name: e.target.value }; set({ contacts: n }); }} />
                                <button className="btn btn-ghost btn-sm" onClick={() => set({ contacts: contacts.filter((_, x) => x !== i) })}><Trash2 size={13} /></button>
                            </div>
                            <div className="row">
                                <input style={inpS} placeholder="Peranan" value={c.role ?? ''} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, role: e.target.value }; set({ contacts: n }); }} />
                                <input style={inpS} placeholder="+60…" value={c.phone} onChange={(e) => { const n = [...contacts]; n[i] = { ...c, phone: e.target.value }; set({ contacts: n }); }} />
                            </div>
                        </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={() => set({ contacts: [...contacts, { name: '', role: '', phone: '' }] })}><Plus size={14} /> Tambah kontak</button>
                </div>

                {/* Salam Kaut */}
                <div className="panel">
                    <h3>Salam Kaut (Money Gift)</h3>
                    <Row label="Nama bank" v={inv.gift?.bankName} on={(v) => set({ gift: { ...inv.gift, bankName: v } })} />
                    <Row label="Nama pemilik akaun" v={inv.gift?.accountName} on={(v) => set({ gift: { ...inv.gift, accountName: v } })} />
                    <Row label="No. akaun" v={inv.gift?.accountNo} on={(v) => set({ gift: { ...inv.gift, accountNo: v } })} />
                    <Row label="Nota" v={inv.gift?.note} on={(v) => set({ gift: { ...inv.gift, note: v } })} />
                    <label className="row" style={{ fontSize: 14, marginTop: 8 }}>
                        <input type="checkbox" checked={inv.rsvp_enabled} onChange={(e) => set({ rsvp_enabled: e.target.checked })} /> Benarkan RSVP
                    </label>
                </div>

                <MediaPanel
                    invitationId={id}
                    coverImage={inv.cover_image}
                    galleryImages={inv.gallery_images}
                    musicUrl={inv.music_url}
                    onSaved={setInv}
                />
            </div>
        </div>
    );
}

function Row({ label, v, on, placeholder }: { label: string; v?: string; on: (v: string) => void; placeholder?: string }) {
    return (
        <div className="field">
            <label>{label}</label>
            <input value={v ?? ''} placeholder={placeholder} onChange={(e) => on(e.target.value)} />
        </div>
    );
}

const inpS: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, font: 'inherit', flex: 1, minWidth: 0 };
