import { useEffect, useState, type ReactNode } from 'react';
import { Printer, Heart } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../context/LangContext';
import { Drawer } from './Drawer';

/** Line item on a receipt. */
export interface ReceiptLineItem {
    name: string;
    amount: number;
}

/** Everything needed to render one receipt/invoice. */
export interface ReceiptData {
    reference: string;
    date: string | null;
    status: string;
    buyerName: string;
    buyerEmail: string;
    items: ReceiptLineItem[];
    subtotal: number;
    discount?: number;
    total: number;
    currency: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    data: ReceiptData | null;
    /** Seller / site name. If omitted, it is fetched once from GET /api/settings. */
    siteName?: string;
}

/**
 * Reusable receipt/invoice rendered in a Drawer. Includes a Print / Download
 * button that scopes window.print() to the receipt via an injected print-only
 * stylesheet, so "Save as PDF" produces a clean one-page keepsake document.
 */
export function Receipt({ open, onClose, data, siteName }: Props) {
    const { lang } = useLang();
    const C = ({
        bm: {
            title: 'Resit', receiptWord: 'RESIT / RECEIPT',
            tagline: 'Terima kasih atas pembelian anda.',
            billedTo: 'Dibilkan kepada', item: 'Perihal', amount: 'Jumlah',
            subtotal: 'Subjumlah', discount: 'Diskaun', total: 'Jumlah Keseluruhan',
            paid: 'Dibayar', pending: 'Menunggu', failed: 'Gagal',
            madeBy: 'Dibuat oleh', close: 'Tutup', print: 'Cetak / Muat Turun',
        },
        en: {
            title: 'Receipt', receiptWord: 'RESIT / RECEIPT',
            tagline: 'Thank you for your purchase.',
            billedTo: 'Billed to', item: 'Description', amount: 'Amount',
            subtotal: 'Subtotal', discount: 'Discount', total: 'Total',
            paid: 'Paid', pending: 'Pending', failed: 'Failed',
            madeBy: 'Made by', close: 'Close', print: 'Print / Download',
        },
    })[lang];

    const loc = lang === 'bm' ? 'ms-MY' : 'en-MY';

    const [fetchedName, setFetchedName] = useState('');
    useEffect(() => {
        if (siteName || !open || fetchedName) return;
        api.get<{ site_name?: string }>('/settings')
            .then((r) => setFetchedName(r.data.site_name || 'PortalKahwin'))
            .catch(() => setFetchedName('PortalKahwin'));
    }, [open, siteName, fetchedName]);
    const brand = siteName || fetchedName || 'PortalKahwin';

    const money = (n: number) =>
        `${data?.currency ?? 'RM'} ${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (iso: string | null) => {
        if (!iso) return '—';
        const dt = new Date(iso);
        return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(loc, { day: '2-digit', month: 'long', year: 'numeric' });
    };
    const statusBadge = (status: string): ReactNode => {
        if (status === 'paid') return <span className="badge badge-ok">{C.paid}</span>;
        if (status === 'failed') return <span className="badge badge-bad">{C.failed}</span>;
        return <span className="badge badge-gold">{C.pending}</span>;
    };

    const footer = data ? (
        <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{C.close}</button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> {C.print}
            </button>
        </>
    ) : undefined;

    return (
        <Drawer open={open} onClose={onClose} title={C.title} width={560} footer={footer}>
            {data && (
                <>
                    {/* Print scope: hide everything except the receipt, then lay it flat on the page. */}
                    <style>{PRINT_CSS}</style>

                    <div className="pk-receipt" style={receiptCard}>
                        {/* Brand ribbon */}
                        <div style={ribbon} />

                        <div style={{ padding: '24px 26px 26px' }}>
                            {/* Header: brand + receipt meta */}
                            <div className="spread" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={brandName}>{brand}</div>
                                    <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{C.tagline}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={receiptLabel}>{C.receiptWord}</div>
                                    <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 13, marginTop: 6, color: 'var(--ink)' }}>
                                        {data.reference || '—'}
                                    </div>
                                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{fmtDate(data.date)}</div>
                                    <div style={{ marginTop: 8 }}>{statusBadge(data.status)}</div>
                                </div>
                            </div>

                            <hr style={rule} />

                            {/* Billed to */}
                            <div style={{ marginBottom: 18 }}>
                                <div style={sectionLabel}>{C.billedTo}</div>
                                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{data.buyerName || '—'}</div>
                                {data.buyerEmail && (
                                    <div className="muted" style={{ fontSize: 13, marginTop: 1 }}>{data.buyerEmail}</div>
                                )}
                            </div>

                            {/* Line items */}
                            <table style={itemsTable}>
                                <thead>
                                    <tr>
                                        <th style={{ ...thCell, textAlign: 'left' }}>{C.item}</th>
                                        <th style={{ ...thCell, textAlign: 'right' }}>{C.amount}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((it, i) => (
                                        <tr key={i}>
                                            <td style={{ ...tdCell, textAlign: 'left' }}>{it.name}</td>
                                            <td style={{ ...tdCell, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(it.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 260 }}>
                                <div className="spread" style={totalRow}>
                                    <span className="muted">{C.subtotal}</span>
                                    <span>{money(data.subtotal)}</span>
                                </div>
                                {typeof data.discount === 'number' && data.discount > 0 && (
                                    <div className="spread" style={totalRow}>
                                        <span className="muted">{C.discount}</span>
                                        <span style={{ color: 'var(--ok)' }}>-{money(data.discount)}</span>
                                    </div>
                                )}
                                <div className="spread" style={grandTotalRow}>
                                    <span style={{ fontWeight: 700 }}>{C.total}</span>
                                    <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--plum)' }}>{money(data.total)}</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={madeBy}>
                                <Heart size={12} style={{ color: 'var(--gold)', verticalAlign: -1 }} /> {C.madeBy} {brand}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Drawer>
    );
}

/** Scoped print styles — clean, single-page "Save as PDF". */
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
const brandName: React.CSSProperties = {
    fontSize: 24, fontWeight: 800, color: 'var(--plum)', letterSpacing: -0.3, lineHeight: 1.1,
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
    width: '100%', borderCollapse: 'collapse', fontSize: 14,
};
const thCell: React.CSSProperties = {
    padding: '8px 0', fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    color: 'var(--muted)', borderBottom: '1px solid var(--line)',
};
const tdCell: React.CSSProperties = {
    padding: '11px 0', borderBottom: '1px solid var(--line)', verticalAlign: 'top',
};
const totalRow: React.CSSProperties = {
    fontSize: 14, padding: '5px 0',
};
const grandTotalRow: React.CSSProperties = {
    fontSize: 14, padding: '10px 0 0', marginTop: 6, borderTop: '2px solid var(--line)',
};
const madeBy: React.CSSProperties = {
    textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 24,
    paddingTop: 16, borderTop: '1px dashed var(--line)',
};
