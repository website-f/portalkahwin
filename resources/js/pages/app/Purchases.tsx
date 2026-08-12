import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ReceiptText, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { Receipt, type ReceiptData } from '../../components/Receipt';
import { useLang, dict } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';

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
            subscriptionItem: 'Langganan Premium',
            emptyTitle: 'Belum ada pembelian', emptySub: 'Pembelian rekaan dan langganan anda akan dipaparkan di sini.',
            browse: 'Lihat Rekaan',
        },
        en: {
            title: 'Purchase history', subtitle: 'All your transactions and purchase receipts.',
            date: 'Date', reference: 'Reference', item: 'Item', amount: 'Amount (RM)', status: 'Status',
            receipt: 'Receipt',
            paid: 'Paid', pending: 'Pending', failed: 'Failed',
            subscriptionItem: 'Premium subscription',
            emptyTitle: 'No purchases yet', emptySub: 'Your template purchases and subscriptions will appear here.',
            browse: 'Browse templates',
        },
        zh: {
            title: '购买记录', subtitle: '您的全部交易与购买凭证。',
            date: '日期', reference: '交易编号', item: '项目', amount: '金额（RM）', status: '状态',
            receipt: '收据',
            paid: '已付款', pending: '处理中', failed: '失败',
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
        return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const itemLabel = (p: Purchase) => (p.purpose === 'subscription' ? C.subscriptionItem : p.item);

    const [rows, setRows] = useState<Purchase[] | null>(null);
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    useEffect(() => {
        api.get<Purchase[]>('/me/purchases').then((r) => setRows(r.data)).catch(() => setRows([]));
    }, []);

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
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); openReceipt(p); }}
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
