import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardDrive, Image as ImageIcon, Music, Plus, Send, ExternalLink, Inbox } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { Drawer } from '../../components/Drawer';
import { useLang, dict } from '../../context/LangContext';

interface Asset {
    id: string;
    path: string;
    url: string;
    size_bytes: number;
    kind: 'image' | 'audio';
    invitation_id: string | null;
    created_at: string;
}
interface Storage {
    used_mb: number;
    quota_mb: number;
    remaining_mb: number;
    assets: Asset[];
}
interface StorageReq {
    id: string;
    requested_mb: number;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    admin_note: string | null;
    created_at: string;
}

/** Pull a human-readable message out of a Laravel validation / error response. */
function apiError(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
    const errors = e?.response?.data?.errors;
    if (errors) {
        const first = Object.values(errors)[0];
        if (first && first[0]) return first[0];
    }
    return e?.response?.data?.message ?? fallback;
}

function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1_048_576).toFixed(2)} MB`;
}

function fileName(path: string): string {
    return path.split('/').pop() || path;
}

export function MyStorage() {
    const { lang } = useLang();
    const [storage, setStorage] = useState<Storage | null>(null);
    const [requests, setRequests] = useState<StorageReq[]>([]);
    const [loading, setLoading] = useState(true);

    const [open, setOpen] = useState(false);
    const [requestedMb, setRequestedMb] = useState(500);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const C = dict({
        bm: {
            title: 'Storan Saya', subtitle: 'Pantau penggunaan storan, fail yang dimuat naik, dan mohon tambah ruang.',
            used: 'Digunakan', remaining: 'Baki', total: 'Jumlah', ofQuota: 'daripada kuota',
            requestMore: 'Mohon Tambah Storan', assets: 'Fail Anda', noAssets: 'Belum ada fail dimuat naik.',
            file: 'Fail', size: 'Saiz', card: 'Kad', date: 'Tarikh', type: 'Jenis',
            image: 'Imej', audio: 'Audio', viewCard: 'Lihat kad',
            drawerTitle: 'Mohon Tambah Storan', requestedMb: 'Storan diminta (MB)', reason: 'Sebab (pilihan)',
            reasonHint: 'Contoh: banyak kad dengan galeri gambar.', mbHint: 'Antara 50 dan 5000 MB.',
            submit: 'Hantar Permohonan', sending: 'Menghantar…', cancel: 'Batal',
            pastRequests: 'Permohonan Lepas', noRequests: 'Tiada permohonan lagi.',
            pending: 'Menunggu', approved: 'Diluluskan', rejected: 'Ditolak',
            hasPending: 'Anda mempunyai permohonan yang sedang diproses.', adminNote: 'Nota admin',
        },
        en: {
            title: 'My Storage', subtitle: 'Track your usage, uploaded files, and request more space.',
            used: 'Used', remaining: 'Remaining', total: 'Total', ofQuota: 'of quota',
            requestMore: 'Request more storage', assets: 'Your files', noAssets: 'No files uploaded yet.',
            file: 'File', size: 'Size', card: 'Card', date: 'Date', type: 'Type',
            image: 'Image', audio: 'Audio', viewCard: 'View card',
            drawerTitle: 'Request more storage', requestedMb: 'Storage requested (MB)', reason: 'Reason (optional)',
            reasonHint: 'e.g. many cards with photo galleries.', mbHint: 'Between 50 and 5000 MB.',
            submit: 'Submit request', sending: 'Sending…', cancel: 'Cancel',
            pastRequests: 'Past requests', noRequests: 'No requests yet.',
            pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
            hasPending: 'You already have a request being reviewed.', adminNote: 'Admin note',
        },
        zh: {
            title: '我的存储空间', subtitle: '查看用量与已上传文件，并可申请扩容。',
            used: '已使用', remaining: '剩余', total: '总容量', ofQuota: '配额',
            requestMore: '申请扩容', assets: '您的文件', noAssets: '尚未上传任何文件。',
            file: '文件', size: '大小', card: '所属请柬', date: '日期', type: '类型',
            image: '图片', audio: '音频', viewCard: '查看请柬',
            drawerTitle: '申请扩容', requestedMb: '申请容量（MB）', reason: '申请理由（可选）',
            reasonHint: '例如：多张请柬且包含大量相册照片。', mbHint: '范围为 50 至 5000 MB。',
            submit: '提交申请', sending: '提交中…', cancel: '取消',
            pastRequests: '历史申请', noRequests: '暂无申请记录。',
            pending: '待审核', approved: '已批准', rejected: '未通过',
            hasPending: '您已有一项申请正在审核中。', adminNote: '管理员备注',
        },
    }, lang);

    function fmtDate(iso: string): string {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function loadRequests() {
        return api.get<StorageReq[]>('/me/storage-requests').then((r) => setRequests(r.data));
    }

    useEffect(() => {
        Promise.all([
            api.get<Storage>('/me/storage').then((r) => setStorage(r.data)),
            loadRequests(),
        ]).finally(() => setLoading(false));
    }, []);

    const hasPending = requests.some((r) => r.status === 'pending');

    async function submitRequest(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await api.post('/me/storage-requests', { requested_mb: requestedMb, reason: reason || null });
            setOpen(false);
            setReason('');
            await loadRequests();
        } catch (err: unknown) {
            setError(apiError(err, lang === 'bm' ? 'Permohonan gagal dihantar.' : 'Failed to send request.'));
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!storage) return <div className="panel">{C.noAssets}</div>;

    const pct = storage.quota_mb > 0 ? Math.min(100, Math.round((storage.used_mb / storage.quota_mb) * 100)) : 0;

    const statusBadge = (s: StorageReq['status']) => {
        if (s === 'approved') return <span className="badge badge-ok">{C.approved}</span>;
        if (s === 'rejected') return <span className="badge badge-bad">{C.rejected}</span>;
        return <span className="badge badge-gold">{C.pending}</span>;
    };

    const assetCols: Column<Asset>[] = [
        {
            key: 'file', label: C.file, sortable: true,
            sortValue: (a) => fileName(a.path),
            render: (a) => (
                <div className="row" style={{ gap: 10 }}>
                    {a.kind === 'image'
                        ? <img src={a.url} alt="" style={thumb} loading="lazy" />
                        : <span style={{ ...thumb, display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)' }}><Music size={18} /></span>}
                    <span style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-all' }}>{fileName(a.path)}</span>
                </div>
            ),
        },
        {
            key: 'kind', label: C.type, sortable: true,
            sortValue: (a) => a.kind,
            render: (a) => (
                <span className="badge">
                    {a.kind === 'image' ? <ImageIcon size={12} /> : <Music size={12} />}
                    {a.kind === 'image' ? C.image : C.audio}
                </span>
            ),
        },
        {
            key: 'size_bytes', label: C.size, align: 'right', sortable: true,
            sortValue: (a) => a.size_bytes,
            render: (a) => <span className="muted">{fmtBytes(a.size_bytes)}</span>,
        },
        {
            key: 'card', label: C.card,
            sortValue: (a) => a.invitation_id ?? '',
            render: (a) => (a.invitation_id
                ? <Link to={`/panel/cards/${a.invitation_id}/edit`} className="btn btn-ghost btn-sm"><ExternalLink size={13} /> {C.viewCard}</Link>
                : <span className="muted">—</span>),
        },
        {
            key: 'created_at', label: C.date, align: 'right', sortable: true,
            sortValue: (a) => a.created_at,
            render: (a) => <span className="muted">{fmtDate(a.created_at)}</span>,
        },
    ];

    return (
        <div>
            <div className="page-head spread">
                <div className="row" style={{ gap: 12 }}>
                    <span style={iconWrap}><HardDrive size={22} color="var(--plum)" /></span>
                    <div>
                        <h1 style={{ fontSize: 26, margin: 0 }}>{C.title}</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>{C.subtitle}</p>
                    </div>
                </div>
                <button className="btn btn-gold" onClick={() => setOpen(true)} disabled={hasPending}>
                    <Plus size={16} /> {C.requestMore}
                </button>
            </div>

            {/* Usage */}
            <div className="panel" style={{ marginBottom: 18 }}>
                <div className="row spread" style={{ marginBottom: 10 }}>
                    <span className="row" style={{ gap: 7, fontSize: 14, fontWeight: 600 }}>
                        <HardDrive size={16} color="var(--plum)" /> {storage.used_mb} MB / {storage.quota_mb} MB {C.ofQuota}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--plum)' }}>{pct}%</span>
                </div>
                <div style={barTrack}>
                    <div style={{ ...barFill, width: `${pct}%` }} />
                </div>

                <div className="stat-grid" style={{ marginTop: 20 }}>
                    <div className="stat"><div className="n">{storage.used_mb}<small style={unit}>MB</small></div><div className="l">{C.used}</div></div>
                    <div className="stat"><div className="n">{storage.remaining_mb}<small style={unit}>MB</small></div><div className="l">{C.remaining}</div></div>
                    <div className="stat"><div className="n">{storage.quota_mb}<small style={unit}>MB</small></div><div className="l">{C.total}</div></div>
                </div>

                {hasPending && <p className="muted" style={{ fontSize: 12, margin: '14px 0 0' }}>{C.hasPending}</p>}
            </div>

            {/* Assets */}
            <div className="panel" style={{ marginBottom: 18 }}>
                <h3 style={{ margin: '0 0 14px' }}>{C.assets}</h3>
                <DataTable
                    columns={assetCols}
                    rows={storage.assets}
                    searchKeys={['path', 'kind']}
                    pageSize={10}
                    empty={C.noAssets}
                    exportName="storan"
                />
            </div>

            {/* Past requests */}
            <div className="panel">
                <h3 style={{ margin: '0 0 14px' }}>{C.pastRequests}</h3>
                {requests.length === 0 ? (
                    <div className="muted center" style={{ padding: 24, display: 'grid', placeItems: 'center', gap: 8 }}>
                        <Inbox size={26} /> {C.noRequests}
                    </div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {requests.map((r) => (
                            <li key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                                <div className="row spread" style={{ gap: 10 }}>
                                    <div className="row" style={{ gap: 10 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--plum)' }}>+{r.requested_mb} MB</span>
                                        <span className="muted" style={{ fontSize: 12 }}>{fmtDate(r.created_at)}</span>
                                    </div>
                                    {statusBadge(r.status)}
                                </div>
                                {r.reason && <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>{r.reason}</p>}
                                {r.admin_note && (
                                    <p style={{ fontSize: 13, margin: '6px 0 0', color: 'var(--ink)' }}>
                                        <strong>{C.adminNote}:</strong> {r.admin_note}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Drawer open={open} onClose={() => setOpen(false)} title={C.drawerTitle}
                footer={
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-ghost" onClick={() => setOpen(false)}>{C.cancel}</button>
                        <button className="btn btn-primary" form="storage-request-form" disabled={busy}>
                            <Send size={15} /> {busy ? C.sending : C.submit}
                        </button>
                    </div>
                }
            >
                <form id="storage-request-form" onSubmit={submitRequest}>
                    <div className="field">
                        <label>{C.requestedMb}</label>
                        <input
                            type="number" min={50} max={5000} step={50}
                            value={requestedMb}
                            onChange={(e) => setRequestedMb(Number(e.target.value))}
                            required
                        />
                        <span className="muted" style={{ fontSize: 12 }}>{C.mbHint}</span>
                    </div>
                    <div className="field">
                        <label>{C.reason}</label>
                        <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={C.reasonHint} />
                    </div>
                    {error && <p className="form-err">{error}</p>}
                </form>
            </Drawer>
        </div>
    );
}

const iconWrap: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 12, background: 'var(--cream)',
    display: 'grid', placeItems: 'center', flexShrink: 0,
};
const barTrack: React.CSSProperties = {
    height: 14, borderRadius: 999, background: 'var(--plum)', overflow: 'hidden',
};
const barFill: React.CSSProperties = {
    height: '100%', borderRadius: 999, background: 'var(--gold)', transition: 'width 0.4s ease',
};
const unit: React.CSSProperties = { fontSize: 14, fontWeight: 600, marginLeft: 4, color: 'var(--muted)' };
const thumb: React.CSSProperties = {
    width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)',
};
