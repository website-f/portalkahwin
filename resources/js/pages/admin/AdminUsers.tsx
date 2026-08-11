import { useEffect, useState } from 'react';
import { UserCog, Search } from 'lucide-react';
import { api, setToken } from '../../lib/api';

interface Row {
    id: number; name: string; email: string; phone?: string | null;
    role: string; is_active: boolean; invitations_count: number;
}

export function AdminUsers() {
    const [rows, setRows] = useState<Row[]>([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);

    function load(query = '') {
        setLoading(true);
        api.get('/admin/users', { params: { q: query } })
            .then((r) => setRows(r.data.data))
            .finally(() => setLoading(false));
    }
    useEffect(() => { load(); }, []);

    async function toggle(u: Row) {
        const r = await api.post(`/admin/users/${u.id}/toggle`);
        setRows((rs) => rs.map((x) => (x.id === u.id ? { ...x, is_active: r.data.is_active } : x)));
    }

    async function impersonate(u: Row) {
        if (!confirm(`Log masuk sebagai ${u.name} untuk menyediakan kad bagi pihaknya?`)) return;
        const r = await api.post(`/admin/users/${u.id}/impersonate`);
        setToken(r.data.token);
        window.location.href = '/app';
    }

    return (
        <div>
            <div className="page-head spread">
                <div><h1>Pengguna</h1><p className="muted" style={{ margin: 0 }}>Semua pengguna sistem</p></div>
                <form className="row" onSubmit={(e) => { e.preventDefault(); load(q); }}>
                    <div className="field" style={{ margin: 0 }}>
                        <input placeholder="Cari nama / e-mel" value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <button className="btn btn-ghost btn-sm"><Search size={15} /></button>
                </form>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
                <div className="table-wrap"><table className="table">
                    <thead><tr><th>Nama</th><th>E-mel</th><th>Telefon</th><th>Kad</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                        {rows.map((u) => (
                            <tr key={u.id}>
                                <td style={{ fontWeight: 600 }}>{u.name} {u.role === 'admin' && <span className="badge badge-gold">admin</span>}</td>
                                <td className="muted">{u.email}</td>
                                <td className="muted">{u.phone ?? '—'}</td>
                                <td>{u.invitations_count}</td>
                                <td>{u.is_active ? <span className="badge badge-ok">Aktif</span> : <span className="badge badge-bad">Nyahaktif</span>}</td>
                                <td>
                                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                                        {u.role !== 'admin' && (
                                            <button className="btn btn-ghost btn-sm" onClick={() => impersonate(u)} title="Sediakan bagi pihak pengguna">
                                                <UserCog size={14} /> Sediakan
                                            </button>
                                        )}
                                        <button className="btn btn-ghost btn-sm" onClick={() => toggle(u)}>
                                            {u.is_active ? 'Nyahaktif' : 'Aktif'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table></div>
            )}
        </div>
    );
}
