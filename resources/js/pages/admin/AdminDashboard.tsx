import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    Users, Mail, Send, MessageSquare, Eye, TrendingUp,
    LayoutGrid, BarChart3, Settings, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang } from '../../context/LangContext';

interface Dash {
    stats: { users: number; invitations: number; published: number; templates: number; rsvps: number; visits_total: number; visits_today: number };
    traffic: { date: string; visits: number }[];
    most_used_templates: { key: string; name: string; uses: number }[];
    recent_invitations: { id: string; bride_name: string; groom_name: string; template_key: string; status: string; views: number; user?: { name: string } }[];
}
type Recent = Dash['recent_invitations'][number];

export function AdminDashboard() {
    const { lang } = useLang();
    const C = ({
        bm: {
            title: 'Papan Utama', subtitle: 'Ringkasan trafik dan aktiviti sistem.',
            users: 'Pengguna', templates: 'Rekaan', traffic: 'Trafik', settings: 'Tetapan',
            totalCards: 'Jumlah Kad', published: 'Terbit', rsvp: 'RSVP',
            visitsToday: 'Lawatan Hari Ini', totalVisits: 'Jumlah Lawatan',
            traffic7: 'Trafik 7 Hari', mostUsed: 'Rekaan Paling Digunakan',
            noData: 'Belum ada data.', cardsWord: 'kad', recentCards: 'Kad Terkini',
            visitsWord: 'lawatan', emptyCards: 'Belum ada kad.',
            couple: 'Pengantin', owner: 'Pemilik', template: 'Rekaan', status: 'Status', views: 'Tontonan',
            terbit: 'Terbit', draf: 'Draf',
        },
        en: {
            title: 'Dashboard', subtitle: 'System traffic & activity overview',
            users: 'Users', templates: 'Templates', traffic: 'Traffic', settings: 'Settings',
            totalCards: 'Total cards', published: 'Published', rsvp: 'RSVP',
            visitsToday: 'Visits today', totalVisits: 'Total visits',
            traffic7: '7-day traffic', mostUsed: 'Most-used templates',
            noData: 'No data yet.', cardsWord: 'cards', recentCards: 'Recent cards',
            visitsWord: 'visits', emptyCards: 'No cards yet.',
            couple: 'Couple', owner: 'Owner', template: 'Template', status: 'Status', views: 'Views',
            terbit: 'Published', draf: 'Draft',
        },
    })[lang];

    const [d, setD] = useState<Dash | null>(null);
    useEffect(() => { api.get<Dash>('/admin/dashboard').then((r) => setD(r.data)); }, []);
    if (!d) return <div className="loading-screen"><div className="spinner" /></div>;

    const maxV = Math.max(1, ...d.traffic.map((t) => t.visits));
    const maxUse = Math.max(1, ...d.most_used_templates.map((t) => t.uses));

    const recentCols: Column<Recent>[] = [
        { key: 'couple', label: C.couple, render: (r) => <strong>{r.bride_name} &amp; {r.groom_name}</strong> },
        { key: 'owner', label: C.owner, render: (r) => <span className="muted">{r.user?.name ?? '—'}</span> },
        { key: 'template_key', label: C.template, sortable: true, render: (r) => <span className="badge">{r.template_key}</span> },
        { key: 'status', label: C.status, sortable: true, render: (r) => statusBadge(r.status, { terbit: C.terbit, draf: C.draf }) },
        { key: 'views', label: C.views, align: 'right', sortable: true, sortValue: (r) => r.views, render: (r) => r.views },
    ];

    return (
        <div>
            <div className="page-head spread">
                <div><h1>{C.title}</h1><p className="muted" style={{ margin: 0 }}>{C.subtitle}</p></div>
                <div className="row wrap">
                    <QuickAction to="/admin/users" icon={Users} label={C.users} />
                    <QuickAction to="/admin/templates" icon={LayoutGrid} label={C.templates} />
                    <QuickAction to="/admin/traffic" icon={BarChart3} label={C.traffic} />
                    <QuickAction to="/admin/settings" icon={Settings} label={C.settings} />
                </div>
            </div>

            <div className="stat-grid" style={{ marginBottom: 22 }}>
                <Stat n={d.stats.users} l={C.users} icon={Users} />
                <Stat n={d.stats.invitations} l={C.totalCards} icon={Mail} />
                <Stat n={d.stats.published} l={C.published} icon={Send} />
                <Stat n={d.stats.rsvps} l={C.rsvp} icon={MessageSquare} />
                <Stat n={d.stats.visits_today} l={C.visitsToday} icon={Eye} />
                <Stat n={d.stats.visits_total} l={C.totalVisits} icon={TrendingUp} />
            </div>

            <div className="grid-2">
                <div className="panel">
                    <h3 style={{ marginTop: 0 }}>{C.traffic7}</h3>
                    <div className="bars">
                        {d.traffic.map((t) => (
                            <div className="bar" key={t.date} style={{ height: `${(t.visits / maxV) * 100}%` }}
                                title={`${new Date(t.date).toLocaleDateString('ms-MY')}: ${t.visits} ${C.visitsWord}`}>
                                <span>{t.visits}</span>
                                <small>{new Date(t.date).toLocaleDateString('ms-MY', { weekday: 'short' })}</small>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="panel">
                    <h3 style={{ marginTop: 0 }}>{C.mostUsed}</h3>
                    {d.most_used_templates.length === 0 && <p className="muted">{C.noData}</p>}
                    {d.most_used_templates.map((t) => (
                        <div key={t.key} style={{ marginBottom: 12 }}>
                            <div className="spread" style={{ marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                                <span className="muted" style={{ fontSize: 13 }}>{t.uses} {C.cardsWord}</span>
                            </div>
                            <div style={{ height: 8, background: 'var(--cream)', borderRadius: 999 }}>
                                <div style={{ height: 8, width: `${(t.uses / maxUse) * 100}%`, background: 'var(--gold)', borderRadius: 999 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="panel" style={{ marginTop: 18 }}>
                <h3 style={{ marginTop: 0 }}>{C.recentCards}</h3>
                <DataTable
                    columns={recentCols}
                    rows={d.recent_invitations}
                    searchKeys={['bride_name', 'groom_name', 'template_key']}
                    pageSize={8}
                    empty={C.emptyCards}
                    exportName="aktiviti"
                />
            </div>
        </div>
    );
}

function statusBadge(status: string, labels: { terbit: string; draf: string }): ReactNode {
    return status === 'published'
        ? <span className="badge badge-ok">{labels.terbit}</span>
        : <span className="badge">{labels.draf}</span>;
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
    return <Link to={to} className="btn btn-ghost btn-sm"><Icon size={15} /> {label}</Link>;
}

function Stat({ n, l, icon: Icon }: { n: number; l: string; icon: LucideIcon }) {
    return (
        <div className="stat">
            <div className="spread" style={{ alignItems: 'flex-start' }}>
                <div>
                    <div className="n">{n.toLocaleString('ms-MY')}</div>
                    <div className="l">{l}</div>
                </div>
                <div style={statIcon}><Icon size={17} /></div>
            </div>
        </div>
    );
}

const statIcon: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
