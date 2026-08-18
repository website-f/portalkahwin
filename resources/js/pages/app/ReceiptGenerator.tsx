import { useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';

interface Item { name: string; amount: string }

/**
 * A standalone receipt generator for vendors — nothing to do with platform
 * transactions. Instead of a stack of form panels it shows the actual receipt
 * LAYOUT (the same one the PDF prints) with the vendor's business prefilled;
 * they edit the "from", "billed to", line items and amounts inline, then
 * download. Nothing is stored; it's a tool, not a record.
 */
export function ReceiptGenerator() {
    const { user } = useAuth();
    const { lang } = useLang();
    const pd = ((user as unknown as { profile_data?: Record<string, string> })?.profile_data ?? {}) as Record<string, string>;

    const C = dict({
        bm: {
            title: 'Penjana Resit',
            subtitle: 'Inilah rupa resit yang akan dicetak. Ketik mana-mana medan untuk mengubahnya, kemudian muat turun.',
            company: 'Nama perniagaan anda', desc: 'Keterangan (pilihan)', address: 'Alamat (pilihan)',
            phone: 'Telefon', email: 'E-mel', tax: 'No. cukai / SST',
            custName: 'Nama pelanggan', custEmail: 'E-mel pelanggan (pilihan)',
            itemName: 'Perihal item', note: 'Nota kaki (pilihan)', addItem: 'Tambah item',
            generate: 'Muat Turun Resit (PDF)', generating: 'Menjana…',
            needCompany: 'Sila isi nama perniagaan.', needCustomer: 'Sila isi nama pelanggan.', needItem: 'Sila tambah sekurang-kurangnya satu item dengan jumlah.',
            fail: 'Resit belum berjaya dijana. Sila cuba lagi.',
        },
        en: {
            title: 'Receipt Generator',
            subtitle: 'This is exactly how the receipt prints. Tap any field to edit it, then download.',
            company: 'Your business name', desc: 'Description (optional)', address: 'Address (optional)',
            phone: 'Phone', email: 'Email', tax: 'Tax / SST no.',
            custName: 'Customer name', custEmail: 'Customer email (optional)',
            itemName: 'Item description', note: 'Footer note (optional)', addItem: 'Add item',
            generate: 'Download Receipt (PDF)', generating: 'Generating…',
            needCompany: 'Please enter a business name.', needCustomer: 'Please enter a customer name.', needItem: 'Please add at least one item with an amount.',
            fail: 'Could not generate the receipt. Please try again.',
        },
        zh: {
            title: '收据生成器',
            subtitle: '这就是收据打印后的样子。点击任意字段即可修改，然后下载。',
            company: '您的商号名称', desc: '描述（可选）', address: '地址（可选）',
            phone: '电话', email: '邮箱', tax: '税号 / SST',
            custName: '客户名称', custEmail: '客户邮箱（可选）',
            itemName: '项目描述', note: '页脚备注（可选）', addItem: '添加项目',
            generate: '下载收据（PDF）', generating: '生成中…',
            needCompany: '请填写商号名称。', needCustomer: '请填写客户名称。', needItem: '请至少添加一个带金额的项目。',
            fail: '生成收据失败，请重试。',
        },
    }, lang);

    // Prefill "from" from the vendor's account + saved receipt profile.
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
    const logo = user?.company_logo || '/Portal-Kahwin-Logo-Header-2.png';

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

    const money = (n: number) => n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div>
            {/* Inputs are styled to disappear into the receipt until hovered/focused,
                so the page reads as the printed receipt rather than a form. */}
            <style>{`
                .rcpt-paper input, .rcpt-paper textarea {
                    border: 0; background: transparent; font: inherit; color: inherit;
                    outline: none; border-radius: 5px; padding: 2px 5px; margin: -2px -5px;
                    width: 100%; box-sizing: border-box; resize: none;
                }
                .rcpt-paper input:hover, .rcpt-paper textarea:hover { background: var(--cream); }
                .rcpt-paper input:focus, .rcpt-paper textarea:focus { background: #fff; box-shadow: 0 0 0 2px var(--plum); }
                .rcpt-paper input::placeholder, .rcpt-paper textarea::placeholder { color: #b9b6cc; }
            `}</style>

            <div className="page-head" style={{ maxWidth: 680, margin: '0 auto 20px' }}>
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <div
                    className="rcpt-paper"
                    style={{
                        background: '#fff', borderRadius: 14, boxShadow: 'var(--shadow, 0 8px 30px rgba(30,26,51,.10))',
                        border: '1px solid var(--line)', padding: '34px 38px', color: '#2b2740', fontSize: 13.5, lineHeight: 1.55,
                    }}
                >
                    {/* HEAD */}
                    <div style={{ borderBottom: '2px solid var(--plum)', paddingBottom: 14, marginBottom: 18 }}>
                        <img src={logo} alt="" style={{ height: 38, marginBottom: 10, objectFit: 'contain' }} />
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={C.company} />
                        </div>
                        <div className="muted" style={{ marginTop: 2 }}>
                            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={C.desc} />
                        </div>
                        <div className="muted" style={{ marginTop: 2 }}>
                            <textarea rows={1} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={C.address}
                                style={{ minHeight: 26 }} />
                        </div>
                        <div className="muted" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={C.phone} style={{ width: 'auto', minWidth: 110, flex: '0 1 auto' }} />
                            <span style={{ color: '#c9c6db' }}>·</span>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={C.email} style={{ width: 'auto', minWidth: 150, flex: '1 1 160px' }} />
                        </div>
                        <div className="muted" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ whiteSpace: 'nowrap' }}>Tax / SST:</span>
                            <input value={tax} onChange={(e) => setTax(e.target.value)} placeholder={C.tax} style={{ width: 'auto', flex: '1 1 auto' }} />
                        </div>
                        <div className="muted" style={{ marginTop: 10, letterSpacing: 1, fontSize: 10.5, textTransform: 'uppercase' }}>RESIT / RECEIPT</div>
                    </div>

                    {/* META */}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td className="muted" style={{ width: 130, padding: '4px 0', verticalAlign: 'top' }}>No. Rujukan</td>
                                <td style={{ padding: '4px 0', fontWeight: 700 }}>
                                    <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="RCP-… (auto)" />
                                </td>
                            </tr>
                            <tr>
                                <td className="muted" style={{ padding: '4px 0', verticalAlign: 'top' }}>Tarikh</td>
                                <td style={{ padding: '4px 0' }}>
                                    <input value={date} onChange={(e) => setDate(e.target.value)} placeholder={new Date().toLocaleDateString('en-GB')} />
                                </td>
                            </tr>
                            <tr>
                                <td className="muted" style={{ padding: '4px 0', verticalAlign: 'top' }}>Status</td>
                                <td style={{ padding: '4px 0' }}>
                                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 9, fontSize: 10.5, fontWeight: 700, background: '#e4f3ec', color: '#1f7a52' }}>PAID</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="muted" style={{ padding: '4px 0', verticalAlign: 'top' }}>Dibilkan kepada</td>
                                <td style={{ padding: '4px 0' }}>
                                    <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder={C.custName} style={{ fontWeight: 600 }} />
                                    <div className="muted" style={{ marginTop: 2 }}>
                                        <input value={custEmail} onChange={(e) => setCustEmail(e.target.value)} placeholder={C.custEmail} />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ITEMS */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18 }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Keterangan</th>
                                <th style={{ ...thStyle, textAlign: 'right', width: 150 }}>Jumlah (RM)</th>
                                <th style={{ ...thStyle, width: 34 }} aria-hidden="true"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it, i) => (
                                <tr key={i}>
                                    <td style={tdStyle}>
                                        <input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder={C.itemName} />
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <input type="number" min={0} step="0.01" value={it.amount} onChange={(e) => setItem(i, { amount: e.target.value })}
                                            placeholder="0.00" style={{ textAlign: 'right' }} />
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <button type="button" onClick={() => removeItem(i)} disabled={items.length <= 1} aria-label="remove"
                                            style={{ border: 0, background: 'transparent', cursor: items.length <= 1 ? 'default' : 'pointer', color: items.length <= 1 ? '#d9d6ea' : '#b06', padding: 4, display: 'grid', placeItems: 'center' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan={3} style={{ padding: '8px 0' }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        <Plus size={14} /> {C.addItem}
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, paddingTop: 12 }}>Jumlah Keseluruhan</td>
                                <td style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, paddingTop: 12, color: 'var(--plum)' }}>RM {money(total)}</td>
                                <td style={{ paddingTop: 12 }} />
                            </tr>
                        </tbody>
                    </table>

                    {/* FOOTER */}
                    <div style={{ marginTop: 26, paddingTop: 12, borderTop: '1px solid #efedf7', fontSize: 11, color: '#8a86a0' }}>
                        Resit ini dijana secara automatik dan sah tanpa tandatangan.
                        <div style={{ marginTop: 6 }}>
                            <textarea rows={1} value={note} onChange={(e) => setNote(e.target.value)} placeholder={C.note} style={{ minHeight: 24, color: '#8a86a0' }} />
                        </div>
                    </div>
                </div>

                {err && <p className="form-err" style={{ marginTop: 14 }}>{err}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button type="button" className="btn btn-primary" onClick={generate} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <Download size={16} /> {busy ? C.generating : C.generate}
                    </button>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    textAlign: 'left', borderBottom: '1px solid #d9d6ea', padding: '7px 0', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: 1, color: '#6b6685', fontWeight: 700,
};
const tdStyle: React.CSSProperties = { padding: '6px 0', borderBottom: '1px solid #efedf7', verticalAlign: 'middle' };
