import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, Wallet, Coins, HandCoins, Clock, CheckCircle2, Send, ExternalLink, CalendarDays, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { url } from '../../lib/base';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

/* ------------------------------------------------------------------ *
 * API shapes — GET /admin/entry-payments/vendor/{vendorId}
 * ------------------------------------------------------------------ */

/** The vendor whose pay-per-entry book we are drilling into. */
interface VendorRef {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
}
/** Roll-up across every entry this vendor has taken. */
interface VendorBookSummary {
    entries: number;
    collected: number;
    /** What the platform kept — this line is the platform's income. */
    charges: number;
    /** What the vendor is owed after charges. */
    net: number;
    released: number;
    pending_release: number;
}
/** One line of the platform's income, aggregated by charge name. */
interface ChargeLine {
    name: string;
    amount: number;
}
/** One of the vendor's events, with its ticket takings rolled up. */
interface VendorEventRow {
    invitation_id: string;
    event: string;
    slug: string | null;
    entries: number;
    pax: number;
    collected: number;
    charges: number;
    net: number;
}
/** One guest ticket payment against this vendor. */
interface VendorPaymentRow {
    id: number | string;
    reference: string;
    created_at: string | null;
    paid_at: string | null;
    payer_name: string;
    payer_email: string;
    event: string | null;
    slug: string | null;
    pax: number;
    amount: number;
    platform_fee: number;
    vendor_net: number;
    status: string;
    released: boolean;
}
/** A recorded release of this vendor's owed money. */
interface VendorPayoutRow {
    id: number | string;
    reference: string;
    gross: number;
    fee_total: number;
    adjustment: number;
    net: number;
    entries_count: number;
    method: string | null;
    note: string | null;
    released_at: string | null;
    status: string;
}
interface VendorPaymentsData {
    vendor: VendorRef;
    summary: VendorBookSummary;
    charge_breakdown: ChargeLine[];
    events: VendorEventRow[];
    payments: VendorPaymentRow[];
    payouts: VendorPayoutRow[];
}

/** Minimal axios error read — same shape the rest of the app pulls messages from. */
type ApiError = { response?: { status?: number; data?: { message?: string } } };

