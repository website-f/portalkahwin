import { useEffect, useState, type ReactNode } from 'react';
import {
    Wallet, Repeat, LayoutGrid, ShoppingCart, CheckSquare, Square, Download, ReceiptText, CalendarRange, Ticket, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { Receipt, type ReceiptData } from '../../components/Receipt';
import { useLang, dict } from '../../context/LangContext';

interface FinanceTotals {
    revenue: number;
    subscriptions_revenue: number;
    templates_revenue: number;
    orders: number;
    subs_orders: number;
    template_orders: number;
}
interface MonthPoint { month: string; revenue: number }
interface TopTemplate { key: string; name: string; orders: number; revenue: number }
interface FinanceRow {
    id: string;
    date: string | null;
    reference: string;
    customer: string;
    email: string;
    type: 'subscription' | 'template';
    item: string;
    amount: number;
    status: string;
}
interface RsvpTotals {
    entries: number;
    collected: number;
    commission: number;
    vendor_net: number;
    pending_release: number;
}
interface FinanceData {
    totals: FinanceTotals;
    rsvp?: RsvpTotals;
    by_month: MonthPoint[];
    top_templates: TopTemplate[];
    rows: FinanceRow[];
}

type Preset = 'all' | 'week' | 'month' | 'year' | 'custom';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

/** Calendar-based ranges (local time) for the preset buttons; 'all' clears the filter. */
function presetRange(p: Preset): { from: string; to: string } {
    const now = new Date();
    if (p === 'week') {
        const d = new Date(now);
        const mondayOffset = (d.getDay() + 6) % 7; // ISO week starts Monday
        d.setDate(d.getDate() - mondayOffset);
        return { from: ymd(d), to: ymd(now) };
    }
    if (p === 'month') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
    if (p === 'year') return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) };
    return { from: '', to: '' };
}

