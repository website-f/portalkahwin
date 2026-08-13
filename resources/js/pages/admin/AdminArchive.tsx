import { useEffect, useState } from 'react';
import { RotateCcw, Trash2, Archive, Users, LayoutGrid } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

type Kind = 'users' | 'templates';

/** One archived record. The two kinds share enough shape to share a table. */
interface ArchivedRow {
    id: string;
    name: string;
    /** Users: email. Templates: the design key. */
    subtitle: string;
    /** Users: role. Templates: category. */
    tag: string;
    count?: number;
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
    const [kind, setKind] = useState<Kind>('users');
    const [rows, setRows] = useState<ArchivedRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const C = dict({
        bm: {
            title: 'Arkib', subtitle: 'Semua rekod yang telah dipadam. Pulihkan semula atau padam kekal.',
            tabUsers: 'Pengguna', tabTemplates: 'Rekaan',
            name: 'Nama', email: 'E-mel', role: 'Peranan', cards: 'Kad', deletedAt: 'Dipadam pada',
            key: 'Kunci', category: 'Kategori', used: 'Digunakan',
            empty: 'Tiada rekod dalam arkib.',
            restore: 'Pulihkan', purge: 'Padam Kekal',
            restoreOne: (n: string) => `Pulihkan ${n}?`,
            restoreMany: (n: number) => `Pulihkan ${n} rekod yang dipilih?`,
            purgeFailed: 'Rekod ini tidak boleh dipadam.',
            purgeOne: (n: string) => `Padam kekal ${n}? Semua kad, senarai tetamu dan rekod pembayarannya akan hilang selama-lamanya.`,
            purgeMany: (n: number) => `Padam kekal ${n} akaun? Semua kad, senarai tetamu dan rekod pembayaran mereka akan hilang selama-lamanya.`,
        },
        en: {
            title: 'Archive', subtitle: 'Everything that has been deleted. Restore it, or erase it for good.',
            tabUsers: 'Users', tabTemplates: 'Designs',
            name: 'Name', email: 'Email', role: 'Role', cards: 'Cards', deletedAt: 'Deleted',
            key: 'Key', category: 'Category', used: 'In use',
            empty: 'Nothing in the archive.',
            restore: 'Restore', purge: 'Delete permanently',
            restoreOne: (n: string) => `Restore ${n}?`,
            restoreMany: (n: number) => `Restore ${n} selected accounts?`,
            purgeFailed: 'This record could not be deleted.',
            purgeOne: (n: string) => `Permanently delete ${n}? Their cards, guest lists and payment records go with them, for good.`,
            purgeMany: (n: number) => `Permanently delete ${n} accounts? Their cards, guest lists and payment records go with them, for good.`,
        },
        zh: {
            title: '归档', subtitle: '所有已删除的记录。可恢复，或彻底删除。',
            tabUsers: '用户', tabTemplates: '请柬设计',
            name: '姓名', email: '电子邮箱', role: '角色', cards: '请柬', deletedAt: '删除时间',
            key: '标识', category: '分类', used: '使用中',
            empty: '归档中暂无记录。',
            restore: '恢复', purge: '永久删除',
            restoreOne: (n: string) => `恢复账号 ${n}？`,
            restoreMany: (n: number) => `恢复所选的 ${n} 个账号？`,
            purgeFailed: '此记录无法删除。',
            purgeOne: (n: string) => `永久删除 ${n}？其请柬、宾客名单与付款记录将一并永久消失。`,
            purgeMany: (n: number) => `永久删除 ${n} 个账号？其请柬、宾客名单与付款记录将一并永久消失。`,
        },
    }, lang);

    async function load() {
        setLoading(true);
        try {
            if (kind === 'users') {
                const r = await api.get<{ data: Record<string, unknown>[] }>('/admin/archive/users');
                setRows((r.data.data ?? []).map((u) => ({
                    id: String(u.id),
                    name: String(u.name ?? ''),
                    subtitle: String(u.email ?? ''),
                    tag: String(u.role ?? ''),
                    count: Number(u.invitations_count ?? 0),
                    deleted_at: (u.deleted_at as string | null) ?? null,
                })));
            } else {
                // Templates come back as a plain array, not a paginator.
                const r = await api.get<Record<string, unknown>[]>('/admin/archive/templates');
                setRows((r.data ?? []).map((t) => ({
                    id: String(t.id),
                    name: String(t.name ?? ''),
                    subtitle: String(t.key ?? ''),
                    tag: String(t.category ?? ''),
                    count: Number(t.usage_count ?? 0),
                    deleted_at: (t.deleted_at as string | null) ?? null,
                })));
            }
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { void load(); }, [kind]);

    /** Both actions run one request per account so a partial failure is visible. */
    const base = `/admin/archive/${kind}`;

    async function restore(items: ArchivedRow[], clear?: () => void) {
        const msg = items.length === 1 ? C.restoreOne(items[0].name) : C.restoreMany(items.length);
        if (!(await dialog.confirm({ message: msg }))) return;
        setBusy(true);
        try {
            await Promise.all(items.map((r) => api.post(`${base}/${r.id}/restore`)));
            clear?.();
            await load();
        } finally {
            setBusy(false);
        }
    }

    async function purge(items: ArchivedRow[], clear?: () => void) {
        const msg = items.length === 1 ? C.purgeOne(items[0].name) : C.purgeMany(items.length);
        if (!(await dialog.confirm({ message: msg, danger: true }))) return;
        setBusy(true);
        try {
            // Sequential, not parallel: the server refuses to erase a design that
            // is still in use, and that message must reach the admin intact.
            for (const r of items) {
                try {
                    await api.delete(`${base}/${r.id}`);
                } catch (e: unknown) {
                    const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    await dialog.alert({ title: C.purge, message: m ?? C.purgeFailed });
                    break;
                }
            }
            clear?.();
            await load();
        } finally {
            setBusy(false);
        }
    }

    const fmt = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    const cols: Column<ArchivedRow>[] = [
        { key: 'name', label: C.name, sortable: true, sortValue: (u) => u.name, render: (u) => <strong>{u.name}</strong> },
        { key: 'subtitle', label: kind === 'users' ? C.email : C.key, sortable: true, sortValue: (u) => u.subtitle },
        { key: 'tag', label: kind === 'users' ? C.role : C.category, render: (u) => <span className="badge">{u.tag}</span> },
        { key: 'count', label: kind === 'users' ? C.cards : C.used, align: 'right', sortValue: (u) => u.count ?? 0, render: (u) => u.count ?? 0 },
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

            <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {([['users', C.tabUsers, Users], ['templates', C.tabTemplates, LayoutGrid]] as const).map(([k, label, Icon]) => (
                    <button
                        key={k}
                        className={`btn btn-sm ${kind === k ? 'btn-primary' : 'btn-ghost'}`}
                        aria-pressed={kind === k}
                        onClick={() => setKind(k)}
                    >
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            <DataTable
                columns={cols}
                rows={loading ? [] : rows}
                searchKeys={['name', 'subtitle']}
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
