import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Check, Trash2, Download, QrCode, ExternalLink, Armchair, ScanLine } from 'lucide-react';
import { api } from '../../lib/api';
import { url as appUrl, absoluteUrl } from '../../lib/base';
import { DataTable, type Column } from '../../components/DataTable';
import { useAuth, can } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

interface Guest {
    id: string; name: string; phone?: string; pax: number;
    status: 'attending' | 'declined'; attended: boolean; message?: string; responded_at?: string;
}
interface Summary { responses: number; attending: number; declined: number; pax: number; checked_in: number; }

export function GuestList() {
    const { id = '' } = useParams();
    const { lang } = useLang();
    const { user } = useAuth();
    const dialog = useDialog();
    // Capabilities, not plan names: an admin can flip these per role.
    const canSeat = can(user, 'seating');
    const canCheckIn = can(user, 'checkin');
    const canPasses = can(user, 'qr_passes');
    const [guests, setGuests] = useState<Guest[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [slug, setSlug] = useState('');
    const [qr, setQr] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'attending' | 'declined'>('all');

    const C = dict({
        bm: {
            title: 'Senarai Tetamu', subtitle: 'Pantau RSVP, kehadiran dan ucapan tetamu.',
            scanCheckin: 'Imbas Kehadiran', qrPasses: 'Pas QR', seating: 'Susun Meja',
            responses: 'Balasan', attending: 'Hadir', totalPax: 'Jumlah Tetamu', notAttending: 'Tidak Hadir', checkin: 'Daftar Masuk',
            all: 'Semua', name: 'Nama', phone: 'Telefon', bilangan: 'Bilangan', status: 'Status', hadir: 'Hadir', wishes: 'Ucapan', yes: 'Ya', no: 'Tidak',
            noRsvp: 'Belum ada jawapan RSVP.', declined: 'Tidak Hadir',
            cardQr: 'Kod QR Kad', scanToOpen: 'Imbas untuk buka kad atau daftar masuk', openCard: 'Buka Kad', downloadQr: 'Muat Turun QR',
            deleteConfirm: (name: string) => `Padam ${name}?`,
        },
        en: {
            title: 'Guest List', subtitle: 'RSVP, check-in & wishes',
            scanCheckin: 'Scan check-in', qrPasses: 'QR passes', seating: 'Seating',
            responses: 'Responses', attending: 'Attending', totalPax: 'Total pax', notAttending: 'Not attending', checkin: 'Check-in',
            all: 'All', name: 'Name', phone: 'Phone', bilangan: 'Pax', status: 'Status', hadir: 'Attended', wishes: 'Wishes', yes: 'Yes', no: 'No',
            noRsvp: 'No RSVP yet.', declined: 'Declined',
            cardQr: 'Card QR code', scanToOpen: 'Scan to open the card / check in', openCard: 'Open card', downloadQr: 'Download QR',
            deleteConfirm: (name: string) => `Delete ${name}?`,
        },
        zh: {
            title: '宾客名单', subtitle: '出席回复、签到与祝福',
            scanCheckin: '扫码签到', qrPasses: '二维码入场证', seating: '座位安排',
            responses: '回复数', attending: '出席', totalPax: '总人数', notAttending: '不出席', checkin: '签到',
            all: '全部', name: '姓名', phone: '电话', bilangan: '人数', status: '状态', hadir: '已到场', wishes: '祝福', yes: '是', no: '否',
            noRsvp: '暂无出席回复。', declined: '婉拒',
            cardQr: '请柬二维码', scanToOpen: '扫码打开请柬或办理签到', openCard: '打开请柬', downloadQr: '下载二维码',
            deleteConfirm: (name: string) => `确定删除 ${name}？`,
        },
    }, lang);

    function load() {
        api.get(`/invitations/${id}/guests`).then((r) => { setGuests(r.data.guests); setSummary(r.data.summary); });
    }
    useEffect(() => {
        Promise.all([api.get(`/invitations/${id}/guests`), api.get(`/invitations/${id}`)]).then(([g, inv]) => {
            setGuests(g.data.guests); setSummary(g.data.summary);
            setSlug(inv.data.slug);
            const cardUrl = absoluteUrl(`/e/${inv.data.slug}`);
            QRCode.toDataURL(cardUrl,{ width: 240, margin: 1, color: { dark: '#3d1a30', light: '#ffffff' } }).then(setQr);
        }).finally(() => setLoading(false));
    }, [id]);

    async function toggleCheckIn(g: Guest) {
        const r = await api.post(`/guests/${g.id}/checkin`);
        setGuests((gs) => gs.map((x) => (x.id === g.id ? { ...x, attended: r.data.attended } : x)));
        load();
    }
    async function remove(g: Guest) {
        if (!(await dialog.confirm({ message: C.deleteConfirm(g.name), danger: true }))) return;
        await api.delete(`/guests/${g.id}`);
        setGuests((gs) => gs.filter((x) => x.id !== g.id));
        load();
    }
    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    const rows = guests.filter((g) => filter === 'all' || g.status === filter);

    const guestCols: Column<Guest>[] = [
        { key: 'name', label: C.name, sortable: true, render: (g) => <span style={{ fontWeight: 600 }}>{g.name}</span> },
        { key: 'phone', label: C.phone, render: (g) => <span className="muted">{g.phone || '—'}</span> },
        { key: 'pax', label: C.bilangan, align: 'right', sortable: true, sortValue: (g) => g.pax },
        {
            key: 'status', label: C.status, sortable: true,
            sortValue: (g) => (g.status === 'attending' ? C.attending : C.notAttending),
            render: (g) => (g.status === 'attending'
                ? <span className="badge badge-ok">{C.attending}</span>
                : <span className="badge badge-bad">{C.declined}</span>),
        },
        {
            key: 'attended', label: C.hadir, sortable: true,
            sortValue: (g) => (g.attended ? C.yes : C.no),
            render: (g) => (g.attended
                ? <span className="badge">✓ {C.checkin}</span>
                : <span className="muted">—</span>),
        },
        { key: 'message', label: C.wishes, render: (g) => <span className="muted" style={{ fontSize: 13 }}>{g.message || '—'}</span> },
        {
            key: 'actions', label: '', align: 'right',
            render: (g) => (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                    {g.status === 'attending' && (
                        <button className={`btn btn-sm ${g.attended ? 'btn-gold' : 'btn-ghost'}`} onClick={() => toggleCheckIn(g)}>
                            <Check size={14} /> {g.attended ? C.attending : C.checkin}
                        </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(g)} style={{ color: 'var(--bad)' }}><Trash2 size={14} /></button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <div className="page-head spread">
                <div className="row">
                    <Link to={`/panel/cards/${id}/edit`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div><h1 style={{ fontSize: 26 }}>{C.title}</h1><p className="muted" style={{ margin: 0, fontSize: 13 }}>{C.subtitle}</p></div>
                </div>
                <div className="row wrap">
                    {canCheckIn && <Link to={`/panel/cards/${id}/checkin`} className="btn btn-ghost btn-sm"><ScanLine size={15} /> {C.scanCheckin}</Link>}
                    {canPasses && <Link to={`/panel/cards/${id}/passes`} className="btn btn-ghost btn-sm"><QrCode size={15} /> {C.qrPasses}</Link>}
                    {canSeat && (
                        <Link to={`/panel/cards/${id}/seating`} className="btn btn-ghost btn-sm">
                            <Armchair size={15} /> {C.seating}
                        </Link>
                    )}
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
                    <div style={{ padding: 14 }}>
                        <DataTable
                            columns={guestCols}
                            rows={rows}
                            searchKeys={['name', 'phone']}
                            pageSize={12}
                            empty={C.noRsvp}
                            exportName="senarai-tetamu"
                        />
                    </div>
                </div>

                <div className="panel center">
                    <h3 style={{ margin: '0 0 10px', display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}><QrCode size={18} /> {C.cardQr}</h3>
                    {qr ? <img src={qr} alt="QR kad" style={{ width: 200, height: 200 }} /> : <div className="spinner" />}
                    <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{C.scanToOpen}</p>
                    {slug && <a href={appUrl(`/e/${slug}`)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }}><ExternalLink size={14} /> {C.openCard}</a>}
                    {qr && <a href={qr} download="qr-kad.png" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }}><Download size={14} /> {C.downloadQr}</a>}
                </div>
            </div>
        </div>
    );
}