export function AdminFinance() {
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Kewangan', subtitle: 'Jejak semua jualan langganan dan rekaan.',
            totalRevenue: 'Jumlah Hasil', subRevenue: 'Hasil Langganan', tplRevenue: 'Hasil Rekaan', totalOrders: 'Jumlah Pesanan',
            ordersWord: 'pesanan', ordersSub: 'jualan berjaya',
            monthlyRevenue: 'Hasil Bulanan (12 bulan)', topTemplates: 'Rekaan Terlaris', noData: 'Belum ada data.',
            rangeTitle: 'Tapis Tarikh', pWeek: 'Minggu ini', pMonth: 'Bulan ini', pYear: 'Tahun ini', pAll: 'Semua', pCustom: 'Tersuai',
            fromL: 'Dari', toL: 'Hingga', exportCsv: 'Eksport CSV',
            allSales: 'Semua Jualan',
            date: 'Tarikh', reference: 'Rujukan', customer: 'Pelanggan', type: 'Jenis', item: 'Item', amount: 'Jumlah (RM)', status: 'Status',
            receipt: 'Resit',
            subscription: 'Langganan', template: 'Rekaan',
            paid: 'Dibayar', pending: 'Menunggu', failed: 'Gagal',
            empty: 'Belum ada jualan.',
            selectAll: 'Pilih semua', clearSel: 'Kosongkan', exportSelected: 'Eksport pilihan',
            selectRow: 'Pilih baris',
            selectedCount: (n: number) => `${n} dipilih`,
        },
        en: {
            title: 'Finance', subtitle: 'Track all subscription and template sales.',
            totalRevenue: 'Total Revenue', subRevenue: 'Subscription Revenue', tplRevenue: 'Template Revenue', totalOrders: 'Total Orders',
            ordersWord: 'orders', ordersSub: 'successful sales',
            monthlyRevenue: 'Monthly Revenue (12 months)', topTemplates: 'Top Templates', noData: 'No data yet.',
            rangeTitle: 'Date filter', pWeek: 'This week', pMonth: 'This month', pYear: 'This year', pAll: 'All', pCustom: 'Custom',
            fromL: 'From', toL: 'To', exportCsv: 'Export CSV',
            allSales: 'All Sales',
            date: 'Date', reference: 'Reference', customer: 'Customer', type: 'Type', item: 'Item', amount: 'Amount (RM)', status: 'Status',
            receipt: 'Receipt',
            subscription: 'Subscription', template: 'Template',
            paid: 'Paid', pending: 'Pending', failed: 'Failed',
            empty: 'No sales yet.',
            selectAll: 'Select all', clearSel: 'Clear', exportSelected: 'Export selected',
            selectRow: 'Select row',
            selectedCount: (n: number) => `${n} selected`,
        },
        zh: {
            title: '财务', subtitle: '追踪全部订阅与设计销售。',
            totalRevenue: '总收入', subRevenue: '订阅收入', tplRevenue: '设计收入', totalOrders: '订单总数',
            ordersWord: '笔订单', ordersSub: '成交订单',
            monthlyRevenue: '月度收入（近 12 个月）', topTemplates: '热销设计', noData: '暂无数据。',
            rangeTitle: '日期筛选', pWeek: '本周', pMonth: '本月', pYear: '今年', pAll: '全部', pCustom: '自定义',
            fromL: '从', toL: '至', exportCsv: '导出 CSV',
            allSales: '全部销售记录',
            date: '日期', reference: '交易编号', customer: '客户', type: '类型', item: '项目', amount: '金额（RM）', status: '状态',
            receipt: '收据',
            subscription: '订阅', template: '设计',
            paid: '已付款', pending: '处理中', failed: '失败',
            empty: '暂无销售记录。',
            selectAll: '全选', clearSel: '清除', exportSelected: '导出所选',
            selectRow: '选择此行',
            selectedCount: (n: number) => `已选择 ${n} 项`,
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : 'en-MY';
    const rm = (n: number) => `RM ${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const rsvpLbl = dict({
        bm: { commission: 'Komisen RSVP', collected: 'kutipan' },
        en: { commission: 'RSVP Commission', collected: 'collected' },
        zh: { commission: 'RSVP 佣金', collected: '收款' },
    }, lang);
    const shortRm = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));
    const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString(loc, { month: 'long', year: '2-digit' });
    const fmtDate = (iso: string | null) => {
        if (!iso) return '—';
        const dt = new Date(iso);
        return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(loc, { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const [d, setD] = useState<FinanceData | null>(null);
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [preset, setPreset] = useState<Preset>('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    // Refetch whenever the range changes; the server scopes totals/top/table to it.
    useEffect(() => {
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        const q = qs.toString();
        api.get<FinanceData>(`/admin/finance${q ? `?${q}` : ''}`).then((r) => { setD(r.data); setSel(new Set()); });
    }, [from, to]);

    function applyPreset(p: Preset) {
        setPreset(p);
        if (p === 'custom') return; // keep the current dates; the user edits the inputs
        const r = presetRange(p);
        setFrom(r.from);
        setTo(r.to);
    }

    function openReceipt(r: FinanceRow) {
        setReceipt({
            id: r.id,
            reference: r.reference,
            date: r.date,
            status: r.status,
            buyerName: r.customer,
            buyerEmail: r.email,
            items: [{ name: r.item, amount: r.amount }],
            subtotal: r.amount,
            total: r.amount,
            currency: 'RM',
        });
    }

    function toggleOne(id: string) {
        setSel((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }
    function clearSel() { setSel(new Set()); }

    if (!d) return <div className="loading-screen"><div className="spinner" /></div>;

    const rows = d.rows;
    const allSelected = rows.length > 0 && rows.every((r) => sel.has(r.id));
    const toggleAll = () => setSel(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

    const maxRev = Math.max(1, ...d.by_month.map((m) => m.revenue));
    const maxTplRev = Math.max(1, ...d.top_templates.map((t) => t.revenue));

    function exportRows(list: FinanceRow[], filename: string) {
        if (list.length === 0) return;
        const fields: { label: string; val: (r: FinanceRow) => string | number }[] = [
            { label: C.date, val: (r) => r.date ?? '' },
            { label: C.reference, val: (r) => r.reference },
            { label: C.customer, val: (r) => r.customer },
            { label: 'Email', val: (r) => r.email },
            { label: C.type, val: (r) => (r.type === 'subscription' ? C.subscription : C.template) },
            { label: C.item, val: (r) => r.item },
            { label: C.amount, val: (r) => r.amount },
            { label: C.status, val: (r) => r.status },
        ];
        const esc = (v: unknown) => `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`;
        const lines = [
            fields.map((f) => esc(f.label)).join(','),
            ...list.map((r) => fields.map((f) => esc(f.val(r))).join(',')),
        ];
        // UTF-8 BOM so Excel renders RM/accented text correctly.
        const csv = '﻿' + lines.join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    // Filename carries the active range so exports are self-describing.
    const rangeTag = from || to ? `${from || 'awal'}_${to || 'kini'}` : 'semua';
    const exportSelected = () => exportRows(rows.filter((r) => sel.has(r.id)), 'kewangan-terpilih.csv');
    const exportRange = () => exportRows(rows, `kewangan-${rangeTag}.csv`);

    const cols: Column<FinanceRow>[] = [
        {
            key: '_sel', label: '', align: 'center',
            render: (r) => (
                <input
                    type="checkbox"
                    checked={sel.has(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleOne(r.id)}
                    aria-label={`${C.selectRow}: ${r.reference || r.id}`}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
            ),
        },
        { key: 'date', label: C.date, sortable: true, sortValue: (r) => r.date ?? '', render: (r) => <span className="muted">{fmtDate(r.date)}</span> },
        { key: 'reference', label: C.reference, sortable: true, render: (r) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{r.reference || '—'}</span> },
        {
            key: 'customer', label: C.customer, sortable: true, sortValue: (r) => r.customer.toLowerCase(),
            render: (r) => (
                <div style={{ minWidth: 0 }}>
                    <strong>{r.customer}</strong>
                    {r.email && <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</div>}
                </div>
            ),
        },
        { key: 'type', label: C.type, sortable: true, render: (r) => typeBadge(r.type, { subscription: C.subscription, template: C.template }) },
        { key: 'item', label: C.item, render: (r) => <span>{r.item}</span> },
        { key: 'amount', label: C.amount, align: 'right', sortable: true, sortValue: (r) => r.amount, render: (r) => <strong>{rm(r.amount)}</strong> },
        { key: 'status', label: C.status, sortable: true, render: (r) => statusBadge(r.status, { paid: C.paid, pending: C.pending, failed: C.failed }) },
        {
            key: '_receipt', label: '', align: 'right',
            render: (r) => (
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); openReceipt(r); }}
                >
                    <ReceiptText size={15} /> {C.receipt}
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

            <div className="panel" style={{ marginBottom: 18, padding: '12px 14px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13.5, marginRight: 2 }}>
                        <CalendarRange size={15} /> {C.rangeTitle}
                    </span>
                    {(['all', 'week', 'month', 'year'] as Preset[]).map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={`btn btn-sm ${preset === p ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => applyPreset(p)}
                        >
                            {p === 'all' ? C.pAll : p === 'week' ? C.pWeek : p === 'month' ? C.pMonth : C.pYear}
                        </button>
                    ))}
                    <span className="row" style={{ gap: 6, alignItems: 'center', marginLeft: 4, flexWrap: 'wrap' }}>
                        <label className="muted" style={{ fontSize: 12 }}>{C.fromL}</label>
                        <input type="date" value={from} max={to || undefined}
                            onChange={(e) => { setPreset('custom'); setFrom(e.target.value); }} style={dateInput} />
                        <label className="muted" style={{ fontSize: 12 }}>{C.toL}</label>
                        <input type="date" value={to} min={from || undefined}
                            onChange={(e) => { setPreset('custom'); setTo(e.target.value); }} style={dateInput} />
                    </span>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}
                        onClick={exportRange} disabled={rows.length === 0}>
                        <Download size={14} /> {C.exportCsv}
                    </button>
                </div>
            </div>

            <div className="stat-grid" style={{ marginBottom: 22 }}>
                <MoneyStat n={rm(d.totals.revenue)} l={C.totalRevenue} sub={`${d.totals.orders.toLocaleString(loc)} ${C.ordersWord}`} icon={Wallet} highlight />
                <MoneyStat n={rm(d.totals.subscriptions_revenue)} l={C.subRevenue} sub={`${d.totals.subs_orders.toLocaleString(loc)} ${C.ordersWord}`} icon={Repeat} />
                <MoneyStat n={rm(d.totals.templates_revenue)} l={C.tplRevenue} sub={`${d.totals.template_orders.toLocaleString(loc)} ${C.ordersWord}`} icon={LayoutGrid} />
                <MoneyStat n={d.totals.orders.toLocaleString(loc)} l={C.totalOrders} sub={C.ordersSub} icon={ShoppingCart} />
                {d.rsvp && d.rsvp.entries > 0 && (
                    <MoneyStat n={rm(d.rsvp.commission)} l={rsvpLbl.commission} sub={`${d.rsvp.entries.toLocaleString(loc)} · ${rm(d.rsvp.collected)} ${rsvpLbl.collected}`} icon={Ticket} />
                )}
            </div>

            <div className="grid-2">
                <div className="panel">
                    <h3 style={{ marginTop: 0 }}>{C.monthlyRevenue}</h3>
                    <div className="pk-scroll" style={{ overflowX: 'auto', paddingTop: 22, paddingBottom: 26 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 170, minWidth: d.by_month.length * 46 }}>
                            {d.by_month.map((m) => {
                                const h = Math.max((m.revenue / maxRev) * 100, m.revenue > 0 ? 2 : 0);
                                return (
                                    <div
                                        key={m.month}
                                        title={`${monthLabel(m.month)}: ${rm(m.revenue)}`}
                                        style={{
                                            flex: '1 0 40px', height: `${h}%`, minHeight: m.revenue > 0 ? 4 : 1, position: 'relative',
                                            background: 'linear-gradient(180deg, var(--plum), #7a6de0)', borderRadius: '6px 6px 0 0',
                                        }}
                                    >
                                        {m.revenue > 0 && (
                                            <span style={{ position: 'absolute', top: -18, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{shortRm(m.revenue)}</span>
                                        )}
                                        <small style={{ position: 'absolute', bottom: -20, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{monthLabel(m.month)}</small>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <h3 style={{ marginTop: 0 }}>{C.topTemplates}</h3>
                    {d.top_templates.length === 0 && <p className="muted">{C.noData}</p>}
                    {d.top_templates.map((t) => (
                        <div key={t.key} style={{ marginBottom: 12 }}>
                            <div className="spread" style={{ marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                                <span className="muted" style={{ fontSize: 13 }}>{rm(t.revenue)}</span>
                            </div>
                            <div style={{ height: 8, background: 'var(--cream)', borderRadius: 999 }}>
                                <div style={{ height: 8, width: `${(t.revenue / maxTplRev) * 100}%`, background: 'var(--gold)', borderRadius: 999 }} />
                            </div>
                            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{t.orders.toLocaleString(loc)} {C.ordersWord}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="panel" style={{ marginTop: 18 }}>
                <h3 style={{ marginTop: 0 }}>{C.allSales}</h3>

                {sel.size > 0 && (
                    <div style={bulkBarStyle}>
                        <strong style={{ fontSize: 14 }}>{C.selectedCount(sel.size)}</strong>
                        <div className="row" style={{ gap: 8, marginLeft: 'auto' }}>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={clearSel}>{C.clearSel}</button>
                            <button type="button" className="btn btn-primary btn-sm" onClick={exportSelected}>
                                <Download size={14} /> {C.exportSelected}
                            </button>
                        </div>
                    </div>
                )}

                <DataTable
                    columns={cols}
                    rows={rows}
                    searchKeys={['customer', 'email', 'reference', 'item']}
                    pageSize={12}
                    empty={C.empty}
                    exportName="kewangan"
                    toolbar={(
                        <button type="button" className="btn btn-ghost btn-sm" onClick={toggleAll} disabled={rows.length === 0}>
                            {allSelected ? <CheckSquare size={15} /> : <Square size={15} />} {C.selectAll}
                        </button>
                    )}
                />
            </div>

            <Receipt open={receipt !== null} onClose={() => setReceipt(null)} data={receipt} />
        </div>
    );
}

/** Type pill: subscription highlighted amber (premium), template neutral. */
function typeBadge(type: FinanceRow['type'], labels: { subscription: string; template: string }): ReactNode {
    return type === 'subscription'
        ? <span className="badge badge-gold">{labels.subscription}</span>
        : <span className="badge">{labels.template}</span>;
}

function statusBadge(status: string, labels: { paid: string; pending: string; failed: string }): ReactNode {
    if (status === 'paid') return <span className="badge badge-ok">{labels.paid}</span>;
    if (status === 'failed') return <span className="badge badge-bad">{labels.failed}</span>;
    return <span className="badge">{labels.pending}</span>;
}

function MoneyStat({ n, l, sub, icon: Icon, highlight }: {
    n: string; l: string; sub?: string; icon: LucideIcon; highlight?: boolean;
}) {
    return (
        <div className="stat">
            <div className="spread" style={{ alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                    <div className="n" style={highlight ? { color: 'var(--gold)' } : undefined}>{n}</div>
                    <div className="l">{l}</div>
                    {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
                </div>
                <div style={highlight ? statIconGold : statIcon}><Icon size={17} /></div>
            </div>
        </div>
    );
}

const statIcon: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
const statIconGold: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: '#fdf0dc', color: '#b4740f',
};
const dateInput: React.CSSProperties = {
    padding: '6px 8px', borderRadius: 8, border: '1px solid var(--line)',
    fontSize: 13, background: '#fff', color: 'var(--ink)',
};
const bulkBarStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 12,
    padding: '10px 14px', marginBottom: 12,
};
