import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';
import { Trash2 } from 'lucide-react';

interface Row {
    id: string; name: string; email: string; phone?: string | null;
    role: string; plan?: string | null; is_active: boolean; invitations_count: number;
}

export function AdminUsers() {
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Pengguna', subtitle: 'Lihat semua pengguna sistem. Klik pada baris untuk butiran lanjut.',
            name: 'Nama', email: 'E-mel', phone: 'Telefon', plan: 'Pelan', cards: 'Kad', status: 'Status',
            active: 'Aktif', inactive: 'Tidak aktif', premium: 'Premium', free: 'Percuma',
            roleCol: 'Peranan', filterRole: 'Semua peranan',
            rUser: 'Pengguna', rVendor: 'Vendor', rAffiliate: 'Affiliate', rAdmin: 'Admin', rSuperadmin: 'Superadmin',
            empty: 'Tiada pengguna ditemui.',
            archive: 'Arkibkan',
            archiveOne: (n: string) => `Arkibkan akaun ${n}? Ia boleh dipulihkan semula dari halaman Arkib.`,
            archiveMany: (n: number) => `Arkibkan ${n} akaun yang dipilih? Semuanya boleh dipulihkan dari halaman Arkib.`,
        },
        en: {
            title: 'Users', subtitle: 'All system users — click a row for details',
            name: 'Name', email: 'Email', phone: 'Phone', plan: 'Plan', cards: 'Cards', status: 'Status',
            active: 'Active', inactive: 'Inactive', premium: 'Premium', free: 'Free',
            roleCol: 'Role', filterRole: 'All roles',
            rUser: 'User', rVendor: 'Vendor', rAffiliate: 'Affiliate', rAdmin: 'Admin', rSuperadmin: 'Superadmin',
            empty: 'No users found.',
            archive: 'Archive',
            archiveOne: (n: string) => `Archive ${n}? You can restore them from the Archive page.`,
            archiveMany: (n: number) => `Archive ${n} selected accounts? They can all be restored from the Archive page.`,
        },
        zh: {
            title: '用户', subtitle: '系统全部用户 — 点击任一行查看详情',
            name: '姓名', email: '电子邮箱', phone: '电话', plan: '方案', cards: '请柬', status: '状态',
            active: '启用', inactive: '停用', premium: '付费', free: '免费',
            roleCol: '角色', filterRole: '所有角色',
            rUser: '普通用户', rVendor: '商家', rAffiliate: '联盟', rAdmin: '管理员', rSuperadmin: '超级管理员',
            empty: '未找到用户。',
            archive: '归档',
            archiveOne: (n: string) => `归档账号 ${n}？可从归档页面恢复。`,
            archiveMany: (n: number) => `归档所选的 ${n} 个账号？均可从归档页面恢复。`,
        },
    }, lang);

    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const nav = useNavigate();
    const dialog = useDialog();

    function load() {
        setLoading(true);
        api.get('/admin/users?per_page=2000')
            .then((r) => setRows(r.data.data as Row[]))
            .finally(() => setLoading(false));
    }
    useEffect(load, []);

    const roleLabels: Record<string, string> = {
        user: C.rUser, vendor: C.rVendor, affiliate: C.rAffiliate, admin: C.rAdmin, superadmin: C.rSuperadmin,
    };
    const shown = roleFilter === 'all' ? rows : rows.filter((u) => u.role === roleFilter);

    /** Archives, never erases — the Archive page owns permanent deletion. */
    async function archive(users: Row[], clear?: () => void) {
        const msg = users.length === 1 ? C.archiveOne(users[0].name) : C.archiveMany(users.length);
        if (!(await dialog.confirm({ message: msg, danger: true }))) return;
        setBusy(true);
        try {
            await Promise.all(users.map((u) => api.delete(`/admin/users/${u.id}`)));
            clear?.();
            load();
        } finally {
            setBusy(false);
        }
    }

    const cols: Column<Row>[] = [
        {
            key: 'name', label: C.name, sortable: true, sortValue: (u) => u.name.toLowerCase(),
            render: (u) => <span style={{ fontWeight: 600 }}>{u.name}</span>,
        },
        { key: 'email', label: C.email, sortable: true, render: (u) => <span className="muted">{u.email}</span> },
        {
            key: 'role', label: C.roleCol, sortable: true, sortValue: (u) => u.role,
            render: (u) => roleBadge(u.role, roleLabels),
        },
        { key: 'phone', label: C.phone, render: (u) => <span className="muted">{u.phone ?? '—'}</span> },
        { key: 'plan', label: C.plan, render: (u) => planBadge(u.plan, { premium: C.premium, free: C.free }) },
        { key: 'invitations_count', label: C.cards, align: 'right', sortable: true, sortValue: (u) => u.invitations_count },
        {
            key: 'is_active', label: C.status, sortable: true, sortValue: (u) => (u.is_active ? 1 : 0),
            render: (u) => (u.is_active
                ? <span className="badge badge-ok">{C.active}</span>
                : <span className="badge badge-bad">{C.inactive}</span>),
        },
    ];

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
                <div className="panel" style={{ padding: 16 }}>
                    <DataTable
                        columns={cols}
                        rows={shown}
                        searchKeys={['name', 'email', 'phone']}
                        pageSize={12}
                        toolbar={(
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                aria-label={C.roleCol}
                                style={{ padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, background: '#fff', font: 'inherit', color: 'var(--ink)' }}
                            >
                                <option value="all">{C.filterRole}</option>
                                <option value="user">{C.rUser}</option>
                                <option value="vendor">{C.rVendor}</option>
                                <option value="affiliate">{C.rAffiliate}</option>
                                <option value="admin">{C.rAdmin}</option>
                                <option value="superadmin">{C.rSuperadmin}</option>
                            </select>
                        )}
                        onRowClick={(u) => nav(`/admin/users/${u.id}`)}
                        empty={C.empty}
                        exportName="pengguna"
                        rowId={(u) => String(u.id)}
                        bulkActions={(sel, clear) => (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} disabled={busy} onClick={() => void archive(sel, clear)}>
                                <Trash2 size={14} /> {C.archive}
                            </button>
                        )}
                    />
                </div>
            )}
        </div>
    );
}

function planBadge(plan: string | null | undefined, labels: { premium: string; free: string }): ReactNode {
    if (plan === 'premium') return <span className="badge badge-gold">{labels.premium}</span>;
    return <span className="badge badge-free">{labels.free}</span>;
}

/** A coloured pill per role so the table reads at a glance. */
function roleBadge(role: string, labels: Record<string, string>): ReactNode {
    const label = labels[role] ?? role;
    const style: React.CSSProperties =
        role === 'superadmin' ? { background: '#3d1a30', color: '#fff' }
        : role === 'admin' ? { background: 'var(--plum)', color: '#fff' }
        : role === 'vendor' ? { background: '#e4f3ec', color: '#2f6b52' }
        : role === 'affiliate' ? { background: '#f6e6f0', color: '#7a3a63' }
        : { background: 'var(--cream)', color: 'var(--muted)' };
    return <span className="badge" style={style}>{label}</span>;
}
