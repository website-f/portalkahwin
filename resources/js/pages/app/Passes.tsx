import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Printer, ScanLine } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../context/LangContext';

interface Guest { id: string; name: string; pax: number; status: string; }

export function Passes() {
    const { id = '' } = useParams();
    const { lang } = useLang();
    const [guests, setGuests] = useState<Guest[]>([]);
    const [qr, setQr] = useState<Record<string, string>>({});
    const [couple, setCouple] = useState('');
    const [loading, setLoading] = useState(true);

    const C = ({
        bm: {
            title: 'Pas QR Tetamu', passes: 'pas', scanOnDay: 'untuk imbas kehadiran pada hari majlis',
            scan: 'Imbas', print: 'Cetak', noGuests: 'Belum ada tetamu hadir untuk dijadikan pas.', pax: 'orang',
        },
        en: {
            title: 'Guest QR passes', passes: 'passes', scanOnDay: 'scan to check in on the event day',
            scan: 'Scan', print: 'Print', noGuests: 'No attending guests yet to generate passes.', pax: 'pax',
        },
    })[lang];

    useEffect(() => {
        Promise.all([api.get(`/invitations/${id}/guests`), api.get(`/invitations/${id}`)]).then(async ([g, inv]) => {
            const list: Guest[] = g.data.guests.filter((x: Guest) => x.status === 'attending');
            setGuests(list);
            setCouple(`${inv.data.bride_name} & ${inv.data.groom_name}`);
            const entries = await Promise.all(
                list.map(async (x) => [x.id, await QRCode.toDataURL('PKG:' + x.id, { width: 220, margin: 1, color: { dark: '#3d1a30', light: '#ffffff' } })] as const)
            );
            setQr(Object.fromEntries(entries));
        }).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-head spread no-print">
                <div className="row">
                    <Link to={`/panel/cards/${id}/guests`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div>
                        <h1 style={{ fontSize: 26 }}>{C.title}</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>{guests.length} {C.passes} · {C.scanOnDay}</p>
                    </div>
                </div>
                <div className="row">
                    <Link to={`/panel/cards/${id}/checkin`} className="btn btn-ghost btn-sm"><ScanLine size={15} /> {C.scan}</Link>
                    <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer size={15} /> {C.print}</button>
                </div>
            </div>

            {guests.length === 0 ? (
                <div className="panel center" style={{ padding: 40 }}><p className="muted">{C.noGuests}</p></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
                    {guests.map((g) => (
                        <div key={g.id} className="pass-card" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, textAlign: 'center', background: '#fff', breakInside: 'avoid' }}>
                            <div className="muted" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{couple}</div>
                            {qr[g.id] && <img src={qr[g.id]} alt="" style={{ width: 150, height: 150, margin: '8px 0' }} />}
                            <div style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontSize: 18 }}>{g.name}</div>
                            <div className="muted" style={{ fontSize: 13 }}>{g.pax} {C.pax}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
