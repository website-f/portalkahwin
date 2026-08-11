import { useEffect, useState } from 'react';
import { Eye, Users, CalendarDays, type LucideIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang } from '../../context/LangContext';

interface TrafficPoint { date: string; visits: number; visitors: number }
interface PathRow { path: string; hits: number }
interface RefRow { referrer: string; hits: number }
interface Traffic {
    range_days: number;
    totals: { visits: number; visitors: number; today: number };
    series: TrafficPoint[];
    top_paths: PathRow[];
    referrers: RefRow[];
}

const RANGES = [7, 30, 90];

export function WebTraffic() {
    const { lang } = useLang();
    const C = ({
        bm: {
            title: 'Trafik Web', subtitle: 'Pantau lawatan, pengunjung dan sumber trafik.',
            days: 'hari', rangeAria: 'Julat masa',
            totalVisits: 'Jumlah Lawatan', uniqueVisitors: 'Pengunjung Unik', visitsToday: 'Lawatan Hari Ini',
            dailyVisits: 'Lawatan Harian', noData: 'Belum ada data.',
            topPaths: 'Halaman Paling Dilawati', referrers: 'Sumber Rujukan',
            emptyPaths: 'Belum ada data halaman.', emptyRefs: 'Belum ada data rujukan.',
            pathLabel: 'Halaman', visitsLabel: 'Lawatan', referrerLabel: 'Rujukan',
            direct: '(langsung)', visitsWord: 'lawatan', visitorsWord: 'pengunjung',
        },
        en: {
            title: 'Web Traffic', subtitle: 'Visits, visitors & traffic sources', days: 'days', rangeAria: 'Time range',
            totalVisits: 'Total visits', uniqueVisitors: 'Unique visitors', visitsToday: 'Visits today',
            dailyVisits: 'Daily visits', noData: 'No data yet.',
            topPaths: 'Top paths', referrers: 'Referrers',
            emptyPaths: 'No path data.', emptyRefs: 'No referrer data.',
            pathLabel: 'Path', visitsLabel: 'Visits', referrerLabel: 'Referrer',
            direct: '(direct)', visitsWord: 'visits', visitorsWord: 'visitors',
        },
    })[lang];

    const [days, setDays] = useState(30);
    const [t, setT] = useState<Traffic | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get<Traffic>('/admin/traffic', { params: { days } })
            .then((r) => setT(r.data))
            .finally(() => setLoading(false));
    }, [days]);

    const maxV = Math.max(1, ...(t?.series.map((p) => p.visits) ?? [1]));
    const dense = (t?.series.length ?? 0) > 14;
    const labelStep = Math.max(1, Math.ceil((t?.series.length ?? 1) / 8));

    const pathCols: Column<PathRow>[] = [
        { key: 'path', label: C.pathLabel, render: (r) => <code style={{ fontSize: 13 }}>{r.path}</code> },
        { key: 'hits', label: C.visitsLabel, align: 'right', sortable: true, sortValue: (r) => r.hits, render: (r) => r.hits.toLocaleString('ms-MY') },
    ];
    const refCols: Column<RefRow>[] = [
        { key: 'referrer', label: C.referrerLabel, render: (r) => <span style={{ wordBreak: 'break-all' }}>{r.referrer || C.direct}</span> },
        { key: 'hits', label: C.visitsLabel, align: 'right', sortable: true, sortValue: (r) => r.hits, render: (r) => r.hits.toLocaleString('ms-MY') },
    ];

    return (
        <div>
            <div className="page-head spread">
                <div><h1>{C.title}</h1><p className="muted" style={{ margin: 0 }}>{C.subtitle}</p></div>
                <div className="row" role="group" aria-label={C.rangeAria}>
                    {RANGES.map((r) => (
                        <button key={r} className={`btn btn-sm ${days === r ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDays(r)}>
                            {r} {C.days}
                        </button>
                    ))}
                </div>
            </div>

            {loading || !t ? <div className="loading-screen"><div className="spinner" /></div> : (
                <>
                    <div className="stat-grid" style={{ marginBottom: 22 }}>
                        <Stat n={t.totals.visits} l={`${C.totalVisits} (${t.range_days} ${C.days})`} icon={Eye} />
                        <Stat n={t.totals.visitors} l={C.uniqueVisitors} icon={Users} />
                        <Stat n={t.totals.today} l={C.visitsToday} icon={CalendarDays} />
                    </div>

                    <div className="panel" style={{ marginBottom: 18 }}>
                        <h3 style={{ marginTop: 0 }}>{C.dailyVisits}</h3>
                        {t.series.length === 0 ? <p className="muted">{C.noData}</p> : (
                            <div className="bars" style={{ height: 200 }}>
                                {t.series.map((p, i) => (
                                    <div className="bar" key={p.date} style={{ height: `${(p.visits / maxV) * 100}%` }}
                                        title={`${new Date(p.date).toLocaleDateString('ms-MY')}: ${p.visits} ${C.visitsWord} · ${p.visitors} ${C.visitorsWord}`}>
                                        {!dense && <span>{p.visits}</span>}
                                        {i % labelStep === 0 && <small>{new Date(p.date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })}</small>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid-2">
                        <div className="panel" style={{ padding: 16 }}>
                            <h3 style={{ margin: '4px 6px 12px' }}>{C.topPaths}</h3>
                            <DataTable columns={pathCols} rows={t.top_paths} searchKeys={['path']} pageSize={8} empty={C.emptyPaths} />
                        </div>
                        <div className="panel" style={{ padding: 16 }}>
                            <h3 style={{ margin: '4px 6px 12px' }}>{C.referrers}</h3>
                            <DataTable columns={refCols} rows={t.referrers} searchKeys={['referrer']} pageSize={8} empty={C.emptyRefs} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function Stat({ n, l, icon: Icon }: { n: number; l: string; icon: LucideIcon }) {
    return (
        <div className="stat">
            <div className="spread" style={{ alignItems: 'flex-start' }}>
                <div><div className="n">{n.toLocaleString('ms-MY')}</div><div className="l">{l}</div></div>
                <div style={statIcon}><Icon size={17} /></div>
            </div>
        </div>
    );
}

const statIcon: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
