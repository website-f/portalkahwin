import { useEffect, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { api } from '../lib/api';
import { mediaUrl } from '../lib/base';
import { downloadFile } from '../lib/download';
import { useLang, dict } from '../context/LangContext';
import { Drawer } from './Drawer';
import { BrandLogo } from './BrandLogo';

/** Line item on a receipt. */
export interface ReceiptLineItem {
    name: string;
    amount: number;
}

/** Everything needed to render one receipt/invoice. */
export interface ReceiptData {
    /** Payment id — required to fetch the server-rendered PDF. */
    id?: string;
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
    /** Legacy fallback seller name; the real identity comes from GET /api/settings. */
    siteName?: string;
}

/** Editable business identity block, from GET /api/settings. */
interface ReceiptSettings {
    receipt_company_name?: string;
    receipt_description?: string;
    receipt_phone?: string;
    receipt_website?: string;
    receipt_email?: string;
}

/** Per-payment resolved seller identity, from GET /api/purchases/{id}/receipt-meta. */
interface ReceiptMeta {
    seller_role: string | null;
    agent_code?: string | null;
    company: string;
    description: string;
    logo: string | null;
    address: string;
    phone: string;
    website: string;
    email: string;
    tax: string;
    footer: string | null;
}

/**
 * Reusable receipt/invoice rendered in a Drawer.
 *
 * Downloading fetches a real PDF from the server rather than driving the browser
 * print dialog: the file is identical for everyone, carries no browser headers or
 * page furniture, and needs no PDF library in the bundle.
 */
export function Receipt({ open, onClose, data, siteName }: Props) {
    const [downloading, setDownloading] = useState(false);
    const [dlError, setDlError] = useState<string | null>(null);
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Resit', receiptWord: 'RESIT / RECEIPT',
            tagline: 'Terima kasih atas pembelian anda.',
            billedTo: 'Dibilkan kepada', item: 'Perihal', amount: 'Jumlah',
            subtotal: 'Subjumlah', discount: 'Diskaun', total: 'Jumlah Keseluruhan',
            paid: 'Dibayar', pending: 'Menunggu', failed: 'Gagal',
            madeBy: 'Dibuat oleh', close: 'Tutup', download: 'Muat Turun PDF', downloading: 'Menyediakan…', downloadFailed: 'Resit tidak dapat dimuat turun. Sila cuba lagi.',
        },
        en: {
            title: 'Receipt', receiptWord: 'RESIT / RECEIPT',
            tagline: 'Thank you for your purchase.',
            billedTo: 'Billed to', item: 'Description', amount: 'Amount',
            subtotal: 'Subtotal', discount: 'Discount', total: 'Total',
            paid: 'Paid', pending: 'Pending', failed: 'Failed',
            madeBy: 'Made by', close: 'Close', download: 'Download PDF', downloading: 'Preparing…', downloadFailed: 'Could not download the receipt. Please try again.',
        },
        zh: {
            title: '收据', receiptWord: '收据 / RECEIPT',
            tagline: '感谢您的购买。',
            billedTo: '付款人', item: '项目说明', amount: '金额',
            subtotal: '小计', discount: '折扣', total: '合计',
            paid: '已付款', pending: '处理中', failed: '失败',
            madeBy: '技术支持', close: '关闭', download: '下载 PDF', downloading: '准备中…', downloadFailed: '收据下载失败，请重试。',
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : 'en-MY';

    // Whose identity this receipt carries — resolved per payment (platform vs the
    // vendor/affiliate it's attributed to). Falls back to platform settings when
    // there is no payment id to resolve against.
    const [meta, setMeta] = useState<ReceiptMeta | null>(null);
    const [biz, setBiz] = useState<ReceiptSettings | null>(null);
    useEffect(() => {
        if (!open) return;
        setMeta(null);
        if (data?.id) {
            api.get<ReceiptMeta>(`/purchases/${data.id}/receipt-meta`).then((r) => setMeta(r.data)).catch(() => setMeta(null));
        } else if (!biz) {
            api.get<ReceiptSettings>('/settings').then((r) => setBiz(r.data)).catch(() => setBiz({}));
        }
    }, [open, data?.id, biz]);

    const company = meta?.company ?? biz?.receipt_company_name ?? siteName ?? 'TiraTech Marketing Sdn. Bhd. (1684387-U)';
    const description = meta?.description ?? biz?.receipt_description ?? 'Kad Kahwin Digital / Digital Invitation Card';
    const phone = meta?.phone ?? biz?.receipt_phone ?? '';
    const website = meta?.website ?? biz?.receipt_website ?? '';
    const email = meta?.email ?? biz?.receipt_email ?? '';
    const address = meta?.address ?? '';
    const tax = meta?.tax ?? '';
    const sellerLogo = meta?.logo ?? null;
    const disclaimer = meta?.footer ?? null;
    const websiteHref = website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : '';

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

    async function download() {
        if (!data?.id) return;
        setDownloading(true);
        setDlError(null);
        try {
            await downloadFile(`/purchases/${data.id}/receipt`, `resit-${data.reference ?? data.id}.pdf`);
        } catch {
            setDlError(C.downloadFailed);
        } finally {
            setDownloading(false);
        }
    }

    const footer = data ? (
        <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{C.close}</button>
            <button type="button" className="btn btn-primary" onClick={() => void download()} disabled={downloading}>
                <Download size={16} /> {downloading ? C.downloading : C.download}
            </button>
        </>
    ) : undefined;

    return (
        <Drawer open={open} onClose={onClose} title={C.title} width={560} footer={footer}>
            {data && (
                <>
                    {/* Print scope: hide everything except the receipt, then lay it flat on the page. */}
                    <style>{PRINT_CSS}</style>

                    {dlError && <p className="form-err" style={{ marginBottom: 12 }}>{dlError}</p>}
                    <div className="pk-receipt" style={receiptCard}>
                        {/* Brand ribbon */}
                        <div style={ribbon} />

                        <div style={{ padding: '24px 26px 26px' }}>
                            {/* Header: brand + receipt meta */}
                            <div className="spread" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ minWidth: 0 }}>
                                    {sellerLogo
                                        ? <img src={mediaUrl(sellerLogo)} alt={company} style={{ height: 30, marginBottom: 8, objectFit: 'contain', maxWidth: 180 }} />
                                        : <BrandLogo height={28} style={{ marginBottom: 8 }} />}
                                    {meta?.agent_code && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--plum)' }}>Affiliate Agent: {meta.agent_code}</div>}
                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{company}</div>
                                    {description && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{description}</div>}
                                    {address && <div className="muted" style={{ fontSize: 12, marginTop: 2, whiteSpace: 'pre-line' }}>{address}</div>}
                                    {tax && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Tax / SST: {tax}</div>}
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

                            {/* Footer — business contact line */}
                            <div style={madeBy}>
                                <span className="row" style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                                    {phone && <span>{phone}</span>}
                                    {phone && website && <span style={{ opacity: 0.4 }}>·</span>}
                                    {website && (
                                        <a href={websiteHref} target="_blank" rel="noreferrer" style={{ color: 'var(--plum)', textDecoration: 'none', fontWeight: 600 }}>{website}</a>
                                    )}
                                    {website && email && <span style={{ opacity: 0.4 }}>·</span>}
                                    {email && (
                                        <a href={`mailto:${email}`} style={{ color: 'var(--plum)', textDecoration: 'none', fontWeight: 600 }}>{email}</a>
                                    )}
                                </span>
                                {disclaimer && (
                                    <div style={{ marginTop: 12, fontSize: 11, lineHeight: 1.5, color: 'var(--muted)' }}>{disclaimer}</div>
                                )}
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