export function AdminVendorPayments() {
    const { vendorId } = useParams<{ vendorId: string }>();
    const { lang } = useLang();
    const dialog = useDialog();
    const C = dict({
        bm: {
            back: 'Kembali ke Bayaran',
            eyebrow: 'Buku Bayaran Vendor',
            moneyModel: 'Tetamu bayar → platform tolak cajnya → vendor terima baki bersih.',
            sCollected: 'Jumlah Dikutip', sCharges: 'Caj Platform', sNet: 'Bersih Vendor',
            sReleased: 'Telah Dilepaskan', sPending: 'Menunggu Bayaran',
            entriesWord: 'kemasukan', platformIncome: 'Pendapatan platform',
            releaseBtn: 'Lepaskan Bayaran', releasing: 'Melepaskan…',
            releaseTitle: 'Lepaskan bayaran',
            releaseConfirm: (amt: string, v: string) => `Lepaskan ${amt} kepada ${v}? Semua kemasukan berbayar yang belum dilepaskan akan dijelaskan sebagai satu bayaran.`,
            releasedTitle: 'Bayaran dilepaskan',
            releasedMsg: (amt: string) => `${amt} telah dilepaskan kepada vendor.`,
            releaseFailed: 'Gagal melepaskan bayaran. Sila cuba lagi.',
            evTitle: 'Butiran Acara', evSub: 'Kutipan bagi setiap acara vendor ini.',
            evEvent: 'Acara', evEntries: 'Kemasukan', evPax: 'Pax', evCollected: 'Dikutip', evCharges: 'Caj Platform', evNet: 'Bersih Vendor',
            emptyEvents: 'Belum ada acara.',
            payTitle: 'Semua Bayaran',
            date: 'Tarikh', reference: 'Rujukan', guest: 'Tetamu', eventCol: 'Acara', pax: 'Pax',
            amount: 'Jumlah', charges: 'Caj', vendorNet: 'Bersih Vendor', status: 'Status', releasedCol: 'Lepas',
            paid: 'Dibayar', pending: 'Menunggu', failed: 'Gagal', refunded: 'Dikembalikan',
            releasedYes: 'Dilepaskan', releasedNo: 'Ditahan', emptyRows: 'Belum ada bayaran.',
            payoutsTitle: 'Bayaran Dilepaskan', payoutsSub: 'Setiap pelepasan yang direkodkan kepada vendor ini.',
            pRef: 'Rujukan', pDate: 'Tarikh', pEntries: 'Kemasukan', pNet: 'Bersih', pStatus: 'Status',
            statusReleased: 'Dilepaskan', statusVoid: 'Dibatalkan', emptyPayouts: 'Belum ada pelepasan.',
        },
        en: {
            back: 'Back to Payments',
            eyebrow: 'Vendor payment book',
            moneyModel: 'Guest pays → platform deducts its charges → vendor gets the net.',
            sCollected: 'Collected', sCharges: 'Platform charges', sNet: 'Vendor net',
            sReleased: 'Released', sPending: 'Pending payout',
            entriesWord: 'entries', platformIncome: 'Platform income',
            releaseBtn: 'Release payout', releasing: 'Releasing…',
            releaseTitle: 'Release payout',
            releaseConfirm: (amt: string, v: string) => `Release ${amt} to ${v}? All currently-unreleased paid entries will be settled as one payout.`,
            releasedTitle: 'Payout released',
            releasedMsg: (amt: string) => `${amt} released to the vendor.`,
            releaseFailed: 'Could not release the payout. Please try again.',
            evTitle: 'Event details', evSub: 'Collection per event for this vendor.',
            evEvent: 'Event', evEntries: 'Entries', evPax: 'Pax', evCollected: 'Collected', evCharges: 'Platform charges', evNet: 'Vendor net',
            emptyEvents: 'No events yet.',
            payTitle: 'All payments',
            date: 'Date', reference: 'Reference', guest: 'Guest', eventCol: 'Event', pax: 'Pax',
            amount: 'Amount', charges: 'Charges', vendorNet: 'Vendor net', status: 'Status', releasedCol: 'Released',
            paid: 'Paid', pending: 'Pending', failed: 'Failed', refunded: 'Refunded',
            releasedYes: 'Released', releasedNo: 'Held', emptyRows: 'No payments yet.',
            payoutsTitle: 'Payouts', payoutsSub: 'Every recorded release to this vendor.',
            pRef: 'Reference', pDate: 'Date', pEntries: 'Entries', pNet: 'Net', pStatus: 'Status',
            statusReleased: 'Released', statusVoid: 'Voided', emptyPayouts: 'No payouts yet.',
        },
        zh: {
            back: '返回收款',
            eyebrow: '商家收款账簿',
            moneyModel: '宾客付款 → 平台扣除费用 → 商家获得净额。',
            sCollected: '已收款', sCharges: '平台费用', sNet: '商家净额',
            sReleased: '已释放', sPending: '待结算',
            entriesWord: '笔入场', platformIncome: '平台收入',
            releaseBtn: '释放款项', releasing: '释放中…',
            releaseTitle: '释放款项',
            releaseConfirm: (amt: string, v: string) => `向 ${v} 释放 ${amt}？当前所有尚未释放的已付款入场将合并为一笔款项结算。`,
            releasedTitle: '款项已释放',
            releasedMsg: (amt: string) => `已向商家释放 ${amt}。`,
            releaseFailed: '释放款项失败，请重试。',
            evTitle: '活动明细', evSub: '此商家每场活动的收款明细。',
            evEvent: '活动', evEntries: '入场', evPax: '人数', evCollected: '已收', evCharges: '平台费用', evNet: '商家净额',
            emptyEvents: '暂无活动。',
            payTitle: '全部付款',
            date: '日期', reference: '交易编号', guest: '宾客', eventCol: '活动', pax: '人数',
            amount: '金额', charges: '费用', vendorNet: '商家净额', status: '状态', releasedCol: '释放',
            paid: '已付款', pending: '处理中', failed: '失败', refunded: '已退款',
            releasedYes: '已释放', releasedNo: '暂扣', emptyRows: '暂无付款。',
            payoutsTitle: '释放记录', payoutsSub: '向此商家释放款项的每一笔记录。',
            pRef: '交易编号', pDate: '日期', pEntries: '入场', pNet: '净额', pStatus: '状态',
            statusReleased: '已释放', statusVoid: '已作废', emptyPayouts: '暂无释放记录。',
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : 'en-MY';
    const rm = (n: number) => `RM ${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = (n: number) => n.toLocaleString(loc);
    const fmtDate = (iso: string | null) => {
        if (!iso) return '—';
        const dt = new Date(iso);
        return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(loc, { day: '2-digit', month: 'long', year: 'numeric' });
    };

    /* ---- data ---- */
    const [data, setData] = useState<VendorPaymentsData | null>(null);
    const [releasing, setReleasing] = useState(false);

    const load = useCallback(async () => {
        const r = await api.get<VendorPaymentsData>(`/admin/entry-payments/vendor/${vendorId}`);
        setData(r.data);
    }, [vendorId]);

    useEffect(() => { void load(); }, [load]);

    /* ---- Release payout: settles every unreleased paid entry as one payout ---- */
    async function releasePayout() {
        if (!data || data.summary.pending_release <= 0 || releasing) return;
        const ok = await dialog.confirm({
            title: C.releaseTitle,
            message: C.releaseConfirm(rm(data.summary.pending_release), data.vendor.name),
            confirmText: C.releaseBtn,
        });
        if (!ok) return;
        setReleasing(true);
        try {
            const r = await api.post<VendorPayoutRow>('/admin/vendor-payouts', { vendor_id: data.vendor.id });
            await load();
            await dialog.alert({ title: C.releasedTitle, message: C.releasedMsg(rm(r.data.net)) });
        } catch (err: unknown) {
            // 422 when nothing is owed, or any other failure — surface the server's message.
            const e = err as ApiError;
            await dialog.alert({ message: e?.response?.data?.message ?? C.releaseFailed, danger: true });
        } finally {
            setReleasing(false);
        }
    }

    if (!data) return <div className="loading-screen"><div className="spinner" /></div>;

    const { vendor, summary } = data;
    const contact = [vendor.email, vendor.phone].filter((x): x is string => !!x).join(' · ');

    /* ---- Events table (the vendor's per-event book) ---- */
    const eventLink = (name: string, slug: string | null): ReactNode =>
        slug
            ? (
                <a href={url(`/e/${slug}`)} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--plum)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {name || '—'} <ExternalLink size={13} />
                </a>
            )
            : <span>{name || '—'}</span>;

    const eventCols: Column<VendorEventRow>[] = [
        { key: 'event', label: C.evEvent, sortable: true, sortValue: (e) => e.event.toLowerCase(), render: (e) => eventLink(e.event, e.slug) },
        { key: 'entries', label: C.evEntries, align: 'right', sortable: true, sortValue: (e) => e.entries, render: (e) => num(e.entries) },
        { key: 'pax', label: C.evPax, align: 'right', sortable: true, sortValue: (e) => e.pax, render: (e) => num(e.pax) },
        { key: 'collected', label: C.evCollected, align: 'right', sortable: true, sortValue: (e) => e.collected, render: (e) => <strong>{rm(e.collected)}</strong> },
        { key: 'charges', label: C.evCharges, align: 'right', sortable: true, sortValue: (e) => e.charges, render: (e) => <span className="muted">{rm(e.charges)}</span> },
        { key: 'net', label: C.evNet, align: 'right', sortable: true, sortValue: (e) => e.net, render: (e) => rm(e.net) },
    ];

    /* ---- All-payments table ---- */
    const paymentCols: Column<VendorPaymentRow>[] = [
        { key: 'paid_at', label: C.date, sortable: true, sortValue: (p) => p.paid_at ?? p.created_at ?? '', render: (p) => <span className="muted">{fmtDate(p.paid_at ?? p.created_at)}</span> },
        { key: 'reference', label: C.reference, sortable: true, render: (p) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{p.reference || '—'}</span> },
        {
            key: 'payer_name', label: C.guest, sortable: true, sortValue: (p) => p.payer_name.toLowerCase(),
            render: (p) => (
                <div style={{ minWidth: 0 }}>
                    <strong>{p.payer_name || '—'}</strong>
                    {p.payer_email && <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.payer_email}</div>}
                </div>
            ),
        },
        { key: 'event', label: C.eventCol, sortable: true, sortValue: (p) => (p.event ?? '').toLowerCase(), render: (p) => eventLink(p.event ?? '', p.slug) },
        { key: 'pax', label: C.pax, align: 'right', sortable: true, sortValue: (p) => p.pax, render: (p) => num(p.pax) },
        { key: 'amount', label: C.amount, align: 'right', sortable: true, sortValue: (p) => p.amount, render: (p) => <strong>{rm(p.amount)}</strong> },
        { key: 'platform_fee', label: C.charges, align: 'right', sortable: true, sortValue: (p) => p.platform_fee, render: (p) => <span className="muted">{rm(p.platform_fee)}</span> },
        { key: 'vendor_net', label: C.vendorNet, align: 'right', sortable: true, sortValue: (p) => p.vendor_net, render: (p) => rm(p.vendor_net) },
        { key: 'status', label: C.status, sortable: true, render: (p) => entryStatusBadge(p.status, { paid: C.paid, pending: C.pending, failed: C.failed, refunded: C.refunded }) },
        {
            key: 'released', label: C.releasedCol, align: 'center', sortable: true, sortValue: (p) => (p.released ? 1 : 0),
            render: (p) => (p.released ? <span className="badge badge-gold">{C.releasedYes}</span> : <span className="badge">{C.releasedNo}</span>),
        },
    ];

    /* ---- Payouts table ---- */
    const isVoid = (s: string) => ['void', 'voided', 'cancelled', 'canceled'].includes(s.toLowerCase());
    const payoutCols: Column<VendorPayoutRow>[] = [
        { key: 'reference', label: C.pRef, sortable: true, render: (p) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{p.reference || '—'}</span> },
        { key: 'released_at', label: C.pDate, sortable: true, sortValue: (p) => p.released_at ?? '', render: (p) => <span className="muted">{fmtDate(p.released_at)}</span> },
        { key: 'entries_count', label: C.pEntries, align: 'right', sortable: true, sortValue: (p) => p.entries_count, render: (p) => num(p.entries_count) },
        { key: 'net', label: C.pNet, align: 'right', sortable: true, sortValue: (p) => p.net, render: (p) => <strong>{rm(p.net)}</strong> },
        {
            key: 'status', label: C.pStatus, sortable: true, sortValue: (p) => p.status.toLowerCase(),
            render: (p) => (isVoid(p.status) ? <span className="badge badge-bad">{C.statusVoid}</span> : <span className="badge badge-ok">{C.statusReleased}</span>),
        },
    ];

    return (
        <div>
            <Link to="/admin/rsvp-payments" className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
                <ArrowLeft size={15} /> {C.back}
            </Link>

            <div className="page-head">
                <div className="spread" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={eyebrowStyle}>{C.eyebrow}</div>
                        <h1 style={{ margin: '2px 0 0' }}>{vendor.name}</h1>
                        {contact && <p className="muted" style={{ margin: '4px 0 0' }}>{contact}</p>}
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={summary.pending_release <= 0 || releasing}
                        onClick={() => void releasePayout()}
                    >
                        <Send size={15} /> {releasing ? C.releasing : C.releaseBtn}
                    </button>
                </div>
            </div>

            {/* Summary roll-up */}
            <div className="stat-grid" style={{ marginBottom: 12 }}>
                <Stat n={rm(summary.collected)} l={C.sCollected} sub={`${num(summary.entries)} ${C.entriesWord}`} icon={Wallet} tone="plum" />
                <Stat n={rm(summary.charges)} l={C.sCharges} sub={C.platformIncome} icon={Coins} tone="gold" />
                <Stat n={rm(summary.net)} l={C.sNet} icon={HandCoins} tone="plum" />
                <Stat n={rm(summary.released)} l={C.sReleased} icon={CheckCircle2} tone="plum" />
                <Stat n={rm(summary.pending_release)} l={C.sPending} icon={Clock} tone="plum" />
            </div>

            {/* Charge breakdown + money model */}
            <div className="row wrap" style={{ gap: 8, alignItems: 'center', marginBottom: 24 }}>
                {data.charge_breakdown.map((c, i) => (
                    <span key={i} className="badge badge-gold">{c.name}: {rm(c.amount)}</span>
                ))}
                <span className="muted" style={{ fontSize: 12.5 }}>{C.moneyModel}</span>
            </div>

            {/* Events — the vendor's per-event book */}
            <div className="row" style={{ gap: 10, marginBottom: 12, alignItems: 'center' }}>
                <div style={sectionIcon}><CalendarDays size={16} /></div>
                <div>
                    <h3 style={{ margin: 0 }}>{C.evTitle}</h3>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{C.evSub}</p>
                </div>
            </div>
            <div className="panel" style={{ padding: 16, marginBottom: 24 }}>
                <DataTable
                    columns={eventCols}
                    rows={data.events}
                    searchKeys={['event']}
                    pageSize={10}
                    empty={C.emptyEvents}
                    exportName="acara-vendor"
                />
            </div>

            {/* All payments */}
            <div className="panel" style={{ padding: 16, marginBottom: 24 }}>
                <h3 style={{ margin: '4px 6px 12px' }}>{C.payTitle}</h3>
                <DataTable
                    columns={paymentCols}
                    rows={data.payments}
                    searchKeys={['reference', 'payer_name', 'payer_email', 'event']}
                    pageSize={12}
                    empty={C.emptyRows}
                    exportName="bayaran-vendor"
                />
            </div>

            {/* Payouts */}
            <div className="row" style={{ gap: 10, marginBottom: 12, alignItems: 'center' }}>
                <div style={sectionIcon}><HandCoins size={16} /></div>
                <div>
                    <h3 style={{ margin: 0 }}>{C.payoutsTitle}</h3>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{C.payoutsSub}</p>
                </div>
            </div>
            <div className="panel" style={{ padding: 16 }}>
                <DataTable
                    columns={payoutCols}
                    rows={data.payouts}
                    searchKeys={['reference']}
                    pageSize={10}
                    empty={C.emptyPayouts}
                    exportName="pelepasan-vendor"
                />
            </div>
        </div>
    );
}

/* ------------------------------- bits ------------------------------- */

function entryStatusBadge(status: string, labels: { paid: string; pending: string; failed: string; refunded: string }): ReactNode {
    const s = status.toLowerCase();
    if (s === 'paid' || s === 'success' || s === 'completed') return <span className="badge badge-ok">{labels.paid}</span>;
    if (s === 'refunded') return <span className="badge badge-bad">{labels.refunded}</span>;
    if (s === 'failed' || s === 'cancelled' || s === 'canceled') return <span className="badge badge-bad">{labels.failed}</span>;
    return <span className="badge">{labels.pending}</span>;
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

/* ------------------------------ styles ------------------------------ */

const eyebrowStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)',
};
const sectionIcon: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
const statIcon: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
const statIconGold: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: '#fdf0dc', color: '#b4740f',
};
