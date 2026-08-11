import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang } from '../../context/LangContext';

interface Row {
    id: number; name: string; email: string; phone?: string | null;
    role: string; plan?: string | null; is_active: boolean; invitations_count: number;
}

export function AdminUsers() {
    const { lang } = useLang();
    const C = ({
        bm: {
            title: 'Pengguna', subtitle: 'Semua pengguna sistem — klik baris untuk butiran',
            name: 'Nama', email: 'E-mel', phone: 'Telefon', plan: 'Pakej', cards: 'Kad', status: 'Status',
            active: 'Aktif', inactive: 'Nyahaktif', premium: 'Premium', free: 'Percuma',
            empty: 'Tiada pengguna dijumpai.',
        },
        en: {
            title: 'Users', subtitle: 'All system users — click a row for details',
            name: 'Name', email: 'Email', phone: 'Phone', plan: 'Plan', cards: 'Cards', status: 'Status',
            active: 'Active', inactive: 'Inactive', premium: 'Premium', free: 'Free',
            empty: 'No users found.',
        },
    })[lang];

    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const nav = useNavigate();

    useEffect(() => {
        setLoading(true);
        api.get('/admin/users')
            .then((r) => setRows(r.data.data as Row[]))
            .finally(() => setLoading(false));
    }, []);

    const cols: Column<Row>[] = [
        {
            key: 'name', label: C.name, sortable: true, sortValue: (u) => u.name.toLowerCase(),
            render: (u) => (
                <span style={{ fontWeight: 600 }}>
                    {u.name} {u.role === 'admin' && <span className="badge badge-gold">admin</span>}
                </span>
            ),
        },
        { key: 'email', label: C.email, sortable: true, render: (u) => <span className="muted">{u.email}</span> },
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
                        rows={rows}
                        searchKeys={['name', 'email']}
                        pageSize={12}
                        onRowClick={(u) => nav(`/admin/users/${u.id}`)}
                        empty={C.empty}
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
