import { useEffect, useState } from 'react';
import { Store, Handshake, Clock, Check, X, ArrowUpCircle, Building2, Phone, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

interface Req { id: number; requested_role: string; status: string; note?: string | null; review_note?: string | null; }

/**
 * A normal user can't self-upgrade to vendor/affiliate — they raise a request a
 * superadmin reviews (it surfaces in the Approvals page). The card is plain; the
 * request itself is a two-step MODAL: step 1 pick Vendor/Affiliate, step 2 fill the
 * business details (company + phone + note), then submit. Renders nothing for
 * non-`user` roles (they're already promoted).
 */
export function RoleUpgradeRequest() {
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Naik Taraf Peranan',
            sub: 'Ingin jual kad majlis (Vendor) atau jana komisen (Affiliate)? Mohon di sini — pasukan kami akan menyemak dan meluluskan.',
            startBtn: 'Mohon Naik Taraf',
            step: (n: number) => `Langkah ${n} / 2`,
            pickTitle: 'Pilih jenis akaun', detailsTitle: 'Butiran perniagaan anda',
            vendor: 'Vendor', vendorSub: 'Jual kad & majlis berbayar, kutipan bayaran setiap kehadiran.',
            affiliate: 'Affiliate', affiliateSub: 'Kongsi pautan rujukan & jana komisen jualan.',
            company: 'Nama Syarikat / Perniagaan', companyPh: 'cth. Kad Kahwin Sdn Bhd',
            phone: 'No. Telefon', phonePh: 'cth. 012-345 6789',
            noteLabel: 'Nota (pilihan)', notePh: 'Ceritakan sedikit tentang perniagaan / rancangan anda…',
            next: 'Seterusnya', back: 'Kembali', submit: 'Hantar Permohonan', submitting: 'Menghantar…', cancel: 'Batal',
            pending: 'Permohonan anda sedang disemak. Setelah diluluskan, kami akan menghubungi anda untuk langkah pembayaran (jika ada).',
            pendingTo: (r: string) => `Menunggu kelulusan: ${r}`,
            approved: 'Permohonan diluluskan! Sila log masuk semula untuk melihat peranan baharu anda.',
            rejected: 'Permohonan sebelum ini tidak diluluskan. Anda boleh memohon semula.',
            requestAgain: 'Mohon Semula',
            errAlready: 'Anda sudah mempunyai permohonan yang menunggu.',
        },
        en: {
            title: 'Upgrade Your Role',
            sub: 'Want to sell event cards (Vendor) or earn commission (Affiliate)? Request it here — our team reviews and approves.',
            startBtn: 'Request an upgrade',
            step: (n: number) => `Step ${n} of 2`,
            pickTitle: 'Choose account type', detailsTitle: 'Your business details',
            vendor: 'Vendor', vendorSub: 'Sell cards & ticketed events, collect pay-per-entry.',
            affiliate: 'Affiliate', affiliateSub: 'Share a referral link & earn sales commission.',
            company: 'Company / business name', companyPh: 'e.g. Kad Kahwin Sdn Bhd',
            phone: 'Phone number', phonePh: 'e.g. 012-345 6789',
            noteLabel: 'Note (optional)', notePh: 'Tell us a little about your business / plans…',
            next: 'Next', back: 'Back', submit: 'Submit Request', submitting: 'Submitting…', cancel: 'Cancel',
            pending: 'Your request is being reviewed. Once approved, we’ll contact you for the payment step (if any).',
            pendingTo: (r: string) => `Awaiting approval: ${r}`,
            approved: 'Request approved! Please log in again to see your new role.',
            rejected: 'Your previous request was not approved. You can request again.',
            requestAgain: 'Request Again',
            errAlready: 'You already have a pending request.',
        },
        zh: {
            title: '升级您的角色',
            sub: '想销售活动请柬（商家）或赚取佣金（联盟）？在此申请——我们的团队将审核并批准。',
            startBtn: '申请升级',
            step: (n: number) => `第 ${n} / 2 步`,
            pickTitle: '选择账户类型', detailsTitle: '您的商号资料',
            vendor: '商家', vendorSub: '销售请柬与售票活动，收取每人入场费。',
            affiliate: '联盟', affiliateSub: '分享推荐链接并赚取销售佣金。',
            company: '公司 / 商号名称', companyPh: '例如：Kad Kahwin Sdn Bhd',
            phone: '联系电话', phonePh: '例如：012-345 6789',
            noteLabel: '备注（可选）', notePh: '简单介绍一下您的业务 / 计划…',
            next: '下一步', back: '返回', submit: '提交申请', submitting: '提交中…', cancel: '取消',
            pending: '您的申请正在审核中。审核通过后，我们将联系您完成付款步骤（如有）。',
            pendingTo: (r: string) => `等待批准：${r}`,
            approved: '申请已批准！请重新登录以查看您的新角色。',
            rejected: '您之前的申请未获批准。您可以重新申请。',
            requestAgain: '重新申请',
            errAlready: '您已有一个待处理的申请。',
        },
    }, lang);

    const roleName = (r: string) => (r === 'vendor' ? C.vendor : C.affiliate);

    const [role, setRole] = useState<string | null>(null);
    const [req, setReq] = useState<Req | null>(null);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [choice, setChoice] = useState<'vendor' | 'affiliate'>('vendor');
    const [company, setCompany] = useState('');
    const [phone, setPhone] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        api.get<{ role: string; request: Req | null }>('/me/role-request')
            .then((r) => { setRole(r.data.role); setReq(r.data.request); })
            .catch(() => { /* non-blocking */ });
    }, []);

    // Only normal users see this — everyone else is already promoted.
    if (role !== 'user') return null;

    function openModal() {
        setStep(1); setChoice('vendor'); setCompany(''); setPhone(''); setNote(''); setErr(null); setOpen(true);
    }

    async function submit() {
        setBusy(true); setErr(null);
        try {
            const r = await api.post<Req>('/me/role-request', {
                requested_role: choice,
                company_name: company.trim() || undefined,
                phone: phone.trim() || undefined,
                note: note.trim() || undefined,
            });
            setReq(r.data);
            setOpen(false);
        } catch (e: unknown) {
            const ax = e as { response?: { data?: { message?: string } } };
            setErr(ax.response?.data?.message ?? C.errAlready);
        } finally { setBusy(false); }
    }

    const pending = req?.status === 'pending';
    const approved = req?.status === 'approved';
    const rejected = req?.status === 'rejected';

    return (
        <div className="panel" style={{ marginBottom: 18 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>{C.title}</h2>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.55 }}>{C.sub}</p>

            {pending && (
                <div className="row" style={{ gap: 10, alignItems: 'center', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
                    <Clock size={18} style={{ color: 'var(--plum)', flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: 600 }}>{C.pendingTo(roleName(req!.requested_role))}</div>
                        <div className="muted" style={{ fontSize: 13 }}>{C.pending}</div>
                    </div>
                </div>
            )}

            {approved && (
                <div className="row" style={{ gap: 10, alignItems: 'center', background: '#e4f3ec', border: '1px solid #bfe3d0', borderRadius: 10, padding: '12px 14px' }}>
                    <Check size={18} style={{ color: '#2f6b52', flexShrink: 0 }} />
                    <div style={{ color: '#2f6b52', fontWeight: 600 }}>{C.approved}</div>
                </div>
            )}

            {!pending && !approved && (
                <>
                    {rejected && (
                        <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12, color: 'var(--bad)', fontSize: 13 }}>
                            <X size={15} /> {C.rejected}
                        </div>
                    )}
                    <button type="button" className="btn btn-primary" onClick={openModal}>
                        <ArrowUpCircle size={16} /> {rejected ? C.requestAgain : C.startBtn}
                    </button>
                </>
            )}

            {/* Stepped request modal */}
            {open && (
                <div style={overlay} role="dialog" aria-modal="true" onClick={() => { if (!busy) setOpen(false); }}>
                    <div className="panel" style={{ maxWidth: 460, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                        <div className="spread" style={{ alignItems: 'center', marginBottom: 4 }}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>{step === 1 ? C.pickTitle : C.detailsTitle}</h3>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={busy} aria-label={C.cancel}><X size={16} /></button>
                        </div>
                        <p className="muted" style={{ margin: '0 0 16px', fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 700 }}>{C.step(step)}</p>

                        {step === 1 && (
                            <>
                                <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                                    {([['vendor', Store, C.vendor, C.vendorSub], ['affiliate', Handshake, C.affiliate, C.affiliateSub]] as const).map(([val, Icon, label, sub]) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setChoice(val)}
                                            style={{
                                                textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderRadius: 12,
                                                border: `1.5px solid ${choice === val ? 'var(--plum)' : 'var(--line)'}`,
                                                background: choice === val ? 'var(--cream)' : '#fff',
                                            }}
                                        >
                                            <div className="row" style={{ gap: 9, alignItems: 'center', fontWeight: 700, color: 'var(--plum)' }}>
                                                <Icon size={18} /> {label}
                                                {choice === val && <Check size={15} style={{ marginLeft: 'auto', color: 'var(--plum)' }} />}
                                            </div>
                                            <div className="muted" style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5 }}>{sub}</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{C.cancel}</button>
                                    <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>{C.next} <ArrowRight size={15} /></button>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="field" style={{ marginBottom: 12 }}>
                                    <label>{C.company}</label>
                                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                                        <Building2 size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                                        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={C.companyPh} autoComplete="organization" style={{ flex: 1 }} autoFocus />
                                    </div>
                                </div>
                                <div className="field" style={{ marginBottom: 12 }}>
                                    <label>{C.phone}</label>
                                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                                        <Phone size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={C.phonePh} autoComplete="tel" style={{ flex: 1 }} />
                                    </div>
                                </div>
                                <div className="field" style={{ marginBottom: 12 }}>
                                    <label>{C.noteLabel}</label>
                                    <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={C.notePh} rows={2} />
                                </div>
                                {err && <div style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
                                <div className="row" style={{ gap: 10, justifyContent: 'space-between' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} disabled={busy}><ArrowLeft size={15} /> {C.back}</button>
                                    <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
                                        {busy ? C.submitting : C.submit}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 250, display: 'grid', placeItems: 'center', padding: 16,
    background: 'rgba(24, 18, 33, 0.62)', backdropFilter: 'blur(4px)',
};
