import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
    Wallet, Coins, HandCoins, Clock, CheckCircle2, Store, Printer, Ban, Send, AlertTriangle, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { Drawer } from '../../components/Drawer';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

/* ------------------------------------------------------------------ *
 * API shapes — GET /admin/entry-payments
 * ------------------------------------------------------------------ */

/** Platform commission rule applied to every guest ticket. */
interface EntryFee {
    type: 'percent' | 'fixed';
    value: number;
    /** Days a payout is held before it becomes releasable. */
    grace_days: number;
}
/** Book-wide roll-up across every vendor. */
interface EntryTotals {
    entries: number;
    collected: number;
    commission: number;
    vendor_net: number;
    released: number;
    pending_release: number;
}
/** One vendor's slice of the book. `fees` is the platform commission it bore. */
interface VendorSummary {
    vendor_id: number;
    vendor_name: string;
    vendor_email: string;
    entries: number;
    collected: number;
    fees: number;
    net: number;
    released: number;
    pending_release: number;
}
/** One guest ticket payment. */
interface EntryRow {
    id: number | string;
    reference: string;
    created_at: string | null;
    paid_at: string | null;
    vendor_id: number;
    vendor_name: string;
    payer_name: string;
    payer_email: string;
    pax: number;
    amount: number;
    platform_fee: number;
    vendor_net: number;
    status: string;
    released: boolean;
}
interface EntryPaymentsData {
    enabled: boolean;
    fee: EntryFee;
    totals: EntryTotals;
    vendors: VendorSummary[];
    rows: EntryRow[];
}

/* ------------------------------------------------------------------ *
 * API shapes — GET/POST /admin/vendor-payouts
 * ------------------------------------------------------------------ */

