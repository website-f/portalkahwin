import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Check, Trash2, Download, QrCode, ExternalLink, Armchair, ScanLine } from 'lucide-react';
import { api } from '../../lib/api';

interface Guest {
    id: string; name: string; phone?: string; pax: number;
    status: 'attending' | 'declined'; attended: boolean; message?: string; responded_at?: string;
}
interface Summary { responses: number; attending: number; declined: number; pax: number; checked_in: number; }

export function GuestList() {
    const { id = '' } = useParams();
    const [guests, setGuests] = useState<Guest[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [slug, setSlug] = useState('');
    const [qr, setQr] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'attending' | 'declined'>('all');

    function load() {
        api.get(`/invitations/${id}/guests`).then((r) => { setGuests(r.data.guests); setSummary(r.data.summary); });
    }
    useEffect(() => {
        Promise.all([api.get(`/invitations/${id}/guests`), api.get(`/invitations/${id}`)]).then(([g, inv]) => {
            setGuests(g.data.guests); setSummary(g.data.summary);
            setSlug(inv.data.slug);
            const url = `${window.location.origin}/e/${inv.data.slug}`;
            QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: '#3d1a30', light: '#ffffff' } }).then(setQr);
        }).finally(() => setLoading(false));
    }, [id]);

    async function toggleCheckIn(g: Guest) {
        const r = await api.post(`/guests/${g.id}/checkin`);
        setGuests((gs) => gs.map((x) => (x.id === g.id ? { ...x, attended: r.data.attended } : x)));
        load();
    }
    async function remove(g: Guest) {
        if (!confirm(`Padam ${g.name}?`)) return;
        await api.delete(`/guests/${g.id}`);
        setGuests((gs) => gs.filter((x) => x.id !== g.id));
        load();
    }
    async function exportCsv() {
        const r = await api.get(`/invitations/${id}/guests/export`, { responseType: 'blob' });
        const url = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = url; a.download = 'senarai-tetamu.csv'; a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    const rows = guests.filter((g) => filter === 'all' || g.status === filter);

    return (
        <div>
            <div className="page-head spread">
                <div className="row">
                    <Link to={`/app/cards/${id}/edit`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div><h1 style={{ fontSize: 26 }}>Senarai Tetamu</h1><p className="muted" style={{ margin: 0, fontSize: 13 }}>RSVP, check-in & ucapan</p></div>
                </div>
                <div className="row wrap">
                    <Link to={`/app/cards/${id}/checkin`} className="btn btn-ghost btn-sm"><ScanLine size={15} /> Imbas Check-in</Link>
                    <Link to={`/app/cards/${id}/passes`} className="btn btn-ghost btn-sm"><QrCode size={15} /> Pas QR</Link>
                    <Link to={`/app/cards/${id}/seating`} className="btn btn-ghost btn-sm"><Armchair size={15} /> Susunan Meja</Link>
                    <button className="btn btn-ghost btn-sm" onClick={exportCsv}><Download size={15} /> CSV</button>
                </div>
            </div>

            {summary && (
                <div className="stat-grid" style={{ marginBottom: 20 }}>
                    <div className="stat"><div className="n">{summary.responses}</div><div className="l">Respons</div></div>
                    <div className="stat"><div className="n">{summary.attending}</div><div className="l">Hadir</div></div>
                    <div className="stat"><div className="n">{summary.pax}</div><div className="l">Jumlah Pax</div></div>
                    <div className="stat"><div className="n">{summary.declined}</div><div className="l">Tidak Hadir</div></div>
                    <div className="stat"><div className="n">{summary.checked_in}</div><div className="l">Check-in</div></div>
                </div>
            )}

            <div className="grid-side">
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="row wrap" style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
                        {(['all', 'attending', 'declined'] as const).map((f) => (
                            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
                                {f === 'all' ? 'Semua' : f === 'attending' ? 'Hadir' : 'Tidak Hadir'}
                            </button>
                        ))}
                    </div>
                    <div className="table-wrap">
                    <table className="table" style={{ border: 0 }}>
                        <thead><tr><th>Nama</th><th>Pax</th><th>Status</th><th>Ucapan</th><th></th></tr></thead>
                        <tbody>
                            {rows.length === 0 && <tr><td colSpan={5} className="muted center" style={{ padding: 26 }}>Belum ada RSVP.</td></tr>}
                            {rows.map((g) => (
                                <tr key={g.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{g.name}</div>
                                        {g.phone && <div className="muted" style={{ fontSize: 12 }}>{g.phone}</div>}
                                    </td>
                                    <td>{g.pax}</td>
                                    <td>
                                        {g.status === 'attending'
                                            ? <span className="badge badge-ok">Hadir</span>
                                            : <span className="badge badge-bad">Tak Hadir</span>}
                                        {g.attended && <div><span className="badge" style={{ marginTop: 4 }}>✓ Check-in</span></div>}
                                    </td>
                                    <td className="muted" style={{ maxWidth: 220, fontSize: 13 }}>{g.message}</td>
                                    <td>
                                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                                            {g.status === 'attending' && (
                                                <button className={`btn btn-sm ${g.attended ? 'btn-gold' : 'btn-ghost'}`} onClick={() => toggleCheckIn(g)}>
                                                    <Check size={14} /> {g.attended ? 'Hadir' : 'Check-in'}
                                                </button>
                                            )}
                                            <button className="btn btn-ghost btn-sm" onClick={() => remove(g)} style={{ color: 'var(--bad)' }}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>

                <div className="panel center">
                    <h3 style={{ margin: '0 0 10px', display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}><QrCode size={18} /> Kod QR Kad</h3>
                    {qr ? <img src={qr} alt="QR kad" style={{ width: 200, height: 200 }} /> : <div className="spinner" />}
                    <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Imbas untuk buka kad / check-in</p>
                    {slug && <a href={`/e/${slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }}><ExternalLink size={14} /> Buka Kad</a>}
                    {qr && <a href={qr} download="qr-kad.png" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }}><Download size={14} /> Muat Turun QR</a>}
                </div>
            </div>
        </div>
    );
}
