import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, LayoutGrid, Wallet, HandCoins, ChevronRight, type LucideIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';

/** One affiliate and the sales their referred customers generated.
 *  Shape mirrors `GET /api/admin/affiliates` (admin) exactly. */
interface Affiliate {
    id: number | string;
    name: string;
    email: string;
    status: string;
    referral_code: string | null;
    /** Accounts that signed up through this affiliate's link. */
    referred_users: number;
    /** Paid template purchases made by those referred customers. */
    sales_count: number;
    /** Total designs across those purchases. */
    templates_sold: number;
    /** RM those sales generated. */
    revenue: number;
    /** Commission % applied (from settings). */
    commission_percent?: number;
    /** Commission not yet paid out. */
    commission_owed?: number;
    /** Commission already released. */
    commission_paid?: number;
}

export function AdminAffiliates() {
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Jualan Affiliate',
            subtitle: 'Jejak berapa ramai pelanggan dirujuk oleh setiap affiliate dan jualan yang mereka hasilkan.',
            totalAffiliates: 'Jumlah Affiliate', referredUsers: 'Pengguna Dirujuk',
            templatesSold: 'Rekaan Terjual', revenueGenerated: 'Jumlah Hasil',
            activeWord: 'aktif', salesWord: 'jualan',
            name: 'Nama', code: 'Kod Rujukan', referred: 'Pengguna Dirujuk',
            tplSold: 'Rekaan Terjual', sales: 'Jualan', revenue: 'Hasil (RM)', status: 'Status',
            active: 'Aktif', inactive: 'Tidak aktif', pending: 'Menunggu',
            empty: 'Tiada affiliate lagi.',
        },
        en: {
            title: 'Affiliate',
            subtitle: 'Track how many customers each affiliate referred and the sales they generated.',
            totalAffiliates: 'Total Affiliates', referredUsers: 'Referred Users',
            templatesSold: 'Templates Sold', revenueGenerated: 'Revenue Generated',
            activeWord: 'active', salesWord: 'sales',
            name: 'Name', code: 'Referral Code', referred: 'Referred Users',
            tplSold: 'Templates Sold', sales: 'Sales', revenue: 'Revenue (RM)', status: 'Status',
            active: 'Active', inactive: 'Inactive', pending: 'Pending',
            empty: 'No affiliates yet.',
        },
        zh: {
            title: '联盟销售',
            subtitle: '追踪每位联盟伙伴推荐了多少客户，以及他们带来的销售额。',
            totalAffiliates: '联盟伙伴总数', referredUsers: '推荐用户',
            templatesSold: '售出设计', revenueGenerated: '产生收入',
            activeWord: '启用', salesWord: '笔销售',
            name: '姓名', code: '推荐码', referred: '推荐用户',
            tplSold: '售出设计', sales: '销售笔数', revenue: '收入（RM）', status: '状态',
            active: '启用', inactive: '停用', pending: '待处理',
            empty: '暂无联盟伙伴。',
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : 'en-MY';
    const rm = (n: number) => `RM ${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = (n: number) => n.toLocaleString(loc);

    const [rows, setRows] = useState<Affiliate[]>([]);
    const [loading, setLoading] = useState(true);
    const nav = useNavigate();

    const load = () => {
        setLoading(true);
        api.get<Affiliate[]>('/admin/affiliates')
            .then((r) => setRows(r.data))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const RL = dict({
        bm: { owed: 'Komisen Belum Bayar', open: 'Buku komisen', none: 'Tiada' },
        en: { owed: 'Commission Owed', open: 'Payout book', none: 'None' },
        zh: { owed: '待付佣金', open: '佣金账簿', none: '无' },
    }, lang);

    // Aggregates across every affiliate — the four summary cards.
    const totalAffiliates = rows.length;
    const totalReferred = rows.reduce((s, a) => s + a.referred_users, 0);
    const totalTemplates = rows.reduce((s, a) => s + a.templates_sold, 0);
    const totalRevenue = rows.reduce((s, a) => s + a.revenue, 0);
    const totalSales = rows.reduce((s, a) => s + a.sales_count, 0);
    const totalOwed = rows.reduce((s, a) => s + (a.commission_owed ?? 0), 0);
    const activeCount = rows.filter((a) => a.status.toLowerCase() === 'active').length;

    const cols: Column<Affiliate>[] = [
        {
            key: 'name', label: C.name, sortable: true, sortValue: (a) => a.name.toLowerCase(),
            render: (a) => (
                <div style={{ minWidth: 0 }}>
                    <strong>{a.name}</strong>
                    {a.email && (
                        <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.email}</div>
                    )}
                </div>
            ),
        },
        {
            key: 'referral_code', label: C.code,
            render: (a) => (a.referral_code
                ? <code style={codeStyle}>{a.referral_code}</code>
                : <span className="muted">—</span>),
        },
        {
            key: 'referred_users', label: C.referred, align: 'right', sortable: true,
            sortValue: (a) => a.referred_users, render: (a) => num(a.referred_users),
        },
        {
            key: 'templates_sold', label: C.tplSold, align: 'right', sortable: true,
            sortValue: (a) => a.templates_sold, render: (a) => num(a.templates_sold),
        },
        {
            key: 'sales_count', label: C.sales, align: 'right', sortable: true,
            sortValue: (a) => a.sales_count, render: (a) => num(a.sales_count),
        },
        {
            key: 'revenue', label: C.revenue, align: 'right', sortable: true,
            sortValue: (a) => a.revenue, render: (a) => <strong>{rm(a.revenue)}</strong>,
        },
        {
            key: 'commission_owed', label: RL.owed, align: 'right', sortable: true,
            sortValue: (a) => a.commission_owed ?? 0,
            render: (a) => ((a.commission_owed ?? 0) > 0
                ? <strong style={{ color: 'var(--gold)' }}>{rm(a.commission_owed ?? 0)}</strong>
                : <span className="muted">—</span>),
        },
        {
            key: 'status', label: C.status, sortable: true, sortValue: (a) => a.status.toLowerCase(),
            render: (a) => statusBadge(a.status, { active: C.active, inactive: C.inactive, pending: C.pending }),
        },
        {
            key: 'actions', label: '', align: 'right',
            render: (a) => (
                <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); nav(`/admin/affiliates/${a.id}`); }}>
                    {RL.open} <ChevronRight size={14} />
                </button>
            ),
        },
    ];

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {loading ? (
                <div className="loading-screen"><div className="spinner" /></div>
            ) : (
                <>
                    <div className="stat-grid" style={{ marginBottom: 22 }}>
                        <Stat n={num(totalAffiliates)} l={C.totalAffiliates} sub={`${num(activeCount)} ${C.activeWord}`} icon={Users} tone="plum" />
                        <Stat n={num(totalReferred)} l={C.referredUsers} icon={UserPlus} tone="plum" />
                        <Stat n={num(totalTemplates)} l={C.templatesSold} sub={`${num(totalSales)} ${C.salesWord}`} icon={LayoutGrid} tone="plum" />
                        <Stat n={rm(totalRevenue)} l={C.revenueGenerated} sub={`${num(totalSales)} ${C.salesWord}`} icon={Wallet} tone="gold" />
                        <Stat n={rm(totalOwed)} l={RL.owed} icon={HandCoins} tone="gold" />
                    </div>

                    <div className="panel" style={{ padding: 16 }}>
                        <DataTable
                            columns={cols}
                            rows={rows}
                            searchKeys={['name', 'email', 'referral_code']}
                            pageSize={15}
                            onRowClick={(a) => nav(`/admin/affiliates/${a.id}`)}
                            empty={C.empty}
                            exportName="affiliate"
                        />
                    </div>
                </>
            )}
        </div>
    );
}

/** Account-status pill: active green, pending amber, anything else (inactive,
 *  suspended, archived…) red; unknown values fall back to their raw label. */
function statusBadge(status: string, labels: { active: string; inactive: string; pending: string }): ReactNode {
    const s = status.toLowerCase();
    if (s === 'active') return <span className="badge badge-ok">{labels.active}</span>;
    if (s === 'pending') return <span className="badge badge-gold">{labels.pending}</span>;
    if (['inactive', 'suspended', 'banned', 'archived', 'disabled'].includes(s)) {
        return <span className="badge badge-bad">{labels.inactive}</span>;
    }
    return <span className="badge">{status}</span>;
}

function Stat({ n, l, sub, icon: Icon, tone }: {
    n: string; l: string; sub?: string; icon: LucideIcon; tone: 'gold' | 'plum';
}) {
    const gold = tone === 'gold';
    return (
        <div className="stat">
            <div className="spread" style={{ alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                    <div className="n" style={{ color: gold ? 'var(--gold)' : 'var(--plum)' }}>{n}</div>
                    <div className="l">{l}</div>
                    {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
                </div>
                <div style={gold ? statIconGold : statIcon}><Icon size={17} /></div>
            </div>
        </div>
    );
}

const codeStyle: React.CSSProperties = {
    fontFamily: 'var(--mono, monospace)', fontSize: 12,
    background: 'var(--cream)', padding: '2px 7px', borderRadius: 6,
};
const statIcon: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
const statIconGold: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: '#fdf0dc', color: '#b4740f',
};
