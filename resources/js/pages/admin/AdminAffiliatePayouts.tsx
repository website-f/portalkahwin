import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, Wallet, Coins, HandCoins, Users, ShoppingCart, Send, Eye, Download, FileText, Upload, AlertTriangle, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { Drawer } from '../../components/Drawer';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

interface Bank { name: string; account_name: string; account_no: string }
interface AffiliateInfo {
    id: number; name: string; company_name: string | null; email: string; phone: string | null;
    referral_code: string | null; bank: Bank; bank_filled: boolean;
    referred_users: number; sales_count: number; templates_sold: number; revenue: number;
    commission_percent: number; commission: number; commission_owed: number; commission_paid: number;
}
interface Txn {
    id: string; reference: string; date: string | null; buyer: string;
    items: string[]; amount: number; commission: number; paid_out: boolean;
}
interface Payout {
    id: string; reference: string; released_at: string | null;
    gross: number | string; rate_percent: number | string; amount: number | string;
    payments_count: number; method: string | null; note: string | null;
    bank_snapshot: string | null; attachment: string | null; status: string;
}
interface PayoutBook { affiliate: AffiliateInfo; transactions: Txn[]; payouts: Payout[] }
type ApiError = { response?: { status?: number; data?: { message?: string } } };

export function AdminAffiliatePayouts() {
    const { affiliateId } = useParams<{ affiliateId: string }>();
    const { lang } = useLang();
    const dialog = useDialog();
    const C = dict({
        bm: {
            back: 'Kembali ke Affiliate', eyebrow: 'Buku Komisen Affiliate',
            moneyModel: 'Pelanggan dirujuk membeli rekaan → afiliat memperoleh komisen (kadar × jualan).',
            code: 'Kod rujukan',
            sReferred: 'Pengguna Dirujuk', sSales: 'Jualan', sRevenue: 'Jumlah Hasil',
            sOwed: 'Komisen Belum Bayar', sPaid: 'Komisen Dibayar', rate: 'Kadar komisen',
            releaseBtn: 'Lepaskan Komisen', releasing: 'Melepaskan…',
            bankTitle: 'Butiran Bank', bankNone: 'Afiliat belum mengisi butiran bank untuk payout.',
            txTitle: 'Semua Transaksi', txSub: 'Setiap jualan yang dikaitkan dengan afiliat ini — resit memaparkan kod mereka.',
            txDate: 'Tarikh', txRef: 'Rujukan', txBuyer: 'Pembeli', txItems: 'Rekaan', txAmount: 'Jumlah', txComm: 'Komisen', txReceipt: 'Resit', txStatus: 'Status',
            paidOut: 'Dibayar', notPaid: 'Belum', emptyTx: 'Belum ada transaksi.',
            view: 'Lihat', download: 'Muat turun',
            payoutsTitle: 'Pelepasan Komisen', payoutsSub: 'Setiap pelepasan yang direkodkan, dengan bukti pembayaran.',
            pRef: 'Rujukan', pDate: 'Tarikh', pGross: 'Jualan', pRate: 'Kadar', pAmount: 'Komisen', pProof: 'Bukti', pReceipt: 'Resit', pStatus: 'Status',
            released: 'Dilepaskan', void: 'Dibatalkan', emptyPayouts: 'Belum ada pelepasan.',
            // Release drawer
            relTitle: 'Lepaskan Komisen', relOwed: 'Komisen belum bayar',
            relMethod: 'Kaedah bayaran', relMethodPh: 'cth. Pindahan bank (DuitNow)',
            relNote: 'Nota (pilihan)', relProof: 'Bukti pembayaran', relProofHint: 'WAJIB — muat naik gambar atau PDF resit pindahan (maks 4MB).',
            chooseFile: 'Pilih fail…', relConfirm: 'Lepaskan', cancel: 'Batal',
            relNoBank: 'Afiliat belum mengisi butiran bank. Anda masih boleh melepaskan, tetapi sahkan akaun bank mereka dahulu.',
            relDone: (a: string) => `${a} komisen telah dilepaskan dan direkodkan.`,
            relFail: 'Gagal melepaskan komisen.', proofRequired: 'Sila lampirkan bukti pembayaran dahulu.',
            nothingOwed: 'Tiada komisen belum dibayar untuk afiliat ini.',
        },
        en: {
            back: 'Back to Affiliates', eyebrow: 'Affiliate commission book',
            moneyModel: 'Referred customers buy designs → the affiliate earns commission (rate × sales).',
            code: 'Referral code',
            sReferred: 'Referred Users', sSales: 'Sales', sRevenue: 'Revenue',
            sOwed: 'Commission Owed', sPaid: 'Commission Paid', rate: 'Commission rate',
            releaseBtn: 'Release Commission', releasing: 'Releasing…',
            bankTitle: 'Bank details', bankNone: 'The affiliate has not filled in bank details for payout yet.',
            txTitle: 'All transactions', txSub: 'Every sale attributed to this affiliate — receipts carry their code.',
            txDate: 'Date', txRef: 'Reference', txBuyer: 'Buyer', txItems: 'Designs', txAmount: 'Amount', txComm: 'Commission', txReceipt: 'Receipt', txStatus: 'Status',
            paidOut: 'Paid out', notPaid: 'Unpaid', emptyTx: 'No transactions yet.',
            view: 'View', download: 'Download',
            payoutsTitle: 'Commission payouts', payoutsSub: 'Every recorded release, with its proof of payment.',
            pRef: 'Reference', pDate: 'Date', pGross: 'Sales', pRate: 'Rate', pAmount: 'Commission', pProof: 'Proof', pReceipt: 'Receipt', pStatus: 'Status',
            released: 'Released', void: 'Voided', emptyPayouts: 'No payouts yet.',
            relTitle: 'Release commission', relOwed: 'Commission owed',
            relMethod: 'Payment method', relMethodPh: 'e.g. Bank transfer (DuitNow)',
            relNote: 'Note (optional)', relProof: 'Proof of payment', relProofHint: 'REQUIRED — upload an image or PDF of the transfer receipt (max 4MB).',
            chooseFile: 'Choose file…', relConfirm: 'Release', cancel: 'Cancel',
            relNoBank: "The affiliate hasn't filled in bank details. You can still release, but confirm their bank account first.",
            relDone: (a: string) => `${a} commission released and recorded.`,
            relFail: 'Could not release commission.', proofRequired: 'Please attach the proof of payment first.',
            nothingOwed: 'No unpaid commission for this affiliate.',
        },
        zh: {
            back: '返回联盟', eyebrow: '联盟佣金账簿',
            moneyModel: '被推荐客户购买设计 → 联盟伙伴赚取佣金（费率 × 销售额）。',
            code: '推荐码',
            sReferred: '推荐用户', sSales: '销售', sRevenue: '总收入',
            sOwed: '待付佣金', sPaid: '已付佣金', rate: '佣金费率',
            releaseBtn: '发放佣金', releasing: '发放中…',
            bankTitle: '银行信息', bankNone: '该联盟伙伴尚未填写收款银行信息。',
            txTitle: '全部交易', txSub: '归属于该联盟伙伴的每笔销售 — 收据均含其推荐码。',
            txDate: '日期', txRef: '编号', txBuyer: '买家', txItems: '设计', txAmount: '金额', txComm: '佣金', txReceipt: '收据', txStatus: '状态',
            paidOut: '已发放', notPaid: '未发放', emptyTx: '暂无交易。',
            view: '查看', download: '下载',
            payoutsTitle: '佣金发放', payoutsSub: '每笔发放记录及其付款凭证。',
            pRef: '编号', pDate: '日期', pGross: '销售额', pRate: '费率', pAmount: '佣金', pProof: '凭证', pReceipt: '收据', pStatus: '状态',
            released: '已发放', void: '已作废', emptyPayouts: '暂无发放记录。',
            relTitle: '发放佣金', relOwed: '待付佣金',
            relMethod: '付款方式', relMethodPh: '例如：银行转账（DuitNow）',
            relNote: '备注（可选）', relProof: '付款凭证', relProofHint: '必填 — 上传转账凭证图片或 PDF（最大 4MB）。',
            chooseFile: '选择文件…', relConfirm: '发放', cancel: '取消',
            relNoBank: '该联盟伙伴尚未填写银行信息。仍可发放，但请先确认其银行账户。',
            relDone: (a: string) => `已发放并记录 ${a} 佣金。`,
            relFail: '发放佣金失败。', proofRequired: '请先附上付款凭证。',
            nothingOwed: '该联盟伙伴没有待付佣金。',
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : lang === 'zh' ? 'zh-CN' : 'en-MY';
    const rm = (n: number) => `RM ${Number(n).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const num = (n: number) => Number(n).toLocaleString(loc);
    const fmtDate = (iso: string | null) => {
        if (!iso) return '—';
        const dt = new Date(iso);
        return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(loc, { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const [data, setData] = useState<PayoutBook | null>(null);
    const [relOpen, setRelOpen] = useState(false);
    const [method, setMethod] = useState('');
    const [note, setNote] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [releasing, setReleasing] = useState(false);
    const [relErr, setRelErr] = useState<string | null>(null);

    const load = useCallback(async () => {
        const r = await api.get<PayoutBook>(`/admin/affiliates/${affiliateId}`);
        setData(r.data);
    }, [affiliateId]);
    useEffect(() => { void load(); }, [load]);

    // Authenticated blob open/download (receipts + proof need the bearer token).
    async function blob(urlPath: string, filename: string, download: boolean) {
        try {
            const r = await api.get(urlPath, { responseType: 'blob' });
            const url = URL.createObjectURL(r.data as Blob);
            if (download) {
                const a = document.createElement('a');
                a.href = url; a.download = filename;
                document.body.appendChild(a); a.click(); a.remove();
            } else {
                window.open(url, '_blank');
            }
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch { /* unavailable */ }
    }

    function openRelease() {
        setMethod(''); setNote(''); setFile(null); setRelErr(null); setRelOpen(true);
    }

    async function release() {
        if (!data) return;
        if (!file) { setRelErr(C.proofRequired); return; }
        setReleasing(true); setRelErr(null);
        try {
            const fd = new FormData();
            if (method.trim()) fd.append('method', method.trim());
            if (note.trim()) fd.append('note', note.trim());
            fd.append('attachment', file);
            await api.post(`/admin/affiliates/${data.affiliate.id}/payout`, fd);
            setRelOpen(false);
            await load();
            await dialog.alert({ title: C.relTitle, message: C.relDone(data.affiliate.name) });
        } catch (err: unknown) {
            const e = err as ApiError;
            setRelErr(e?.response?.data?.message ?? C.relFail);
        } finally {
            setReleasing(false);
        }
    }

    if (!data) return <div className="loading-screen"><div className="spinner" /></div>;
    const a = data.affiliate;
    const contact = [a.email, a.phone].filter(Boolean).join(' · ');
    const owed = a.commission_owed ?? 0;

    const txCols: Column<Txn>[] = [
        { key: 'date', label: C.txDate, sortable: true, sortValue: (t) => t.date ?? '', render: (t) => <span className="muted">{fmtDate(t.date)}</span> },
        { key: 'reference', label: C.txRef, sortable: true, render: (t) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{t.reference || '—'}</span> },
        { key: 'buyer', label: C.txBuyer, sortable: true, sortValue: (t) => t.buyer.toLowerCase(), render: (t) => <strong>{t.buyer}</strong> },
        { key: 'items', label: C.txItems, render: (t) => <span>{t.items.join(', ')}</span> },
        { key: 'amount', label: C.txAmount, align: 'right', sortable: true, sortValue: (t) => t.amount, render: (t) => rm(t.amount) },
        { key: 'commission', label: C.txComm, align: 'right', sortable: true, sortValue: (t) => t.commission, render: (t) => <strong style={{ color: 'var(--gold)' }}>{rm(t.commission)}</strong> },
        { key: 'paid_out', label: C.txStatus, align: 'center', sortable: true, sortValue: (t) => (t.paid_out ? 1 : 0), render: (t) => (t.paid_out ? <span className="badge badge-ok">{C.paidOut}</span> : <span className="badge">{C.notPaid}</span>) },
        {
            key: '_receipt', label: C.txReceipt, align: 'right',
            render: (t) => (
                <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); void blob(`/admin/affiliates/${a.id}/transactions/${t.id}/receipt-pdf`, `resit-${t.reference}.pdf`, false); }}><Eye size={13} /></button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); void blob(`/admin/affiliates/${a.id}/transactions/${t.id}/receipt-pdf`, `resit-${t.reference}.pdf`, true); }}><Download size={13} /></button>
                </div>
            ),
        },
    ];

    const isVoid = (s: string) => ['void', 'voided', 'cancelled', 'canceled'].includes(s.toLowerCase());
    const payoutCols: Column<Payout>[] = [
        { key: 'reference', label: C.pRef, sortable: true, render: (p) => <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{p.reference}</span> },
        { key: 'released_at', label: C.pDate, sortable: true, sortValue: (p) => p.released_at ?? '', render: (p) => <span className="muted">{fmtDate(p.released_at)}</span> },
        { key: 'gross', label: C.pGross, align: 'right', sortable: true, sortValue: (p) => Number(p.gross), render: (p) => rm(Number(p.gross)) },
        { key: 'rate_percent', label: C.pRate, align: 'right', render: (p) => `${Number(p.rate_percent)}%` },
        { key: 'amount', label: C.pAmount, align: 'right', sortable: true, sortValue: (p) => Number(p.amount), render: (p) => <strong style={{ color: 'var(--gold)' }}>{rm(Number(p.amount))}</strong> },
        {
            key: '_proof', label: C.pProof, align: 'center',
            render: (p) => (p.attachment
                ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void blob(`/admin/affiliate-payouts/${p.id}/attachment`, `bukti-${p.reference}`, false)}><FileText size={13} /> {C.view}</button>
                : <span className="muted">—</span>),
        },
        {
            key: '_receipt', label: C.pReceipt, align: 'right',
            render: (p) => (
                <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void blob(`/admin/affiliate-payouts/${p.id}/receipt-pdf`, `resit-komisen-${p.reference}.pdf`, false)}><Eye size={13} /></button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void blob(`/admin/affiliate-payouts/${p.id}/receipt-pdf`, `resit-komisen-${p.reference}.pdf`, true)}><Download size={13} /></button>
                </div>
            ),
        },
        { key: 'status', label: C.pStatus, sortable: true, render: (p) => (isVoid(p.status) ? <span className="badge badge-bad">{C.void}</span> : <span className="badge badge-ok">{C.released}</span>) },
    ];

    return (
        <div>
            <Link to="/admin/affiliates" className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
                <ArrowLeft size={15} /> {C.back}
            </Link>

            <div className="page-head">
                <div className="spread" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={eyebrowStyle}>{C.eyebrow}</div>
                        <h1 style={{ margin: '2px 0 0' }}>{a.company_name || a.name}</h1>
                        {contact && <p className="muted" style={{ margin: '4px 0 0' }}>{contact}</p>}
                        {a.referral_code && <p className="row" style={{ gap: 7, margin: '6px 0 0', fontSize: 13 }}>{C.code}: <code style={codeStyle}>{a.referral_code}</code></p>}
                    </div>
                    <button type="button" className="btn btn-primary" disabled={owed <= 0 || releasing} onClick={openRelease}>
                        <Send size={15} /> {C.releaseBtn}
                    </button>
                </div>
            </div>

            {/* Summary roll-up */}
            <div className="stat-grid" style={{ marginBottom: 12 }}>
                <Stat n={num(a.referred_users)} l={C.sReferred} icon={Users} tone="plum" />
                <Stat n={num(a.sales_count)} l={C.sSales} icon={ShoppingCart} tone="plum" />
                <Stat n={rm(a.revenue)} l={C.sRevenue} icon={Wallet} tone="plum" />
                <Stat n={rm(a.commission_owed)} l={C.sOwed} sub={`${C.rate}: ${a.commission_percent}%`} icon={HandCoins} tone="gold" />
                <Stat n={rm(a.commission_paid)} l={C.sPaid} icon={Coins} tone="gold" />
            </div>

            {/* Bank details + money model */}
            <div className="panel" style={{ padding: '14px 16px', marginBottom: 24 }}>
                <div className="spread" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{C.bankTitle}</div>
                        {a.bank_filled ? (
                            <div className="muted" style={{ fontSize: 13 }}>
                                {[a.bank.name, a.bank.account_name, a.bank.account_no].filter(Boolean).join(' · ')}
                            </div>
                        ) : (
                            <div className="row" style={{ gap: 6, color: 'var(--bad)', fontSize: 13 }}><AlertTriangle size={14} /> {C.bankNone}</div>
                        )}
                    </div>
                    <span className="muted" style={{ fontSize: 12.5, maxWidth: 360, textAlign: 'right' }}>{C.moneyModel}</span>
                </div>
            </div>

            {/* All transactions */}
            <div className="panel" style={{ padding: 16, marginBottom: 24 }}>
                <h3 style={{ margin: '4px 6px 2px' }}>{C.txTitle}</h3>
                <p className="muted" style={{ margin: '0 6px 12px', fontSize: 12.5 }}>{C.txSub}</p>
                <DataTable columns={txCols} rows={data.transactions} searchKeys={['reference', 'buyer']} pageSize={12} empty={C.emptyTx} exportName="transaksi-affiliate" />
            </div>

            {/* Payouts */}
            <div className="panel" style={{ padding: 16 }}>
                <h3 style={{ margin: '4px 6px 2px' }}>{C.payoutsTitle}</h3>
                <p className="muted" style={{ margin: '0 6px 12px', fontSize: 12.5 }}>{C.payoutsSub}</p>
                <DataTable columns={payoutCols} rows={data.payouts} searchKeys={['reference']} pageSize={10} empty={C.emptyPayouts} exportName="pelepasan-komisen" />
            </div>

            {/* Release drawer */}
            <Drawer
                open={relOpen}
                onClose={() => !releasing && setRelOpen(false)}
                title={C.relTitle}
                width={460}
                footer={(
                    <>
                        <button type="button" className="btn btn-ghost" onClick={() => setRelOpen(false)} disabled={releasing}>{C.cancel}</button>
                        <button type="button" className="btn btn-primary" onClick={() => void release()} disabled={releasing || owed <= 0}>
                            <Send size={15} /> {releasing ? C.releasing : C.relConfirm}
                        </button>
                    </>
                )}
            >
                <div className="stack" style={{ gap: 0 }}>
                    <div style={owedCard}>
                        <span className="muted">{C.relOwed}</span>
                        <strong style={{ fontSize: 22, color: 'var(--gold)' }}>{rm(owed)}</strong>
                    </div>

                    {!a.bank_filled && (
                        <div className="row" style={{ gap: 8, color: 'var(--bad)', fontSize: 12.5, margin: '0 0 14px', lineHeight: 1.5 }}>
                            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {C.relNoBank}
                        </div>
                    )}
                    {a.bank_filled && (
                        <div className="muted" style={{ fontSize: 12.5, margin: '0 0 14px' }}>
                            {[a.bank.name, a.bank.account_name, a.bank.account_no].filter(Boolean).join(' · ')}
                        </div>
                    )}

                    <div className="field">
                        <label>{C.relMethod}</label>
                        <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder={C.relMethodPh} />
                    </div>
                    <div className="field">
                        <label>{C.relProof} <span style={{ color: 'var(--bad)' }}>*</span></label>
                        <label className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                            {file ? <FileText size={16} /> : <Upload size={16} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file ? file.name : C.chooseFile}</span>
                            <input type="file" accept="image/*,application/pdf" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRelErr(null); }} style={{ display: 'none' }} />
                        </label>
                        <small className="muted">{C.relProofHint}</small>
                    </div>
                    <div className="field">
                        <label>{C.relNote}</label>
                        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    {relErr && <p className="form-err">{relErr}</p>}
                </div>
            </Drawer>
        </div>
    );
}

function Stat({ n, l, sub, icon: Icon, tone }: { n: string; l: string; sub?: string; icon: LucideIcon; tone: 'gold' | 'plum' }) {
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

const eyebrowStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)' };
const codeStyle: React.CSSProperties = { fontFamily: 'var(--mono, monospace)', fontSize: 12, background: 'var(--cream)', padding: '2px 7px', borderRadius: 6 };
const statIcon: React.CSSProperties = { width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)' };
const statIconGold: React.CSSProperties = { width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center', background: '#fdf0dc', color: '#b4740f' };
const owedCard: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 };
