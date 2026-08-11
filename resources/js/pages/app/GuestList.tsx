import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Check, Trash2, Download, QrCode, ExternalLink, Armchair, ScanLine } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../context/LangContext';

interface Guest {
    id: string; name: string; phone?: string; pax: number;
    status: 'attending' | 'declined'; attended: boolean; message?: string; responded_at?: string;
}
interface Summary { responses: number; attending: number; declined: number; pax: number; checked_in: number; }

export function GuestList() {
    const { id = '' } = useParams();
    const { lang } = useLang();
    const [guests, setGuests] = useState<Guest[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [slug, setSlug] = useState('');
    const [qr, setQr] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'attending' | 'declined'>('all');

    const C = ({
        bm: {
            title: 'Senarai Tetamu', subtitle: 'RSVP, check-in & ucapan',
            scanCheckin: 'Imbas Check-in', qrPasses: 'Pas QR', seating: 'Susunan Meja', csv: 'CSV',
            responses: 'Respons', attending: 'Hadir', totalPax: 'Jumlah Pax', notAttending: 'Tidak Hadir', checkin: 'Check-in',
            all: 'Semua', name: 'Nama', pax: 'Pax', status: 'Status', wishes: 'Ucapan',
            noRsvp: 'Belum ada RSVP.', declined: 'Tak Hadir',
            cardQr: 'Kod QR Kad', scanToOpen: 'Imbas untuk buka kad / check-in', openCard: 'Buka Kad', downloadQr: 'Muat Turun QR',
            deleteConfirm: (name: string) => `Padam ${name}?`,
        },
        en: {
            title: 'Guest List', subtitle: 'RSVP, check-in & wishes',
            scanCheckin: 'Scan check-in', qrPasses: 'QR passes', seating: 'Seating', csv: 'CSV',
            responses: 'Responses', attending: 'Attending', totalPax: 'Total pax', notAttending: 'Not attending', checkin: 'Check-in',
            all: 'All', name: 'Name', pax: 'Pax', status: 'Status', wishes: 'Wishes',
            noRsvp: 'No RSVP yet.', declined: 'Declined',
            cardQr: 'Card QR code', scanToOpen: 'Scan to open the card / check in', openCard: 'Open card', downloadQr: 'Download QR',
            deleteConfirm: (name: string) => `Delete ${name}?`,
        },
    })[lang];

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
        if (!confirm(C.deleteConfirm(g.name))) return;
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
                    <div><h1 style={{ fontSize: 26 }}>{C.title}</h1><p className="muted" style={{ margin: 0, fontSize: 13 }}>{C.subtitle}</p></div>
                </div>
                <div className="row wrap">
                    <Link to={`/app/cards/${id}/checkin`} className="btn btn-ghost btn-sm"><ScanLine size={15} /> {C.scanCheckin}</Link>
                    <Link to={`/app/cards/${id}/passes`} className="btn btn-ghost btn-sm"><QrCode size={15} /> {C.qrPasses}</Link>
                    <Link to={`/app/cards/${id}/seating`} className="btn btn-ghost btn-sm"><Armchair size={15} /> {C.seating}</Link>
                    <button className="btn btn-ghost btn-sm" onClick={exportCsv}><Download size={15} /> {C.csv}</button>
                </div>
            </div>

            {summary && (
                <div className="stat-grid" style={{ marginBottom: 20 }}>
                    <div className="stat"><div className="n">{summary.responses}</div><div className="l">{C.responses}</div></div>
                    <div className="stat"><div className="n">{summary.attending}</div><div className="l">{C.attending}</div></div>
                    <div className="stat"><div className="n">{summary.pax}</div><div className="l">{C.totalPax}</div></div>
                    <div className="stat"><div className="n">{summary.declined}</div><div className="l">{C.notAttending}</div></div>
                    <div className="stat"><div className="n">{summary.checked_in}</div><div className="l">{C.checkin}</div></div>
                </div>
            )}

            <div className="grid-side">
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="row wrap" style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
                        {(['all', 'attending', 'declined'] as const).map((f) => (
                            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
                                {f === 'all' ? C.all : f === 'attending' ? C.attending : C.notAttending}
                            </button>
                        ))}
                    </div>
                    <div className="table-wrap">
                    <table className="table" style={{ border: 0 }}>
                        <thead><tr><th>{C.name}</th><th>{C.pax}</th><th>{C.status}</th><th>{C.wishes}</th><th></th></tr></thead>
                        <tbody>
                            {rows.length === 0 && <tr><td colSpan={5} className="muted center" style={{ padding: 26 }}>{C.noRsvp}</td></tr>}
                            {rows.map((g) => (
                                <tr key={g.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{g.name}</div>
                                        {g.phone && <div className="muted" style={{ fontSize: 12 }}>{g.phone}</div>}
                                    </td>
                                    <td>{g.pax}</td>
                                    <td>
                                        {g.status === 'attending'
                                            ? <span className="badge badge-ok">{C.attending}</span>
                                            : <span className="badge badge-bad">{C.declined}</span>}
                                        {g.attended && <div><span className="badge" style={{ marginTop: 4 }}>✓ {C.checkin}</span></div>}
                                    </td>
                                    <td className="muted" style={{ maxWidth: 220, fontSize: 13 }}>{g.message}</td>
                                    <td>
                                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                                            {g.status === 'attending' && (
                                                <button className={`btn btn-sm ${g.attended ? 'btn-gold' : 'btn-ghost'}`} onClick={() => toggleCheckIn(g)}>
                                                    <Check size={14} /> {g.attended ? C.attending : C.checkin}
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
                    <h3 style={{ margin: '0 0 10px', display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}><QrCode size={18} /> {C.cardQr}</h3>
                    {qr ? <img src={qr} alt="QR kad" style={{ width: 200, height: 200 }} /> : <div className="spinner" />}
                    <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{C.scanToOpen}</p>
                    {slug && <a href={`/e/${slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }}><ExternalLink size={14} /> {C.openCard}</a>}
                    {qr && <a href={qr} download="qr-kad.png" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }}><Download size={14} /> {C.downloadQr}</a>}
                </div>
            </div>
        </div>
    );
}
