import { useState } from 'react';
import { ReceiptText, Plus, Trash2, Download, Building2, User as UserIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';

interface Item { name: string; amount: string }

/**
 * A standalone receipt generator for vendors — nothing to do with platform
 * transactions. They fill in their own "from" business, a billed-to, and any number
 * of custom line items, and download a clean PDF built from the platform template.
 */
export function ReceiptGenerator() {
    const { user } = useAuth();
    const { lang } = useLang();
    const pd = ((user as unknown as { profile_data?: Record<string, string> })?.profile_data ?? {}) as Record<string, string>;

    const C = dict({
        bm: {
            title: 'Penjana Resit', subtitle: 'Cipta resit tersuai untuk pelanggan anda — perniagaan anda, item anda. Tiada rekod disimpan.',
            fromTitle: 'Daripada (perniagaan anda)', company: 'Nama perniagaan', desc: 'Keterangan (pilihan)', address: 'Alamat (pilihan)',
            phone: 'Telefon (pilihan)', email: 'E-mel (pilihan)', tax: 'No. cukai / SST (pilihan)',
            billTitle: 'Dibilkan kepada', custName: 'Nama pelanggan', custEmail: 'E-mel pelanggan (pilihan)',
            metaRef: 'No. rujukan (pilihan)', metaDate: 'Tarikh (pilihan)', metaNote: 'Nota kaki (pilihan)',
            itemsTitle: 'Item', itemName: 'Perihal item', itemAmount: 'Jumlah (RM)', addItem: 'Tambah item',
            total: 'Jumlah', generate: 'Jana Resit (PDF)', generating: 'Menjana…',
            needCompany: 'Sila isi nama perniagaan.', needCustomer: 'Sila isi nama pelanggan.', needItem: 'Sila tambah sekurang-kurangnya satu item dengan jumlah.',
            fail: 'Resit belum berjaya dijana. Sila cuba lagi.',
        },
        en: {
            title: 'Receipt Generator', subtitle: 'Create a custom receipt for your customer — your business, your items. Nothing is stored.',
            fromTitle: 'From (your business)', company: 'Business name', desc: 'Description (optional)', address: 'Address (optional)',
            phone: 'Phone (optional)', email: 'Email (optional)', tax: 'Tax / SST no. (optional)',
            billTitle: 'Billed to', custName: 'Customer name', custEmail: 'Customer email (optional)',
            metaRef: 'Reference no. (optional)', metaDate: 'Date (optional)', metaNote: 'Footer note (optional)',
            itemsTitle: 'Items', itemName: 'Item description', itemAmount: 'Amount (RM)', addItem: 'Add item',
            total: 'Total', generate: 'Generate Receipt (PDF)', generating: 'Generating…',
            needCompany: 'Please enter a business name.', needCustomer: 'Please enter a customer name.', needItem: 'Please add at least one item with an amount.',
            fail: 'Could not generate the receipt. Please try again.',
        },
        zh: {
            title: '收据生成器', subtitle: '为您的客户生成自定义收据 — 您的商号、您的项目。不会保存任何记录。',
            fromTitle: '开票方（您的商号）', company: '商号名称', desc: '描述（可选）', address: '地址（可选）',
            phone: '电话（可选）', email: '邮箱（可选）', tax: '税号 / SST（可选）',
            billTitle: '收票方', custName: '客户名称', custEmail: '客户邮箱（可选）',
            metaRef: '编号（可选）', metaDate: '日期（可选）', metaNote: '页脚备注（可选）',
            itemsTitle: '项目', itemName: '项目描述', itemAmount: '金额（RM）', addItem: '添加项目',
            total: '合计', generate: '生成收据（PDF）', generating: '生成中…',
            needCompany: '请填写商号名称。', needCustomer: '请填写客户名称。', needItem: '请至少添加一个带金额的项目。',
            fail: '生成收据失败，请重试。',
        },
    }, lang);

    // Prefill "from" from the vendor's saved business/receipt profile.
    const [company, setCompany] = useState(user?.company_name ?? '');
    const [desc, setDesc] = useState('');
    const [address, setAddress] = useState(pd.receipt_address ?? '');
    const [phone, setPhone] = useState(pd.receipt_phone ?? user?.phone ?? '');
    const [email, setEmail] = useState(pd.receipt_email ?? '');
    const [tax, setTax] = useState(pd.receipt_tax ?? '');
    const [customer, setCustomer] = useState('');
    const [custEmail, setCustEmail] = useState('');
    const [reference, setReference] = useState('');
    const [date, setDate] = useState('');
    const [note, setNote] = useState('');
    const [items, setItems] = useState<Item[]>([{ name: '', amount: '' }]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const loc = lang === 'bm' ? 'ms-MY' : lang === 'zh' ? 'zh-CN' : 'en-MY';
    const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

    function setItem(i: number, patch: Partial<Item>) { setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x))); }
    function addItem() { setItems((xs) => [...xs, { name: '', amount: '' }]); }
    function removeItem(i: number) { setItems((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== i) : xs)); }

    async function generate() {
        setErr(null);
        if (!company.trim()) { setErr(C.needCompany); return; }
        if (!customer.trim()) { setErr(C.needCustomer); return; }
        const clean = items.filter((i) => i.name.trim() && i.amount !== '' && !Number.isNaN(Number(i.amount)));
        if (clean.length === 0) { setErr(C.needItem); return; }
        setBusy(true);
        try {
            const r = await api.post('/me/receipt-generator', {
                company: company.trim(), description: desc.trim() || undefined, address: address.trim() || undefined,
                phone: phone.trim() || undefined, email: email.trim() || undefined, tax: tax.trim() || undefined,
                customer: customer.trim(), customer_email: custEmail.trim() || undefined,
                reference: reference.trim() || undefined, date: date.trim() || undefined, note: note.trim() || undefined,
                items: clean.map((i) => ({ name: i.name.trim(), amount: Number(i.amount) })),
            }, { responseType: 'blob' });
            const url = URL.createObjectURL(r.data as Blob);
            const a = document.createElement('a');
            a.href = url; a.download = `resit-${reference.trim() || 'baharu'}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            setErr(C.fail);
        } finally { setBusy(false); }
    }

    return (
        <div>
            <div className="page-head" style={{ maxWidth: 720, margin: '0 auto 24px' }}>
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 18 }}>
                {/* From */}
                <div className="panel">
                    <div className="row" style={{ gap: 8, marginBottom: 12 }}><Building2 size={17} color="var(--plum)" /><h3 style={{ margin: 0 }}>{C.fromTitle}</h3></div>
                    <div className="field"><label>{C.company}</label><input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
                    <div className="field"><label>{C.desc}</label><input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
                    <div className="row wrap" style={{ gap: 12 }}>
                        <div className="field" style={{ flex: '1 1 220px' }}><label>{C.phone}</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                        <div className="field" style={{ flex: '1 1 220px' }}><label>{C.email}</label><input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                    </div>
                    <div className="field"><label>{C.address}</label><textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                    <div className="field" style={{ margin: 0 }}><label>{C.tax}</label><input value={tax} onChange={(e) => setTax(e.target.value)} /></div>
                </div>

                {/* Billed to + meta */}
                <div className="panel">
                    <div className="row" style={{ gap: 8, marginBottom: 12 }}><UserIcon size={17} color="var(--plum)" /><h3 style={{ margin: 0 }}>{C.billTitle}</h3></div>
                    <div className="row wrap" style={{ gap: 12 }}>
                        <div className="field" style={{ flex: '1 1 220px' }}><label>{C.custName}</label><input value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
                        <div className="field" style={{ flex: '1 1 220px' }}><label>{C.custEmail}</label><input value={custEmail} onChange={(e) => setCustEmail(e.target.value)} /></div>
                    </div>
                    <div className="row wrap" style={{ gap: 12 }}>
                        <div className="field" style={{ flex: '1 1 220px' }}><label>{C.metaRef}</label><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="RCP-…" /></div>
                        <div className="field" style={{ flex: '1 1 220px', margin: 0 }}><label>{C.metaDate}</label><input value={date} onChange={(e) => setDate(e.target.value)} placeholder="18/08/2026" /></div>
                    </div>
                </div>

                {/* Items */}
                <div className="panel">
                    <div className="row" style={{ gap: 8, marginBottom: 12 }}><ReceiptText size={17} color="var(--plum)" /><h3 style={{ margin: 0 }}>{C.itemsTitle}</h3></div>
                    <div style={{ display: 'grid', gap: 10 }}>
                        {items.map((it, i) => (
                            <div key={i} className="row" style={{ gap: 8, alignItems: 'center' }}>
                                <input style={{ flex: '1 1 auto' }} placeholder={C.itemName} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} />
                                <input style={{ flex: '0 0 130px' }} type="number" min={0} step="0.01" placeholder={C.itemAmount} value={it.amount} onChange={(e) => setItem(i, { amount: e.target.value })} />
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(i)} disabled={items.length <= 1} aria-label="remove"><Trash2 size={15} /></button>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={addItem}><Plus size={15} /> {C.addItem}</button>

                    <div className="spread" style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 12 }}>
                        <strong>{C.total}</strong>
                        <strong style={{ fontSize: 20, color: 'var(--plum)' }}>RM {total.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>

                    <div className="field" style={{ marginTop: 14 }}><label>{C.metaNote}</label><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>

                    {err && <p className="form-err">{err}</p>}
                    <button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>
                        <Download size={16} /> {busy ? C.generating : C.generate}
                    </button>
                </div>
            </div>
        </div>
    );
}
