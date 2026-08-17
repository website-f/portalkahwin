import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Wallet, Percent, Coins, BadgeCheck, Hourglass, Lock, Paperclip, Check, Eye, Download, type LucideIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { mediaUrl } from '../../lib/base';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';

interface EntrySummary {
    entries: number;
    collected: number;
    fees: number;
    net: number;
    released: number;
    pending_release: number;
}

interface EntryPayment {
    id: string;
    reference: string;
    created_at: string;
    paid_at: string | null;
    payer_name: string;
    payer_email: string;
    event: string | null;
    slug: string | null;
    pax: number;
    amount: number;
    platform_fee: number;
    vendor_net: number;
    status: 'pending' | 'paid' | 'failed';
    released: boolean;
}

interface EntryPayout {
    id: string;
    reference: string;
    gross: number;
    fee_total: number;
    adjustment: number;
    net: number;
    entries_count: number;
    method: string | null;
    note: string | null;
    attachment_url: string | null;
    released_at: string | null;
    acknowledged_at: string | null;
    status: string;
}

interface EntryPaymentsData {
    can_use: boolean;
    summary: EntrySummary;
    payments: EntryPayment[];
    payouts: EntryPayout[];
}

export function VendorPayments() {
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Kutipan & Pembayaran', subtitle: 'Pantau kutipan RSVP acara bertiket anda — komisen platform, baki bersih dan bayaran keluar.',
            notReadyTitle: 'Bayaran ikut entri belum diaktifkan',
            notReadyBody: 'Kutipan RSVP berbayar belum diaktifkan untuk akaun anda — sila hubungi sokongan.',
            collected: 'Jumlah Kutipan', commission: 'Komisen Platform', net: 'Baki Bersih Anda',
            paidOut: 'Telah Dibayar', pendingPayout: 'Menunggu Bayaran',
            entriesWord: 'entri',
            commissionNote: 'Komisen platform ditolak daripada setiap kutipan sebelum baki bersih dibayar kepada anda.',
            collectionsTitle: 'Kutipan', date: 'Tarikh', reference: 'Rujukan', guest: 'Tetamu', event: 'Acara',
            pax: 'Pax', amount: 'Jumlah', commissionCol: 'Komisen', yourNet: 'Bersih Anda', status: 'Status',
            paid: 'Dibayar', pending: 'Menunggu', failed: 'Gagal',
            releasedYes: 'Dikeluarkan', releasedNo: 'Belum',
            noCollections: 'Belum ada kutipan.',
            payoutsTitle: 'Bayaran Diterima', pEntries: 'Entri', gross: 'Kasar', adjustment: 'Pelarasan',
            pNet: 'Bersih', method: 'Kaedah', received: 'Diterima',
            noPayouts: 'Belum ada bayaran.',
            proofCol: 'Bukti & Pengesahan', viewProof: 'Lihat bukti', acknowledge: 'Sahkan terima', acknowledged: 'Disahkan',
            receiptCol: 'Resit', viewReceipt: 'Lihat', downloadReceipt: 'Muat turun',
        },
        en: {
            title: 'Collections & Payouts', subtitle: 'Track your ticketed-event RSVP collections — platform commission, your net, and payouts.',
            notReadyTitle: "Pay-per-entry isn't enabled yet",
            notReadyBody: "Pay-per-entry isn't enabled for your account yet — contact support.",
            collected: 'Collected', commission: 'Platform commission', net: 'Your net',
            paidOut: 'Paid out', pendingPayout: 'Pending payout',
            entriesWord: 'entries',
            commissionNote: 'Platform commission is withheld from each collection before your net is paid out to you.',
            collectionsTitle: 'Collections', date: 'Date', reference: 'Reference', guest: 'Guest', event: 'Event',
            pax: 'Pax', amount: 'Amount', commissionCol: 'Commission', yourNet: 'Your net', status: 'Status',
            paid: 'Paid', pending: 'Pending', failed: 'Failed',
            releasedYes: 'Released', releasedNo: 'Pending',
            noCollections: 'No collections yet.',
            payoutsTitle: 'Payouts received', pEntries: 'Entries', gross: 'Gross', adjustment: 'Adjustment',
            pNet: 'Net', method: 'Method', received: 'Received',
            noPayouts: 'No payouts yet.',
            proofCol: 'Proof & Acknowledge', viewProof: 'View proof', acknowledge: 'Acknowledge receipt', acknowledged: 'Acknowledged',
            receiptCol: 'Receipt', viewReceipt: 'View', downloadReceipt: 'Download',
        },
        zh: {
            title: '收款与结算', subtitle: '追踪您售票活动的 RSVP 收款 — 平台佣金、您的净额与结算。',
            notReadyTitle: '按人收费尚未启用',
            notReadyBody: '您的账户尚未启用按人收费功能 — 请联系客服。',
            collected: '总收款', commission: '平台佣金', net: '您的净额',
            paidOut: '已结算', pendingPayout: '待结算',
            entriesWord: '笔',
            commissionNote: '平台佣金会在结算前从每笔收款中扣除。',
            collectionsTitle: '收款记录', date: '日期', reference: '交易编号', guest: '宾客', event: '活动',
            pax: '人数', amount: '金额', commissionCol: '佣金', yourNet: '您的净额', status: '状态',
            paid: '已付款', pending: '处理中', failed: '失败',
            releasedYes: '已发放', releasedNo: '待发放',
            noCollections: '暂无收款。',
            payoutsTitle: '已收结算', pEntries: '笔数', gross: '总额', adjustment: '调整',
            pNet: '净额', method: '方式', received: '已到账',
            noPayouts: '暂无结算记录。',
            proofCol: '凭证与确认', viewProof: '查看凭证', acknowledge: '确认收到', acknowledged: '已确认',
            receiptCol: '收据', viewReceipt: '查看', downloadReceipt: '下载',
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : 'en-MY';
    const rm = (n: number) => `RM ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    // Paid rows show money prominently; pending/failed rows are greyed so the eye
    // lands on what has actually settled.
    const money = (n: number, prominent: boolean): ReactNode =>
        prominent ? <strong>{rm(n)}</strong> : <span className="muted">{rm(n)}</span>;
    const fmtDate = (iso: string | null) => {
        if (!iso) return '—';
        const dt = new Date(iso);
        return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(loc, { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const [d, setD] = useState<EntryPaymentsData | null>(null);
    const [acking, setAcking] = useState<string | null>(null);
    const load = useCallback(() => {
        api.get<EntryPaymentsData>('/me/entry-payments').then((r) => setD(r.data)).catch(() => setD(null));
    }, []);
    useEffect(() => { load(); }, [load]);

    async function acknowledge(id: string) {
        setAcking(id);
        try {
            await api.post(`/me/payouts/${id}/acknowledge`);
            load();
        } finally {
            setAcking(null);
        }
    }

    /** Fetch the payout receipt PDF (auth'd) and either open it or download it. */
    async function receipt(p: { id: string; reference: string }, download: boolean) {
        try {
            const r = await api.get(`/me/payouts/${p.id}/receipt-pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(r.data as Blob);
            if (download) {
                const a = document.createElement('a');
                a.href = url; a.download = `resit-payout-${p.reference}.pdf`;
                document.body.appendChild(a); a.click(); a.remove();
            } else {
                window.open(url, '_blank');
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch { /* unavailable (e.g. voided) */ }
    }

    if (!d) return <div className="loading-screen"><div className="spinner" /></div>;

    if (!d.can_use) {
        return (
            <div>
                <div className="page-head">
                    <h1>{C.title}</h1>
                    <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
                </div>
                <div className="panel center" style={{ maxWidth: 480, margin: '40px auto', padding: 48 }}>
                    <div style={disabledIcon}><Lock size={24} /></div>
                    <h2 style={{ margin: '0 0 10px' }}>{C.notReadyTitle}</h2>
                    <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>{C.notReadyBody}</p>
                </div>
            </div>
        );
    }

    const s = d.summary;

    const payCols: Column<EntryPayment>[] = [
        {
            key: 'date', label: C.date, sortable: true,
            sortValue: (p) => p.paid_at ?? p.created_at,
            render: (p) => <span className="muted">{fmtDate(p.paid_at ?? p.created_at)}</span>,
        },
        {
            key: 'reference', label: C.reference, sortable: true,
            render: (p) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{p.reference || '—'}</span>,
        },
        {
            key: 'payer_name', label: C.guest, sortable: true, sortValue: (p) => p.payer_name.toLowerCase(),
            render: (p) => (
                <div style={{ minWidth: 0 }}>
                    <strong>{p.payer_name || '—'}</strong>
                    {p.payer_email && <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.payer_email}</div>}
                </div>
            ),
        },
        { key: 'event', label: C.event, render: (p) => <span>{p.event ?? '—'}</span> },
        { key: 'pax', label: C.pax, align: 'right', sortable: true, sortValue: (p) => p.pax, render: (p) => <span>{p.pax.toLocaleString(loc)}</span> },
        { key: 'amount', label: C.amount, align: 'right', sortable: true, sortValue: (p) => p.amount, render: (p) => money(p.amount, p.status === 'paid') },
        { key: 'platform_fee', label: C.commissionCol, align: 'right', sortable: true, sortValue: (p) => p.platform_fee, render: (p) => <span className="muted">{rm(p.platform_fee)}</span> },
        { key: 'vendor_net', label: C.yourNet, align: 'right', sortable: true, sortValue: (p) => p.vendor_net, render: (p) => money(p.vendor_net, p.status === 'paid') },
        { key: 'status', label: C.status, sortable: true, render: (p) => statusBadge(p.status, C) },
        {
            key: 'released', label: '', align: 'right', sortable: true, sortValue: (p) => (p.released ? 1 : 0),
            render: (p) => p.released
                ? <span className="badge badge-ok">{C.releasedYes}</span>
                : <span className="badge">{C.releasedNo}</span>,
        },
    ];

    const payoutCols: Column<EntryPayout>[] = [
        {
            key: 'reference', label: C.reference, sortable: true,
            render: (p) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{p.reference || '—'}</span>,
        },
        { key: 'released_at', label: C.date, sortable: true, sortValue: (p) => p.released_at ?? '', render: (p) => <span className="muted">{fmtDate(p.released_at)}</span> },
        { key: 'entries_count', label: C.pEntries, align: 'right', sortable: true, sortValue: (p) => p.entries_count, render: (p) => <span>{p.entries_count.toLocaleString(loc)}</span> },
        { key: 'gross', label: C.gross, align: 'right', sortable: true, sortValue: (p) => p.gross, render: (p) => <span>{rm(p.gross)}</span> },
        { key: 'fee_total', label: C.commissionCol, align: 'right', sortable: true, sortValue: (p) => p.fee_total, render: (p) => <span className="muted">{rm(p.fee_total)}</span> },
        { key: 'adjustment', label: C.adjustment, align: 'right', sortable: true, sortValue: (p) => p.adjustment, render: (p) => <span className="muted">{rm(p.adjustment)}</span> },
        { key: 'net', label: C.pNet, align: 'right', sortable: true, sortValue: (p) => p.net, render: (p) => <strong>{rm(p.net)}</strong> },
        { key: 'method', label: C.method, render: (p) => <span>{p.method || '—'}</span> },
        { key: 'status', label: C.status, sortable: true, render: (p) => payoutBadge(p.status, C) },
        {
            key: 'receipt', label: C.receiptCol,
            render: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void receipt(p, false)}><Eye size={13} /> {C.viewReceipt}</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void receipt(p, true)}><Download size={13} /> {C.downloadReceipt}</button>
                </div>
            ),
        },
        {
            key: 'ack', label: C.proofCol,
            render: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {p.attachment_url && (
                        <a href={mediaUrl(p.attachment_url)} target="_blank" rel="noreferrer" style={{ color: 'var(--plum)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <Paperclip size={13} /> {C.viewProof}
                        </a>
                    )}
                    {p.acknowledged_at
                        ? <span className="badge badge-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={11} /> {C.acknowledged}</span>
                        : <button type="button" className="btn btn-ghost btn-sm" disabled={acking === p.id} onClick={() => void acknowledge(p.id)}>{acking === p.id ? '…' : C.acknowledge}</button>}
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

            <div className="stat-grid" style={{ marginBottom: 14 }}>
                <Stat n={rm(s.collected)} l={C.collected} sub={`${s.entries.toLocaleString(loc)} ${C.entriesWord}`} icon={Wallet} />
                <Stat n={rm(s.fees)} l={C.commission} icon={Percent} />
                <Stat n={rm(s.net)} l={C.net} icon={Coins} highlight />
                <Stat n={rm(s.released)} l={C.paidOut} icon={BadgeCheck} />
                <Stat n={rm(s.pending_release)} l={C.pendingPayout} icon={Hourglass} />
            </div>

            <p className="muted" style={{ margin: '0 0 22px', fontSize: 13, lineHeight: 1.55 }}>{C.commissionNote}</p>

            <div className="panel" style={{ marginBottom: 18 }}>
                <h3 style={{ marginTop: 0 }}>{C.collectionsTitle}</h3>
                <DataTable
                    columns={payCols}
                    rows={d.payments}
                    searchKeys={['reference', 'payer_name', 'payer_email', 'event']}
                    pageSize={12}
                    empty={C.noCollections}
                    exportName="kutipan-rsvp"
                />
            </div>

            <div className="panel">
                <h3 style={{ marginTop: 0 }}>{C.payoutsTitle}</h3>
                <DataTable
                    columns={payoutCols}
                    rows={d.payouts}
                    searchKeys={['reference', 'method']}
                    pageSize={10}
                    empty={<span className="muted">{C.noPayouts}</span>}
                    exportName="bayaran-keluar"
                />
            </div>
        </div>
    );
}

/** Collection status pill: paid green, failed red, pending neutral. */
function statusBadge(status: EntryPayment['status'], labels: { paid: string; pending: string; failed: string }): ReactNode {
    if (status === 'paid') return <span className="badge badge-ok">{labels.paid}</span>;
    if (status === 'failed') return <span className="badge badge-bad">{labels.failed}</span>;
    return <span className="badge">{labels.pending}</span>;
}

/** Payout status pill: the server sends a free-form string, so map the known
 *  settled/failed states and fall back to a neutral "pending" pill. */
function payoutBadge(status: string, labels: { received: string; pending: string; failed: string }): ReactNode {
    const st = status.toLowerCase();
    if (st === 'paid' || st === 'released' || st === 'completed' || st === 'done' || st === 'success') {
        return <span className="badge badge-ok">{labels.received}</span>;
    }
    if (st === 'failed' || st === 'rejected' || st === 'cancelled' || st === 'canceled') {
        return <span className="badge badge-bad">{labels.failed}</span>;
    }
    return <span className="badge">{labels.pending}</span>;
}

function Stat({ n, l, sub, icon: Icon, highlight }: {
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
const disabledIcon: React.CSSProperties = {
    width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--gold)',
};
