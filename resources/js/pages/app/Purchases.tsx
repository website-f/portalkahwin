import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ReceiptText, ShoppingBag, RefreshCw, MessageCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { Receipt, type ReceiptData } from '../../components/Receipt';
import { useLang, dict } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { waLink } from '../../lib/whatsapp';

interface PurchaseLineItem { name: string; amount: number }
interface Purchase {
    id: string;
    reference: string;
    purpose: 'subscription' | 'template';
    item: string;
    amount: number;
    status: 'pending' | 'paid' | 'failed';
    date: string | null;
    created_at: string;
    items: PurchaseLineItem[];
}

export function Purchases() {
    const { lang } = useLang();
    const { user } = useAuth();
    const C = dict({
        bm: {
            title: 'Sejarah Pembelian', subtitle: 'Semua transaksi dan resit pembelian anda.',
            date: 'Tarikh', reference: 'Rujukan', item: 'Item', amount: 'Jumlah (RM)', status: 'Status',
            receipt: 'Resit',
            paid: 'Dibayar', pending: 'Menunggu', failed: 'Gagal',
            reverify: 'Semak status', waHelp: 'WhatsApp', cancelRebuy: 'Batal & beli semula',
            waMsg: 'Salam, tolong semak status pembayaran untuk pesanan',
            cancelConfirm: 'Batalkan pesanan tertunggak ini? Kami akan sahkan sekali lagi dengan gerbang pembayaran — jika belum dibayar, ia dibatalkan supaya anda boleh membeli semula.',
            subscriptionItem: 'Langganan Premium',
            emptyTitle: 'Belum ada pembelian', emptySub: 'Pembelian rekaan dan langganan anda akan dipaparkan di sini.',
            browse: 'Lihat Rekaan',
        },
        en: {
            title: 'Purchase history', subtitle: 'All your transactions and purchase receipts.',
            date: 'Date', reference: 'Reference', item: 'Item', amount: 'Amount (RM)', status: 'Status',
            receipt: 'Receipt',
            paid: 'Paid', pending: 'Pending', failed: 'Failed',
            reverify: 'Check status', waHelp: 'WhatsApp', cancelRebuy: 'Cancel & re-buy',
            waMsg: 'Hi, please check the payment status for my order',
            cancelConfirm: 'Cancel this pending order? We’ll re-check with the payment gateway first — if it isn’t paid, it’s cancelled so you can buy again.',
            subscriptionItem: 'Premium subscription',
            emptyTitle: 'No purchases yet', emptySub: 'Your template purchases and subscriptions will appear here.',
            browse: 'Browse templates',
        },
        zh: {
            title: '购买记录', subtitle: '您的全部交易与购买凭证。',
            date: '日期', reference: '交易编号', item: '项目', amount: '金额（RM）', status: '状态',
            receipt: '收据',
            paid: '已付款', pending: '处理中', failed: '失败',
            reverify: '检查状态', waHelp: 'WhatsApp', cancelRebuy: '取消并重新购买',
            waMsg: '您好，请帮忙查看我的订单付款状态',
            cancelConfirm: '取消此待处理订单？我们会先向支付网关重新确认——若未付款，则将其取消，以便您重新购买。',
            subscriptionItem: '付费订阅',
            emptyTitle: '暂无购买记录', emptySub: '您购买的设计与订阅将显示在这里。',
            browse: '浏览设计',
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : 'en-MY';
    const rm = (n: number) => `RM ${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (iso: string | null) => {
        if (!iso) return '—';
        const dt = new Date(iso);
        return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(loc, { day: '2-digit', month: 'long', year: 'numeric' });
    };
    const itemLabel = (p: Purchase) => (p.purpose === 'subscription' ? C.subscriptionItem : p.item);

    const { confirm } = useDialog();
    const [rows, setRows] = useState<Purchase[] | null>(null);
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [waPhone, setWaPhone] = useState<string>('');
    const reload = () => api.get<Purchase[]>('/me/purchases').then((r) => setRows(r.data)).catch(() => setRows([]));
    useEffect(() => { void reload(); }, []);
    useEffect(() => {
        api.get<{ support_whatsapp?: string; receipt_phone?: string }>('/settings')
            .then((r) => setWaPhone(r.data?.support_whatsapp || r.data?.receipt_phone || ''))
            .catch(() => { /* WhatsApp button just hides */ });
    }, []);

    // Re-check a pending purchase with the payment gateway (may flip it to paid/failed).
    async function reverify(p: Purchase) {
        setBusyId(p.id);
        try { await api.post('/billing/verify', { reference: p.reference }); await reload(); }
        finally { setBusyId(null); }
    }
    // Clear a genuinely-stuck pending order so the host can buy again (re-verifies first).
    async function cancelRebuy(p: Purchase) {
        if (!(await confirm(C.cancelConfirm))) return;
        setBusyId(p.id);
        try { await api.post(`/purchases/${p.id}/cancel`); await reload(); }
        finally { setBusyId(null); }
    }

    function openReceipt(p: Purchase) {
        const items: PurchaseLineItem[] = p.purpose === 'subscription'
            ? [{ name: C.subscriptionItem, amount: p.amount }]
            : (p.items.length ? p.items : [{ name: p.item, amount: p.amount }]);
        const subtotal = items.reduce((s, it) => s + it.amount, 0);
        setReceipt({
            id: p.id,
            reference: p.reference,
            date: p.date ?? p.created_at,
            status: p.status,
            buyerName: user?.name ?? '',
            buyerEmail: user?.email ?? '',
            items,
            subtotal,
            total: p.amount,
            currency: 'RM',
        });
    }

    const statusBadge = (status: string): ReactNode => {
        if (status === 'paid') return <span className="badge badge-ok">{C.paid}</span>;
        if (status === 'failed') return <span className="badge badge-bad">{C.failed}</span>;
        return <span className="badge badge-gold">{C.pending}</span>;
    };

    if (!rows) return <div className="loading-screen"><div className="spinner" /></div>;

    const cols: Column<Purchase>[] = [
        {
            key: 'date', label: C.date, sortable: true,
            sortValue: (p) => p.date ?? p.created_at,
            render: (p) => <span className="muted">{fmtDate(p.date ?? p.created_at)}</span>,
        },
        {
            key: 'reference', label: C.reference, sortable: true,
            render: (p) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{p.reference || '—'}</span>,
        },
        { key: 'item', label: C.item, render: (p) => <span>{itemLabel(p)}</span> },
        {
            key: 'amount', label: C.amount, align: 'right', sortable: true, sortValue: (p) => p.amount,
            render: (p) => <strong>{rm(p.amount)}</strong>,
        },
        { key: 'status', label: C.status, sortable: true, render: (p) => statusBadge(p.status) },
        {
            key: '_receipt', label: '', align: 'right',
            render: (p) => (
                <span className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {p.status === 'pending' && (
                        <>
                            <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === p.id} onClick={(e) => { e.stopPropagation(); void reverify(p); }}>
                                <RefreshCw size={14} /> {C.reverify}
                            </button>
                            {waPhone && (
                                <a
                                    className="btn btn-ghost btn-sm"
                                    href={waLink(waPhone, `${C.waMsg} ${p.reference}`.trim())}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MessageCircle size={14} /> {C.waHelp}
                                </a>
                            )}
                            <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} disabled={busyId === p.id} onClick={(e) => { e.stopPropagation(); void cancelRebuy(p); }}>
                                <XCircle size={14} /> {C.cancelRebuy}
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); openReceipt(p); }}
                    >
                        <ReceiptText size={15} /> {C.receipt}
                    </button>
                </span>
            ),
        },
    ];

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {rows.length === 0 ? (
                <div className="panel center" style={{ padding: '48px 24px' }}>
                    <div style={emptyIcon}><ShoppingBag size={26} /></div>
                    <h3 style={{ margin: '16px 0 6px' }}>{C.emptyTitle}</h3>
                    <p className="muted" style={{ margin: '0 auto 20px', maxWidth: 380, fontSize: 14 }}>{C.emptySub}</p>
                    <Link to="/panel/templates" className="btn btn-primary">{C.browse}</Link>
                </div>
            ) : (
                <div className="panel">
                    <DataTable
                        columns={cols}
                        rows={rows}
                        searchKeys={['reference', 'item']}
                        pageSize={10}
                        exportName="pembelian"
                    />
                </div>
            )}

            <Receipt open={receipt !== null} onClose={() => setReceipt(null)} data={receipt} />
        </div>
    );
}

const emptyIcon: React.CSSProperties = {
    width: 60, height: 60, borderRadius: 16, margin: '0 auto',
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
