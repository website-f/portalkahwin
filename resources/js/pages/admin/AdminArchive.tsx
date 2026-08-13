import { useEffect, useState } from 'react';
import { RotateCcw, Trash2, Archive } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

interface ArchivedUser {
    id: string;
    name: string;
    email: string;
    role: string;
    invitations_count?: number;
    deleted_at?: string | null;
}

/**
 * Archived accounts — everything an admin has deleted, still recoverable.
 *
 * Deleting an account takes its cards, guest lists and payment history with it,
 * so deletion is staged: archive first, erase only on a second, deliberate
 * action taken from here.
 */
export function AdminArchive() {
    const { lang } = useLang();
    const dialog = useDialog();
    const [rows, setRows] = useState<ArchivedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const C = dict({
        bm: {
            title: 'Arkib', subtitle: 'Akaun yang telah dipadam. Pulihkan semula atau padam kekal.',
            name: 'Nama', email: 'E-mel', role: 'Peranan', cards: 'Kad', deletedAt: 'Dipadam pada',
            empty: 'Tiada akaun dalam arkib.',
            restore: 'Pulihkan', purge: 'Padam Kekal',
            restoreOne: (n: string) => `Pulihkan akaun ${n}?`,
            restoreMany: (n: number) => `Pulihkan ${n} akaun yang dipilih?`,
            purgeOne: (n: string) => `Padam kekal akaun ${n}? Semua kad, senarai tetamu dan rekod pembayarannya akan hilang selama-lamanya.`,
            purgeMany: (n: number) => `Padam kekal ${n} akaun? Semua kad, senarai tetamu dan rekod pembayaran mereka akan hilang selama-lamanya.`,
        },
        en: {
            title: 'Archive', subtitle: 'Deleted accounts. Restore them, or erase them for good.',
            name: 'Name', email: 'Email', role: 'Role', cards: 'Cards', deletedAt: 'Deleted',
            empty: 'Nothing in the archive.',
            restore: 'Restore', purge: 'Delete permanently',
            restoreOne: (n: string) => `Restore ${n}?`,
            restoreMany: (n: number) => `Restore ${n} selected accounts?`,
            purgeOne: (n: string) => `Permanently delete ${n}? Their cards, guest lists and payment records go with them, for good.`,
            purgeMany: (n: number) => `Permanently delete ${n} accounts? Their cards, guest lists and payment records go with them, for good.`,
        },
        zh: {
            title: '归档', subtitle: '已删除的账号。可恢复，或彻底删除。',
            name: '姓名', email: '电子邮箱', role: '角色', cards: '请柬', deletedAt: '删除时间',
            empty: '归档中暂无账号。',
            restore: '恢复', purge: '永久删除',
            restoreOne: (n: string) => `恢复账号 ${n}？`,
            restoreMany: (n: number) => `恢复所选的 ${n} 个账号？`,
            purgeOne: (n: string) => `永久删除 ${n}？其请柬、宾客名单与付款记录将一并永久消失。`,
            purgeMany: (n: number) => `永久删除 ${n} 个账号？其请柬、宾客名单与付款记录将一并永久消失。`,
        },
    }, lang);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get<{ data: ArchivedUser[] }>('/admin/archive/users');
            setRows(r.data.data ?? []);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { void load(); }, []);

    /** Both actions run one request per account so a partial failure is visible. */
    async function restore(users: ArchivedUser[], clear?: () => void) {
        const msg = users.length === 1 ? C.restoreOne(users[0].name) : C.restoreMany(users.length);
        if (!(await dialog.confirm({ message: msg }))) return;
        setBusy(true);
        try {
            await Promise.all(users.map((u) => api.post(`/admin/archive/users/${u.id}/restore`)));
            clear?.();
            await load();
        } finally {
            setBusy(false);
        }
    }

    async function purge(users: ArchivedUser[], clear?: () => void) {
        const msg = users.length === 1 ? C.purgeOne(users[0].name) : C.purgeMany(users.length);
        if (!(await dialog.confirm({ message: msg, danger: true }))) return;
        setBusy(true);
        try {
            await Promise.all(users.map((u) => api.delete(`/admin/archive/users/${u.id}`)));
            clear?.();
            await load();
        } finally {
            setBusy(false);
        }
    }

    const fmt = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    const cols: Column<ArchivedUser>[] = [
        { key: 'name', label: C.name, sortable: true, sortValue: (u) => u.name, render: (u) => <strong>{u.name}</strong> },
        { key: 'email', label: C.email, sortable: true, sortValue: (u) => u.email },
        { key: 'role', label: C.role, render: (u) => <span className="badge">{u.role}</span> },
        { key: 'cards', label: C.cards, align: 'right', sortValue: (u) => u.invitations_count ?? 0, render: (u) => u.invitations_count ?? 0 },
        { key: 'deleted_at', label: C.deletedAt, sortable: true, sortValue: (u) => u.deleted_at ?? '', render: (u) => fmt(u.deleted_at) },
        {
            key: 'actions', label: '', align: 'right',
            render: (u) => (
                <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void restore([u])}>
                        <RotateCcw size={14} /> {C.restore}
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} disabled={busy} onClick={() => void purge([u])}>
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ];

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-head">
                <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--cream)', color: 'var(--plum)', display: 'grid', placeItems: 'center' }}>
                        <Archive size={20} />
                    </div>
                    <div>
                        <h1>{C.title}</h1>
                        <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
                    </div>
                </div>
            </div>

            <DataTable
                columns={cols}
                rows={rows}
                searchKeys={['name', 'email']}
                pageSize={15}
                empty={C.empty}
                exportName="arkib-pengguna"
                rowId={(u) => u.id}
                bulkActions={(sel, clear) => (
                    <>
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void restore(sel, clear)}>
                            <RotateCcw size={14} /> {C.restore}
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} disabled={busy} onClick={() => void purge(sel, clear)}>
                            <Trash2 size={14} /> {C.purge}
                        </button>
                    </>
                )}
            />
        </div>
    );
}
