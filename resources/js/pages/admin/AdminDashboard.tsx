import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Dash {
    stats: { users: number; invitations: number; published: number; templates: number; rsvps: number; visits_total: number; visits_today: number };
    traffic: { date: string; visits: number }[];
    most_used_templates: { key: string; name: string; uses: number }[];
    recent_invitations: { id: string; bride_name: string; groom_name: string; template_key: string; status: string; views: number; user?: { name: string } }[];
}

export function AdminDashboard() {
    const [d, setD] = useState<Dash | null>(null);
    useEffect(() => { api.get<Dash>('/admin/dashboard').then((r) => setD(r.data)); }, []);
    if (!d) return <div className="loading-screen"><div className="spinner" /></div>;

    const maxV = Math.max(1, ...d.traffic.map((t) => t.visits));
    const maxUse = Math.max(1, ...d.most_used_templates.map((t) => t.uses));

    return (
        <div>
            <div className="page-head"><h1>Dashboard</h1><p className="muted" style={{ margin: 0 }}>Trafik & aktiviti sistem</p></div>

            <div className="stat-grid" style={{ marginBottom: 22 }}>
                <Stat n={d.stats.users} l="Pengguna" />
                <Stat n={d.stats.invitations} l="Jumlah Kad" />
                <Stat n={d.stats.published} l="Diterbitkan" />
                <Stat n={d.stats.rsvps} l="RSVP" />
                <Stat n={d.stats.visits_today} l="Lawatan Hari Ini" />
                <Stat n={d.stats.visits_total} l="Jumlah Lawatan" />
            </div>

            <div className="grid-2">
                <div className="panel">
                    <h3>Trafik 7 Hari</h3>
                    <div className="bars">
                        {d.traffic.map((t) => (
                            <div className="bar" key={t.date} style={{ height: `${(t.visits / maxV) * 100}%` }}>
                                <span>{t.visits}</span>
                                <small>{new Date(t.date).toLocaleDateString('ms-MY', { weekday: 'short' })}</small>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="panel">
                    <h3>Templat Paling Digunakan</h3>
                    {d.most_used_templates.length === 0 && <p className="muted">Belum ada data.</p>}
                    {d.most_used_templates.map((t) => (
                        <div key={t.key} style={{ marginBottom: 12 }}>
                            <div className="spread" style={{ marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                                <span className="muted" style={{ fontSize: 13 }}>{t.uses} kad</span>
                            </div>
                            <div style={{ height: 8, background: 'var(--cream)', borderRadius: 999 }}>
                                <div style={{ height: 8, width: `${(t.uses / maxUse) * 100}%`, background: 'var(--gold)', borderRadius: 999 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="panel" style={{ marginTop: 18 }}>
                <h3>Kad Terkini</h3>
                <div className="table-wrap">
                <table className="table">
                    <thead><tr><th>Pengantin</th><th>Pemilik</th><th>Templat</th><th>Status</th><th>Tontonan</th></tr></thead>
                    <tbody>
                        {d.recent_invitations.map((r) => (
                            <tr key={r.id}>
                                <td style={{ fontWeight: 600 }}>{r.bride_name} & {r.groom_name}</td>
                                <td className="muted">{r.user?.name ?? '—'}</td>
                                <td><span className="badge">{r.template_key}</span></td>
                                <td>{r.status === 'published' ? <span className="badge badge-ok">Terbit</span> : <span className="badge">Draf</span>}</td>
                                <td>{r.views}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}

function Stat({ n, l }: { n: number; l: string }) {
    return <div className="stat"><div className="n">{n}</div><div className="l">{l}</div></div>;
}
