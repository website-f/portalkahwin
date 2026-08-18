import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, Clock, Check, Upload, FileText, LogOut, RotateCw, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';

interface Appeal { id: number; reason: string; status: string; review_note?: string | null; created_at?: string }
interface Mine { status: string; rejection_note?: string | null; appeal: Appeal | null }

/**
 * The one page a REJECTED vendor/affiliate can reach (ProtectedRoute redirects
 * every other panel route here). They read why they were rejected, then appeal by
 * stating their case + attaching proof. Once the superadmin approves the appeal the
 * account flips to active and this page bounces back into the app.
 */
export function AppealPage() {
    const { user, logout, refresh } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();

    const [mine, setMine] = useState<Mine | null>(null);
    const [reason, setReason] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        api.get<Mine>('/me/appeal').then((r) => setMine(r.data)).catch(() => setMine(null));
    }, []);

    const C = dict({
        bm: {
            badge: 'Permohonan ditolak', heading: 'Permohonan anda tidak diluluskan',
            intro: 'Maaf, permohonan akaun anda telah ditolak oleh pasukan kami. Anda boleh membuat rayuan di bawah dengan menyatakan sebab dan melampirkan dokumen sokongan.',
            reasonGiven: 'Sebab penolakan', noReason: 'Tiada sebab dinyatakan.',
            appealTitle: 'Buat Rayuan', reasonLabel: 'Sebab rayuan anda', reasonPh: 'Terangkan mengapa akaun anda perlu dipertimbangkan semula…',
            attach: 'Lampiran sokongan (pilihan)', attachHint: 'Gambar atau PDF, maks 4MB (cth. resit, dokumen syarikat).', chooseFile: 'Pilih fail…',
            submit: 'Hantar Rayuan', submitting: 'Menghantar…',
            pendingTitle: 'Rayuan anda sedang disemak', pendingBody: 'Pasukan kami akan menyemak rayuan anda dan menghubungi anda. Terima kasih atas kesabaran anda.',
            rejectedTitle: 'Rayuan tidak diluluskan', rejectedBody: 'Maaf, rayuan anda tidak diluluskan. Anda boleh membuat rayuan sekali lagi dengan maklumat tambahan.',
            reviewNote: 'Nota semakan', appealAgain: 'Rayu Semula',
            logout: 'Log Keluar', recheck: 'Semak semula', checking: 'Menyemak…',
            errAlready: 'Anda sudah mempunyai rayuan yang menunggu.',
        },
        en: {
            badge: 'Application rejected', heading: 'Your application was not approved',
            intro: 'Unfortunately your account application was rejected by our team. You can appeal below by stating your case and attaching any supporting documents.',
            reasonGiven: 'Reason for rejection', noReason: 'No reason was provided.',
            appealTitle: 'Submit an appeal', reasonLabel: 'Your appeal', reasonPh: 'Explain why your account should be reconsidered…',
            attach: 'Supporting attachment (optional)', attachHint: 'Image or PDF, max 4MB (e.g. receipt, company documents).', chooseFile: 'Choose file…',
            submit: 'Submit Appeal', submitting: 'Submitting…',
            pendingTitle: 'Your appeal is under review', pendingBody: 'Our team will review your appeal and get back to you. Thanks for your patience.',
            rejectedTitle: 'Appeal not approved', rejectedBody: 'Sorry, your appeal was not approved. You may appeal again with additional information.',
            reviewNote: 'Review note', appealAgain: 'Appeal Again',
            logout: 'Log Out', recheck: 'Refresh', checking: 'Checking…',
            errAlready: 'You already have a pending appeal.',
        },
        zh: {
            badge: '申请被拒', heading: '您的申请未通过',
            intro: '很抱歉，您的账户申请被我们的团队拒绝。您可以在下方提出申诉，说明理由并附上相关证明文件。',
            reasonGiven: '拒绝原因', noReason: '未提供原因。',
            appealTitle: '提交申诉', reasonLabel: '您的申诉', reasonPh: '请说明为何应重新考虑您的账户…',
            attach: '支持附件（可选）', attachHint: '图片或 PDF，最大 4MB（如收据、公司文件）。', chooseFile: '选择文件…',
            submit: '提交申诉', submitting: '提交中…',
            pendingTitle: '您的申诉正在审核中', pendingBody: '我们的团队将审核您的申诉并与您联系。感谢您的耐心等待。',
            rejectedTitle: '申诉未通过', rejectedBody: '很抱歉，您的申诉未通过。您可以补充信息后再次申诉。',
            reviewNote: '审核备注', appealAgain: '再次申诉',
            logout: '退出登录', recheck: '刷新', checking: '检查中…',
            errAlready: '您已有一个待处理的申诉。',
        },
    }, lang);

    // Only rejected accounts belong here; an active/pending account is bounced out.
    if (user && user.status !== 'rejected') {
        return <Navigate to={user.status === 'pending' ? '/panel/pending' : '/panel'} replace />;
    }

    async function submit() {
        setBusy(true); setErr(null);
        try {
            const fd = new FormData();
            fd.append('reason', reason.trim());
            if (file) fd.append('attachment', file);
            const r = await api.post<Appeal>('/me/appeal', fd);
            setMine((m) => (m ? { ...m, appeal: r.data } : { status: 'rejected', appeal: r.data }));
            setReason(''); setFile(null);
        } catch (e: unknown) {
            setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? C.errAlready);
        } finally { setBusy(false); }
    }

    async function recheck() {
        setChecking(true);
        try { await refresh(); const r = await api.get<Mine>('/me/appeal'); setMine(r.data); }
        finally { setChecking(false); }
    }

    async function doLogout() { await logout(); nav('/', { replace: true }); }

    const appeal = mine?.appeal ?? null;
    const pending = appeal?.status === 'pending';
    const appealRejected = appeal?.status === 'rejected';
    const showForm = !appeal || appealRejected;

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: '8px 0' }}>
            <div className="panel" style={{ width: 'min(560px, 100%)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={iconWrap}><ShieldAlert size={26} color="var(--bad)" /></div>
                    <span className="badge badge-bad" style={{ marginTop: 16 }}>{C.badge}</span>
                    <h2 style={{ margin: '12px 0 8px' }}>{C.heading}</h2>
                    <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{C.intro}</p>
                </div>

                {/* Why they were rejected (admin's note). */}
                <div style={detailBox}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>{C.reasonGiven}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{mine?.rejection_note || C.noReason}</div>
                </div>

                {pending && (
                    <div style={{ ...statusBox, background: 'var(--cream)', borderColor: 'var(--line)' }}>
                        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                            <Clock size={18} style={{ color: 'var(--plum)', flexShrink: 0, marginTop: 1 }} />
                            <div>
                                <div style={{ fontWeight: 700 }}>{C.pendingTitle}</div>
                                <div className="muted" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{C.pendingBody}</div>
                            </div>
                        </div>
                    </div>
                )}

                {appealRejected && (
                    <div style={{ ...statusBox, background: '#fbeaea', borderColor: '#f3c2c2' }}>
                        <div style={{ fontWeight: 700, color: 'var(--bad)' }}>{C.rejectedTitle}</div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{C.rejectedBody}</div>
                        {appeal?.review_note && (
                            <div style={{ fontSize: 13, marginTop: 8 }}><strong>{C.reviewNote}:</strong> {appeal.review_note}</div>
                        )}
                    </div>
                )}

                {showForm && (
                    <div style={{ marginTop: 18 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>{appealRejected ? C.appealAgain : C.appealTitle}</h3>
                        <div className="field">
                            <label>{C.reasonLabel}</label>
                            <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={C.reasonPh} />
                        </div>
                        <div className="field">
                            <label>{C.attach}</label>
                            <label className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                                {file ? <FileText size={16} /> : <Upload size={16} />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file ? file.name : C.chooseFile}</span>
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                            </label>
                            <small className="muted">{C.attachHint}</small>
                        </div>
                        {err && <p className="form-err">{err}</p>}
                        <button className="btn btn-primary" onClick={submit} disabled={busy || !reason.trim()}>
                            <Send size={15} /> {busy ? C.submitting : C.submit}
                        </button>
                    </div>
                )}

                <div className="row" style={{ justifyContent: 'center', marginTop: 20, gap: 10 }}>
                    <button className="btn btn-ghost" onClick={doLogout}><LogOut size={16} /> {C.logout}</button>
                    <button className="btn btn-ghost btn-sm" onClick={recheck} disabled={checking} style={{ color: 'var(--muted)' }}>
                        <RotateCw size={15} /> {checking ? C.checking : C.recheck}
                    </button>
                </div>
            </div>
        </div>
    );
}

const iconWrap: React.CSSProperties = {
    width: 60, height: 60, borderRadius: 18, background: '#fbeaea',
    display: 'grid', placeItems: 'center', margin: '0 auto',
};
const detailBox: React.CSSProperties = {
    background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', margin: '18px 0 0',
};
const statusBox: React.CSSProperties = {
    border: '1px solid', borderRadius: 12, padding: '13px 15px', marginTop: 14,
};