interface PayoutVendorRef {
    id: number;
    name: string;
    company_name: string | null;
    email: string | null;
}
/** A recorded release of a vendor's owed money. */
interface Payout {
    id: number | string;
    reference: string;
    vendor: PayoutVendorRef | null;
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

/* ------------------------------------------------------------------ *
 * API shapes — GET /admin/vendor-payouts/{id}/receipt
 * ------------------------------------------------------------------ */

interface ReceiptPayout {
    reference: string;
    released_at: string | null;
    released_by: string | null;
    gross: number;
    fee_total: number;
    adjustment: number;
    net: number;
    entries_count: number;
    method: string | null;
    note: string | null;
    status: string;
}
interface ReceiptVendor {
    name: string;
    email: string | null;
    phone: string | null;
}
interface ReceiptPlatform {
    name: string;
    phone: string | null;
    email: string | null;
    website: string | null;
}
interface ReceiptEntry {
    reference: string;
    payer_name: string;
    paid_at: string | null;
    pax: number;
    amount: number;
    platform_fee: number;
    vendor_net: number;
}
interface PayoutReceipt {
    payout: ReceiptPayout;
    vendor: ReceiptVendor;
    platform: ReceiptPlatform;
    currency: string;
    entries: ReceiptEntry[];
}

/** Minimal axios error read — same shape the rest of the app pulls messages from. */
type ApiError = { response?: { status?: number; data?: { message?: string } } };

export function AdminEntryPayments() {
    const { lang } = useLang();
    const dialog = useDialog();
    const C = dict({
        bm: {
            title: 'Bayaran Setiap Kemasukan',
            subtitle: 'Setiap tetamu bayar melalui platform; wang setiap vendor diasingkan. Lepaskan yang terhutang dan cetak resit.',
            offNotice: 'Bayaran setiap kemasukan kini DIMATIKAN. Hidupkannya di Tetapan → Ciri.',
            feeLabel: 'Komisen', graceLabel: 'Tempoh tangguh', daysWord: 'hari',
            moneyModel: 'Tetamu bayar kasar → platform simpan komisen → vendor terima bersih (vendor uruskan cukai sendiri).',
            sCollected: 'Jumlah Dikutip', sCommission: 'Komisen Diperoleh', sOwed: 'Terhutang kepada Vendor',
            sPending: 'Menunggu Bayaran', sReleased: 'Telah Dilepaskan', entriesWord: 'kemasukan',
            vendorsTitle: 'Vendor', vendorsSub: 'Baki setiap vendor. Lepaskan hanya bila ada baki menunggu.',
            vEntries: 'Kemasukan', vCollected: 'Dikutip', vCommission: 'Komisen', vNet: 'Bersih', vReleased: 'Dilepaskan', vPending: 'Menunggu',
            releaseBtn: 'Lepaskan Bayaran', settled: 'Tiada baki', noVendors: 'Belum ada vendor.',
            allPayments: 'Semua Bayaran',
            date: 'Tarikh', reference: 'Rujukan', vendor: 'Vendor', guest: 'Tetamu', pax: 'Pax',
            amount: 'Jumlah', commission: 'Komisen', vendorNet: 'Bersih Vendor', status: 'Status', releasedCol: 'Lepas',
            allVendors: 'Semua vendor', paid: 'Dibayar', pending: 'Menunggu', failed: 'Gagal', refunded: 'Dikembalikan',
            releasedYes: 'Dilepaskan', releasedNo: 'Ditahan', emptyRows: 'Belum ada bayaran.',
            payoutsTitle: 'Bayaran Dilepaskan', payoutsSub: 'Setiap pelepasan yang direkodkan kepada vendor.',
            pRef: 'Rujukan', pVendor: 'Vendor', pDate: 'Tarikh', pEntries: 'Kemasukan', pNet: 'Bersih', pStatus: 'Status', pActions: '',
            printReceipt: 'Cetak Resit', voidBtn: 'Batalkan', statusReleased: 'Dilepaskan', statusVoid: 'Dibatalkan',
            emptyPayouts: 'Belum ada pelepasan.',
            releaseTitle: (v: string) => `Lepaskan bayaran kepada ${v}`,
            releaseAmount: 'Amaun untuk dilepaskan', releaseHint: 'Semua kemasukan berbayar yang belum dilepaskan akan dijelaskan sebagai satu bayaran.',
            adjustment: 'Pelarasan (RM)', adjustmentHint: 'Pilihan. Positif menambah, negatif menolak daripada bersih.',
            method: 'Kaedah bayaran', methodPh: 'cth. Pindahan bank', note: 'Nota', notePh: 'Pilihan',
            cancel: 'Batal', confirmRelease: 'Lepaskan Sekarang', releasing: 'Melepaskan…',
            releaseFailed: 'Gagal melepaskan bayaran. Sila cuba lagi.',
            releasedTitle: 'Bayaran dilepaskan', printNow: 'Cetak resit', later: 'Nanti',
            releasedMsg: (amt: string, ref: string) => `${amt} telah dilepaskan (${ref}). Cetak resit sekarang?`,
            confirmVoid: (ref: string) => `Batalkan bayaran ${ref}? Baki vendor akan dikembalikan sebagai belum dilepaskan.`,
            // receipt
            rcTitle: 'Resit Bayaran', rcWord: 'BAYARAN VENDOR / VENDOR PAYOUT',
            rcReleasedTo: 'Dilepaskan kepada', rcBy: 'Dilepaskan oleh', rcEntries: 'Kemasukan',
            rcColRef: 'Rujukan', rcColGuest: 'Tetamu', rcColDate: 'Tarikh', rcColPax: 'Pax', rcColAmount: 'Jumlah', rcColFee: 'Komisen', rcColNet: 'Bersih',
            rcGross: 'Jumlah dikutip', rcCommission: 'Komisen platform', rcAdjustment: 'Pelarasan', rcNet: 'Bayaran bersih',
            rcMethod: 'Kaedah', rcNote: 'Nota', rcClose: 'Tutup', rcPrint: 'Cetak', rcNoEntries: 'Tiada kemasukan.',
        },
        en: {
            title: 'Pay-per-entry',
            subtitle: 'Every guest pays through the platform; each vendor\'s money stays separate. Release what\'s owed and print a receipt.',
            offNotice: 'Pay-per-entry is currently OFF. Turn it on in Settings → Features.',
            feeLabel: 'Commission', graceLabel: 'Grace', daysWord: 'days',
            moneyModel: 'Guest pays gross → platform keeps commission → vendor gets net (the vendor handles their own tax).',
            sCollected: 'Collected', sCommission: 'Commission earned', sOwed: 'Owed to vendors',
            sPending: 'Pending payout', sReleased: 'Released', entriesWord: 'entries',
            vendorsTitle: 'Vendors', vendorsSub: 'Each vendor\'s balance. Release only when something is pending.',
            vEntries: 'Entries', vCollected: 'Collected', vCommission: 'Commission', vNet: 'Net', vReleased: 'Released', vPending: 'Pending',
            releaseBtn: 'Release payout', settled: 'Nothing due', noVendors: 'No vendors yet.',
            allPayments: 'All payments',
            date: 'Date', reference: 'Reference', vendor: 'Vendor', guest: 'Guest', pax: 'Pax',
            amount: 'Amount', commission: 'Commission', vendorNet: 'Vendor net', status: 'Status', releasedCol: 'Released',
            allVendors: 'All vendors', paid: 'Paid', pending: 'Pending', failed: 'Failed', refunded: 'Refunded',
            releasedYes: 'Released', releasedNo: 'Held', emptyRows: 'No payments yet.',
            payoutsTitle: 'Payouts', payoutsSub: 'Every recorded release to a vendor.',
            pRef: 'Reference', pVendor: 'Vendor', pDate: 'Date', pEntries: 'Entries', pNet: 'Net', pStatus: 'Status', pActions: '',
            printReceipt: 'Print receipt', voidBtn: 'Void', statusReleased: 'Released', statusVoid: 'Voided',
            emptyPayouts: 'No payouts yet.',
            releaseTitle: (v: string) => `Release payout to ${v}`,
            releaseAmount: 'Amount to release', releaseHint: 'All currently-unreleased paid entries will be settled as one payout.',
            adjustment: 'Adjustment (RM)', adjustmentHint: 'Optional. Positive adds, negative deducts from the net.',
            method: 'Payment method', methodPh: 'e.g. Bank transfer', note: 'Note', notePh: 'Optional',
            cancel: 'Cancel', confirmRelease: 'Release now', releasing: 'Releasing…',
            releaseFailed: 'Could not release the payout. Please try again.',
            releasedTitle: 'Payout released', printNow: 'Print receipt', later: 'Later',
            releasedMsg: (amt: string, ref: string) => `${amt} released (${ref}). Print the receipt now?`,
            confirmVoid: (ref: string) => `Void payout ${ref}? The vendor's balance returns to unreleased.`,
            rcTitle: 'Payout receipt', rcWord: 'BAYARAN VENDOR / VENDOR PAYOUT',
            rcReleasedTo: 'Released to', rcBy: 'Released by', rcEntries: 'Entries',
            rcColRef: 'Reference', rcColGuest: 'Guest', rcColDate: 'Date', rcColPax: 'Pax', rcColAmount: 'Amount', rcColFee: 'Commission', rcColNet: 'Net',
            rcGross: 'Gross collected', rcCommission: 'Platform commission', rcAdjustment: 'Adjustment', rcNet: 'Net payout',
            rcMethod: 'Method', rcNote: 'Note', rcClose: 'Close', rcPrint: 'Print', rcNoEntries: 'No entries.',
        },
        zh: {
            title: '按入场收费',
            subtitle: '每位宾客均通过平台付款；各商家的款项彼此独立。释放应付款并打印收据。',
            offNotice: '按入场收费目前已关闭。请在「设置 → 功能」中开启。',
            feeLabel: '佣金', graceLabel: '宽限期', daysWord: '天',
            moneyModel: '宾客支付总额 → 平台留存佣金 → 商家获得净额（税务由商家自理）。',
            sCollected: '已收款', sCommission: '所得佣金', sOwed: '应付商家',
            sPending: '待结算', sReleased: '已释放', entriesWord: '笔入场',
            vendorsTitle: '商家', vendorsSub: '各商家余额。仅在有待结算余额时释放。',
            vEntries: '入场', vCollected: '已收', vCommission: '佣金', vNet: '净额', vReleased: '已释放', vPending: '待结算',
            releaseBtn: '释放款项', settled: '无待付', noVendors: '暂无商家。',
            allPayments: '全部付款',
            date: '日期', reference: '交易编号', vendor: '商家', guest: '宾客', pax: '人数',
            amount: '金额', commission: '佣金', vendorNet: '商家净额', status: '状态', releasedCol: '释放',
            allVendors: '全部商家', paid: '已付款', pending: '处理中', failed: '失败', refunded: '已退款',
            releasedYes: '已释放', releasedNo: '暂扣', emptyRows: '暂无付款。',
            payoutsTitle: '释放记录', payoutsSub: '向商家释放款项的每一笔记录。',
            pRef: '交易编号', pVendor: '商家', pDate: '日期', pEntries: '入场', pNet: '净额', pStatus: '状态', pActions: '',
            printReceipt: '打印收据', voidBtn: '作废', statusReleased: '已释放', statusVoid: '已作废',
            emptyPayouts: '暂无释放记录。',
            releaseTitle: (v: string) => `向 ${v} 释放款项`,
            releaseAmount: '释放金额', releaseHint: '当前所有尚未释放的已付款入场将合并为一笔款项结算。',
            adjustment: '调整（RM）', adjustmentHint: '可选。正数增加，负数从净额中扣减。',
            method: '付款方式', methodPh: '例如：银行转账', note: '备注', notePh: '可选',
            cancel: '取消', confirmRelease: '立即释放', releasing: '释放中…',
            releaseFailed: '释放款项失败，请重试。',
            releasedTitle: '款项已释放', printNow: '打印收据', later: '稍后',
            releasedMsg: (amt: string, ref: string) => `已释放 ${amt}（${ref}）。现在打印收据吗？`,
            confirmVoid: (ref: string) => `作废款项 ${ref}？该商家余额将恢复为未释放。`,
            rcTitle: '款项收据', rcWord: '商家结算 / VENDOR PAYOUT',
            rcReleasedTo: '收款方', rcBy: '释放人', rcEntries: '入场明细',
            rcColRef: '交易编号', rcColGuest: '宾客', rcColDate: '日期', rcColPax: '人数', rcColAmount: '金额', rcColFee: '佣金', rcColNet: '净额',
            rcGross: '收款总额', rcCommission: '平台佣金', rcAdjustment: '调整', rcNet: '净结算额',
            rcMethod: '方式', rcNote: '备注', rcClose: '关闭', rcPrint: '打印', rcNoEntries: '无入场明细。',
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
    const [data, setData] = useState<EntryPaymentsData | null>(null);
    const [payouts, setPayouts] = useState<Payout[]>([]);

    const load = useCallback(async () => {
        const [ep, po] = await Promise.all([
            api.get<EntryPaymentsData>('/admin/entry-payments'),
            api.get<Payout[]>('/admin/vendor-payouts'),
        ]);
        setData(ep.data);
        setPayouts(po.data);
    }, []);

    useEffect(() => { void load(); }, [load]);

    /* ---- All-payments vendor filter ---- */
    const [vendorFilter, setVendorFilter] = useState<number | 'all'>('all');

    /* ---- Release modal ---- */
    const [releaseFor, setReleaseFor] = useState<VendorSummary | null>(null);
    const [adjustment, setAdjustment] = useState('');
    const [method, setMethod] = useState('');
    const [note, setNote] = useState('');
    const [releasing, setReleasing] = useState(false);
    const [releaseErr, setReleaseErr] = useState<string | null>(null);

    function openRelease(v: VendorSummary) {
        setReleaseFor(v);
        setAdjustment('');
        setMethod('');
        setNote('');
        setReleaseErr(null);
    }

    async function submitRelease(e: React.FormEvent) {
        e.preventDefault();
        if (!releaseFor) return;
        setReleasing(true);
        setReleaseErr(null);
        try {
            const r = await api.post<Payout>('/admin/vendor-payouts', {
                vendor_id: releaseFor.vendor_id,
                adjustment: adjustment.trim() === '' ? 0 : Number(adjustment),
                method: method.trim() || undefined,
                note: note.trim() || undefined,
            });
            const created = r.data;
            setReleaseFor(null);
            await load();
            // Offer to print the freshly-created payout's receipt.
            const ok = await dialog.confirm({
                title: C.releasedTitle,
                message: C.releasedMsg(rm(created.net), created.reference),
                confirmText: C.printNow,
                cancelText: C.later,
            });
            if (ok) await openReceipt(created.id);
        } catch (err: unknown) {
            const e = err as ApiError;
            setReleaseErr(e?.response?.data?.message ?? C.releaseFailed);
        } finally {
            setReleasing(false);
        }
    }

    /* ---- Void ---- */
    async function voidPayout(p: Payout) {
        if (!(await dialog.confirm({ message: C.confirmVoid(p.reference), danger: true }))) return;
        await api.post(`/admin/vendor-payouts/${p.id}/void`);
        await load();
    }

    /* ---- Receipt modal ---- */
    const [receipt, setReceipt] = useState<PayoutReceipt | null>(null);

    async function openReceipt(id: number | string) {
        try {
            const r = await api.get<PayoutReceipt>(`/admin/vendor-payouts/${id}/receipt`);
            setReceipt(r.data);
        } catch {
            // Receipt unavailable (e.g. voided or deleted) — nothing to show.
        }
    }

    if (!data) return <div className="loading-screen"><div className="spinner" /></div>;

    const t = data.totals;
    const feeLabel = data.fee.type === 'percent' ? `${data.fee.value}%` : `RM ${data.fee.value}`;
    const vendorsSorted = [...data.vendors].sort((a, b) => b.pending_release - a.pending_release);
    const filteredRows = vendorFilter === 'all' ? data.rows : data.rows.filter((r) => r.vendor_id === vendorFilter);

    /* ---- Payments table ---- */
    const rowCols: Column<EntryRow>[] = [
        { key: 'paid_at', label: C.date, sortable: true, sortValue: (r) => r.paid_at ?? r.created_at ?? '', render: (r) => <span className="muted">{fmtDate(r.paid_at ?? r.created_at)}</span> },
        { key: 'reference', label: C.reference, sortable: true, render: (r) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{r.reference || '—'}</span> },
        { key: 'vendor_name', label: C.vendor, sortable: true, sortValue: (r) => r.vendor_name.toLowerCase(), render: (r) => <span>{r.vendor_name}</span> },
        {
            key: 'payer_name', label: C.guest, sortable: true, sortValue: (r) => r.payer_name.toLowerCase(),
            render: (r) => (
                <div style={{ minWidth: 0 }}>
                    <strong>{r.payer_name || '—'}</strong>
                    {r.payer_email && <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.payer_email}</div>}
                </div>
            ),
        },
        { key: 'pax', label: C.pax, align: 'right', sortable: true, sortValue: (r) => r.pax, render: (r) => num(r.pax) },
        { key: 'amount', label: C.amount, align: 'right', sortable: true, sortValue: (r) => r.amount, render: (r) => <strong>{rm(r.amount)}</strong> },
        { key: 'platform_fee', label: C.commission, align: 'right', sortable: true, sortValue: (r) => r.platform_fee, render: (r) => <span className="muted">{rm(r.platform_fee)}</span> },
        { key: 'vendor_net', label: C.vendorNet, align: 'right', sortable: true, sortValue: (r) => r.vendor_net, render: (r) => rm(r.vendor_net) },
        { key: 'status', label: C.status, sortable: true, render: (r) => entryStatusBadge(r.status, { paid: C.paid, pending: C.pending, failed: C.failed, refunded: C.refunded }) },
        {
            key: 'released', label: C.releasedCol, align: 'center', sortable: true, sortValue: (r) => (r.released ? 1 : 0),
            render: (r) => (r.released ? <span className="badge badge-gold">{C.releasedYes}</span> : <span className="badge">{C.releasedNo}</span>),
        },
    ];

    /* ---- Payouts table ---- */
    const isVoid = (s: string) => ['void', 'voided', 'cancelled', 'canceled'].includes(s.toLowerCase());
    const payoutCols: Column<Payout>[] = [
        { key: 'reference', label: C.pRef, sortable: true, render: (p) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{p.reference || '—'}</span> },
        {
            key: 'vendor', label: C.pVendor, sortable: true, sortValue: (p) => (p.vendor?.name ?? '').toLowerCase(),
            render: (p) => (
                <div style={{ minWidth: 0 }}>
                    <strong>{p.vendor?.name ?? '—'}</strong>
                    {p.vendor?.company_name && <div className="muted" style={{ fontSize: 12 }}>{p.vendor.company_name}</div>}
                </div>
            ),
        },
        { key: 'released_at', label: C.pDate, sortable: true, sortValue: (p) => p.released_at ?? '', render: (p) => <span className="muted">{fmtDate(p.released_at)}</span> },
        { key: 'entries_count', label: C.pEntries, align: 'right', sortable: true, sortValue: (p) => p.entries_count, render: (p) => num(p.entries_count) },
        { key: 'net', label: C.pNet, align: 'right', sortable: true, sortValue: (p) => p.net, render: (p) => <strong>{rm(p.net)}</strong> },
        {
            key: 'status', label: C.pStatus, sortable: true, sortValue: (p) => p.status.toLowerCase(),
            render: (p) => (isVoid(p.status) ? <span className="badge badge-bad">{C.statusVoid}</span> : <span className="badge badge-ok">{C.statusReleased}</span>),
        },
        {
            key: '_actions', label: C.pActions, align: 'right',
            render: (p) => (
                <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openReceipt(p.id)}>
                        <Printer size={15} /> {C.printReceipt}
                    </button>
                    {!isVoid(p.status) && (
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={() => void voidPayout(p)}>
                            <Ban size={15} /> {C.voidBtn}
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {!data.enabled && (
                <div style={noticeStyle}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span>{C.offNotice}</span>
                </div>
            )}

            {/* Global roll-up */}
            <div className="stat-grid" style={{ marginBottom: 12 }}>
                <Stat n={rm(t.collected)} l={C.sCollected} sub={`${num(t.entries)} ${C.entriesWord}`} icon={Wallet} tone="plum" />
                <Stat n={rm(t.commission)} l={C.sCommission} icon={Coins} tone="gold" />
                <Stat n={rm(t.vendor_net)} l={C.sOwed} icon={HandCoins} tone="plum" />
                <Stat n={rm(t.pending_release)} l={C.sPending} icon={Clock} tone="plum" />
                <Stat n={rm(t.released)} l={C.sReleased} icon={CheckCircle2} tone="plum" />
            </div>

            <div className="row wrap" style={{ gap: 8, alignItems: 'center', marginBottom: 24 }}>
                <span className="badge badge-gold">{C.feeLabel}: {feeLabel}</span>
                <span className="badge">{C.graceLabel}: {data.fee.grace_days} {C.daysWord}</span>
                <span className="muted" style={{ fontSize: 12.5 }}>{C.moneyModel}</span>
            </div>

            {/* Per-vendor balances */}
            <div className="row" style={{ gap: 10, marginBottom: 6, alignItems: 'center' }}>
                <div style={sectionIcon}><Store size={16} /></div>
                <div>
                    <h3 style={{ margin: 0 }}>{C.vendorsTitle}</h3>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{C.vendorsSub}</p>
                </div>
            </div>

            {vendorsSorted.length === 0 ? (
                <div className="panel center muted" style={{ padding: 32, marginBottom: 24 }}>{C.noVendors}</div>
            ) : (
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', marginBottom: 26 }}>
                    {vendorsSorted.map((v) => (
                        <div className="panel" key={v.vendor_id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="spread" style={{ alignItems: 'flex-start', gap: 10 }}>
                                <div style={{ minWidth: 0 }}>
                                    <h3 style={{ margin: 0, fontSize: 17 }}>{v.vendor_name}</h3>
                                    {v.vendor_email && <div className="muted" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.vendor_email}</div>}
                                </div>
                                {v.pending_release > 0
                                    ? <span className="badge badge-gold" style={{ flexShrink: 0 }}>{rm(v.pending_release)}</span>
                                    : <span className="badge badge-ok" style={{ flexShrink: 0 }}>{C.settled}</span>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                <Mini l={C.vEntries} v={num(v.entries)} />
                                <Mini l={C.vCollected} v={rm(v.collected)} />
                                <Mini l={C.vCommission} v={rm(v.fees)} />
                                <Mini l={C.vNet} v={rm(v.net)} />
                                <Mini l={C.vReleased} v={rm(v.released)} />
                                <Mini l={C.vPending} v={rm(v.pending_release)} accent={v.pending_release > 0} />
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary btn-block"
                                style={{ marginTop: 'auto' }}
                                disabled={v.pending_release <= 0}
                                onClick={() => openRelease(v)}
                            >
                                <Send size={15} /> {C.releaseBtn}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* All payments */}
            <div className="panel" style={{ padding: 16, marginBottom: 24 }}>
                <h3 style={{ margin: '4px 6px 12px' }}>{C.allPayments}</h3>
                <DataTable
                    columns={rowCols}
                    rows={filteredRows}
                    searchKeys={['reference', 'vendor_name', 'payer_name', 'payer_email']}
                    pageSize={12}
                    empty={C.emptyRows}
                    exportName="bayaran-kemasukan"
                    toolbar={(
                        <select
                            value={vendorFilter === 'all' ? 'all' : String(vendorFilter)}
                            onChange={(e) => setVendorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            style={selectInput}
                            aria-label={C.vendor}
                        >
                            <option value="all">{C.allVendors}</option>
                            {data.vendors.map((v) => (
                                <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                            ))}
                        </select>
                    )}
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
                    rows={payouts}
                    searchKeys={['reference']}
                    pageSize={10}
                    empty={C.emptyPayouts}
                    exportName="pelepasan-vendor"
                />
            </div>

            {/* Release drawer */}
            <Drawer
                open={!!releaseFor}
                onClose={() => setReleaseFor(null)}
                title={releaseFor ? C.releaseTitle(releaseFor.vendor_name) : ''}
                width={460}
                footer={releaseFor ? (
                    <>
                        <button type="button" className="btn btn-ghost grow" onClick={() => setReleaseFor(null)}>{C.cancel}</button>
                        <button type="submit" form="release-form" className="btn btn-primary grow" disabled={releasing}>
                            <Send size={15} /> {releasing ? C.releasing : C.confirmRelease}
                        </button>
                    </>
                ) : undefined}
            >
                {releaseFor && (
                    <form id="release-form" onSubmit={submitRelease}>
                        <div style={releaseAmountBox}>
                            <div className="muted" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{C.releaseAmount}</div>
                            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--serif)', color: 'var(--plum)', marginTop: 2 }}>{rm(releaseFor.pending_release)}</div>
                            <div className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{C.releaseHint}</div>
                        </div>

                        {releaseErr && <p className="form-err" style={{ marginBottom: 12 }}>{releaseErr}</p>}

                        <div className="field">
                            <label>{C.adjustment}</label>
                            <input type="number" step="0.01" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="0.00" />
                            <small className="muted">{C.adjustmentHint}</small>
                        </div>
                        <div className="field">
                            <label>{C.method}</label>
                            <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder={C.methodPh} />
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                            <label>{C.note}</label>
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={C.notePh} />
                        </div>
                    </form>
                )}
            </Drawer>

            {/* Receipt drawer */}
            <Drawer
                open={receipt !== null}
                onClose={() => setReceipt(null)}
                title={C.rcTitle}
                width={640}
                footer={receipt ? (
                    <>
                        <button type="button" className="btn btn-ghost" onClick={() => setReceipt(null)}>{C.rcClose}</button>
                        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                            <Printer size={16} /> {C.rcPrint}
                        </button>
                    </>
                ) : undefined}
            >
                {receipt && <PayoutReceiptCard r={receipt} loc={loc} C={C} />}
            </Drawer>
        </div>
    );
}

/* ---- receipt copy shape (subset actually read by the card) ---- */
interface ReceiptCopy {
    rcWord: string; rcReleasedTo: string; rcBy: string; rcEntries: string;
    rcColRef: string; rcColGuest: string; rcColDate: string; rcColPax: string; rcColAmount: string; rcColFee: string; rcColNet: string;
    rcGross: string; rcCommission: string; rcAdjustment: string; rcNet: string;
    rcMethod: string; rcNote: string; rcNoEntries: string;
    statusReleased: string; statusVoid: string;
}

/** Printable payout receipt — mirrors the platform receipt look; print CSS
 *  scopes the page to `.pk-receipt` so `window.print()` yields a clean sheet. */
function PayoutReceiptCard({ r, loc, C }: { r: PayoutReceipt; loc: string; C: ReceiptCopy }) {
    const money = (n: number) => `${r.currency} ${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (iso: string | null) => {
        if (!iso) return '—';
        const dt = new Date(iso);
        return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(loc, { day: '2-digit', month: 'long', year: 'numeric' });
    };
    const p = r.payout;
    const voided = ['void', 'voided', 'cancelled', 'canceled'].includes(p.status.toLowerCase());
    const website = r.platform.website ?? '';
    const websiteHref = website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : '';

    return (
        <>
            <style>{PRINT_CSS}</style>
            <div className="pk-receipt" style={receiptCard}>
                <div style={ribbon} />
                <div style={{ padding: '24px 26px 26px' }}>
                    {/* Header: platform identity + payout meta */}
                    <div className="spread" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{r.platform.name}</div>
                            <div className="muted" style={{ fontSize: 12.5, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {r.platform.phone && <span>{r.platform.phone}</span>}
                                {website && <a href={websiteHref} target="_blank" rel="noreferrer" style={{ color: 'var(--plum)', textDecoration: 'none', fontWeight: 600 }}>{website}</a>}
                                {r.platform.email && <a href={`mailto:${r.platform.email}`} style={{ color: 'var(--plum)', textDecoration: 'none', fontWeight: 600 }}>{r.platform.email}</a>}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={receiptLabel}>{C.rcWord}</div>
                            <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 13, marginTop: 6, color: 'var(--ink)' }}>{p.reference || '—'}</div>
                            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{fmtDate(p.released_at)}</div>
                            <div style={{ marginTop: 8 }}>
                                {voided
                                    ? <span className="badge badge-bad">{C.statusVoid}</span>
                                    : <span className="badge badge-ok">{C.statusReleased}</span>}
                            </div>
                        </div>
                    </div>

                    <hr style={rule} />

                    {/* Released to */}
                    <div style={{ marginBottom: 18 }}>
                        <div style={sectionLabel}>{C.rcReleasedTo}</div>
                        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{r.vendor.name || '—'}</div>
                        {r.vendor.email && <div className="muted" style={{ fontSize: 13, marginTop: 1 }}>{r.vendor.email}</div>}
                        {r.vendor.phone && <div className="muted" style={{ fontSize: 13, marginTop: 1 }}>{r.vendor.phone}</div>}
                        {p.released_by && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{C.rcBy}: {p.released_by}</div>}
                    </div>

                    {/* Entries */}
                    <div style={sectionLabel}>{C.rcEntries} · {p.entries_count}</div>
                    <div style={{ overflowX: 'auto', marginTop: 6 }}>
                        <table style={itemsTable}>
                            <thead>
                                <tr>
                                    <th style={{ ...thCell, textAlign: 'left' }}>{C.rcColRef}</th>
                                    <th style={{ ...thCell, textAlign: 'left' }}>{C.rcColGuest}</th>
                                    <th style={{ ...thCell, textAlign: 'left' }}>{C.rcColDate}</th>
                                    <th style={{ ...thCell, textAlign: 'right' }}>{C.rcColPax}</th>
                                    <th style={{ ...thCell, textAlign: 'right' }}>{C.rcColAmount}</th>
                                    <th style={{ ...thCell, textAlign: 'right' }}>{C.rcColFee}</th>
                                    <th style={{ ...thCell, textAlign: 'right' }}>{C.rcColNet}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {r.entries.length === 0 && (
                                    <tr><td colSpan={7} className="muted" style={{ ...tdCell, textAlign: 'center' }}>{C.rcNoEntries}</td></tr>
                                )}
                                {r.entries.map((e, i) => (
                                    <tr key={i}>
                                        <td style={{ ...tdCell, textAlign: 'left', fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{e.reference || '—'}</td>
                                        <td style={{ ...tdCell, textAlign: 'left' }}>{e.payer_name || '—'}</td>
                                        <td style={{ ...tdCell, textAlign: 'left', whiteSpace: 'nowrap' }}>{fmtDate(e.paid_at)}</td>
                                        <td style={{ ...tdCell, textAlign: 'right' }}>{e.pax}</td>
                                        <td style={{ ...tdCell, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(e.amount)}</td>
                                        <td style={{ ...tdCell, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(e.platform_fee)}</td>
                                        <td style={{ ...tdCell, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(e.vendor_net)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals: gross − commission ± adjustment = net */}
                    <div style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 300 }}>
                        <div className="spread" style={totalRow}>
                            <span className="muted">{C.rcGross}</span>
                            <span>{money(p.gross)}</span>
                        </div>
                        <div className="spread" style={totalRow}>
                            <span className="muted">{C.rcCommission}</span>
                            <span style={{ color: 'var(--bad)' }}>-{money(p.fee_total)}</span>
                        </div>
                        {p.adjustment !== 0 && (
                            <div className="spread" style={totalRow}>
                                <span className="muted">{C.rcAdjustment}</span>
                                <span style={{ color: p.adjustment > 0 ? 'var(--ok)' : 'var(--bad)' }}>
                                    {p.adjustment > 0 ? '+' : '-'}{money(Math.abs(p.adjustment))}
                                </span>
                            </div>
                        )}
                        <div className="spread" style={grandTotalRow}>
                            <span style={{ fontWeight: 700 }}>{C.rcNet}</span>
                            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--plum)' }}>{money(p.net)}</span>
                        </div>
                    </div>

                    {/* Method / note */}
                    {(p.method || p.note) && (
                        <div style={madeBy}>
                            {p.method && <div><strong>{C.rcMethod}:</strong> {p.method}</div>}
                            {p.note && <div style={{ marginTop: p.method ? 4 : 0 }}><strong>{C.rcNote}:</strong> {p.note}</div>}
                        </div>
                    )}
                </div>
            </div>
        </>
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

/** Compact label/value pair used inside each vendor card. */
function Mini({ l, v, accent }: { l: string; v: string; accent?: boolean }) {
    return (
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: accent ? 'var(--gold)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{l}</div>
        </div>
    );
}

/* ------------------------------ styles ------------------------------ */

const noticeStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#fdf0dc', color: '#b4740f', border: '1px solid var(--gold-soft)',
    borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14, fontWeight: 600,
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
const selectInput: React.CSSProperties = {
    padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)',
    fontSize: 13, background: '#fff', color: 'var(--ink)',
};
const releaseAmountBox: React.CSSProperties = {
    background: 'var(--cream)', border: '1px dashed var(--gold)', borderRadius: 12,
    padding: 16, marginBottom: 18,
};

/* Print styles — mirrors the shared Receipt component so the payout receipt
   prints as a single clean sheet. */
const PRINT_CSS = `@media print{
  body *{visibility:hidden !important;}
  .pk-receipt,.pk-receipt *{visibility:visible !important;}
  .pk-receipt{position:fixed !important;left:0;top:0;right:0;width:100% !important;max-width:none !important;margin:0 !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;background:#fff !important;}
  @page{margin:12mm;}
}`;

const receiptCard: React.CSSProperties = {
    background: '#fff', color: 'var(--ink)', border: '1px solid var(--line)',
    borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)',
};
const ribbon: React.CSSProperties = {
    height: 6, background: 'linear-gradient(90deg, var(--plum), var(--gold))',
};
const receiptLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'var(--muted)',
};
const sectionLabel: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)',
};
const rule: React.CSSProperties = {
    border: 0, borderTop: '1px solid var(--line)', margin: '18px 0',
};
const itemsTable: React.CSSProperties = {
    width: '100%', borderCollapse: 'collapse', fontSize: 13.5,
};
const thCell: React.CSSProperties = {
    padding: '8px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
    color: 'var(--muted)', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap',
};
const tdCell: React.CSSProperties = {
    padding: '10px 8px', borderBottom: '1px solid var(--line)', verticalAlign: 'top',
};
const totalRow: React.CSSProperties = {
    fontSize: 14, padding: '5px 0',
};
const grandTotalRow: React.CSSProperties = {
    fontSize: 14, padding: '10px 0 0', marginTop: 6, borderTop: '2px solid var(--line)',
};
const madeBy: React.CSSProperties = {
    fontSize: 12.5, color: 'var(--muted)', marginTop: 22,
    paddingTop: 16, borderTop: '1px dashed var(--line)', lineHeight: 1.5,
};
