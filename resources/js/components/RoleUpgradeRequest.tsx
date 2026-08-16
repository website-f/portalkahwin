import { useEffect, useState } from 'react';
import { Store, Handshake, Clock, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

interface Req { id: number; requested_role: string; status: string; note?: string | null; review_note?: string | null; }

/**
 * A normal user can't self-upgrade to vendor/affiliate — they raise a request a
 * superadmin reviews. Shows the live status once one exists, or the request form
 * otherwise. Renders nothing for non-`user` roles (they're already promoted).
 */
export function RoleUpgradeRequest() {
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Naik Taraf Peranan',
            sub: 'Ingin jual kad majlis (Vendor) atau jana komisen (Affiliate)? Mohon di sini — pasukan kami akan menyemak dan meluluskan.',
            vendor: 'Vendor', vendorSub: 'Jual kad & majlis berbayar, kutipan bayaran setiap kehadiran.',
            affiliate: 'Affiliate', affiliateSub: 'Kongsi pautan rujukan & jana komisen jualan.',
            noteLabel: 'Nota (pilihan)', notePh: 'Ceritakan sedikit tentang perniagaan / rancangan anda…',
            submit: 'Hantar Permohonan', submitting: 'Menghantar…',
            pending: 'Permohonan anda sedang disemak oleh pasukan kami.',
            pendingTo: (r: string) => `Menunggu kelulusan: ${r}`,
            approved: 'Permohonan diluluskan! Sila log masuk semula untuk melihat peranan baharu anda.',
            rejected: 'Permohonan sebelum ini tidak diluluskan. Anda boleh memohon semula.',
            requestAgain: 'Mohon Semula',
            errAlready: 'Anda sudah mempunyai permohonan yang menunggu.',
        },
        en: {
            title: 'Upgrade Your Role',
            sub: 'Want to sell event cards (Vendor) or earn commission (Affiliate)? Request it here — our team reviews and approves.',
            vendor: 'Vendor', vendorSub: 'Sell cards & ticketed events, collect pay-per-entry.',
            affiliate: 'Affiliate', affiliateSub: 'Share a referral link & earn sales commission.',
            noteLabel: 'Note (optional)', notePh: 'Tell us a little about your business / plans…',
            submit: 'Submit Request', submitting: 'Submitting…',
            pending: 'Your request is being reviewed by our team.',
            pendingTo: (r: string) => `Awaiting approval: ${r}`,
            approved: 'Request approved! Please log in again to see your new role.',
            rejected: 'Your previous request was not approved. You can request again.',
            requestAgain: 'Request Again',
            errAlready: 'You already have a pending request.',
        },
        zh: {
            title: '升级您的角色',
            sub: '想销售活动请柬（商家）或赚取佣金（联盟）？在此申请——我们的团队将审核并批准。',
            vendor: '商家', vendorSub: '销售请柬与售票活动，收取每人入场费。',
            affiliate: '联盟', affiliateSub: '分享推荐链接并赚取销售佣金。',
            noteLabel: '备注（可选）', notePh: '简单介绍一下您的业务 / 计划…',
            submit: '提交申请', submitting: '提交中…',
            pending: '您的申请正在审核中。',
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
    const [choice, setChoice] = useState<'vendor' | 'affiliate'>('vendor');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        api.get<{ role: string; request: Req | null }>('/me/role-request')
            .then((r) => { setRole(r.data.role); setReq(r.data.request); })
            .catch(() => { /* non-blocking */ });
    }, []);

    // Only normal users see this — everyone else is already promoted.
    if (role !== 'user') return null;

    async function submit() {
        setBusy(true); setErr(null);
        try {
            const r = await api.post<Req>('/me/role-request', { requested_role: choice, note: note.trim() || undefined });
            setReq(r.data);
            setShowForm(false);
        } catch (e: unknown) {
            const ax = e as { response?: { data?: { message?: string } } };
            setErr(ax.response?.data?.message ?? C.errAlready);
        } finally { setBusy(false); }
    }

    const pending = req?.status === 'pending';
    const approved = req?.status === 'approved';
    const rejected = req?.status === 'rejected';
    const showRequestForm = showForm || (!req || rejected);

    return (
        <div className="panel" style={{ marginBottom: 18, borderLeft: '4px solid var(--plum)' }}>
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

            {showRequestForm && !pending && !approved && (
                <>
                    {rejected && (
                        <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12, color: 'var(--bad)', fontSize: 13 }}>
                            <X size={15} /> {C.rejected}
                        </div>
                    )}
                    <div className="row wrap" style={{ gap: 10, marginBottom: 12 }}>
                        {([['vendor', Store, C.vendor, C.vendorSub], ['affiliate', Handshake, C.affiliate, C.affiliateSub]] as const).map(([val, Icon, label, sub]) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setChoice(val)}
                                style={{
                                    flex: '1 1 220px', textAlign: 'left', cursor: 'pointer',
                                    padding: '13px 15px', borderRadius: 12,
                                    border: `1.5px solid ${choice === val ? 'var(--plum)' : 'var(--line)'}`,
                                    background: choice === val ? 'var(--cream)' : '#fff',
                                }}
                            >
                                <div className="row" style={{ gap: 8, alignItems: 'center', fontWeight: 700, color: 'var(--plum)' }}>
                                    <Icon size={17} /> {label}
                                </div>
                                <div className="muted" style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5 }}>{sub}</div>
                            </button>
                        ))}
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                        <label>{C.noteLabel}</label>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={C.notePh} rows={2} />
                    </div>
                    {err && <div style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
                    <button className="btn btn-primary" onClick={submit} disabled={busy}>
                        {busy ? C.submitting : C.submit}
                    </button>
                </>
            )}
        </div>
    );
}
