import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, Power, KeyRound, Copy, Check,
    Mail, Send, MessageSquare, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

interface UserRow {
    id: number; name: string; email: string; phone?: string | null;
    role: string; plan?: string | null; is_active: boolean; created_at?: string;
    template_scope?: string | null;
    company_name?: string | null; company_logo?: string | null;
    profile_data?: Record<string, string | null> | null;
    use_own_receipt_branding?: boolean;
}
interface Card {
    id: string | number; bride_name: string; groom_name: string;
    template_key: string; status: string; views: number; trial_views?: number; edit_count?: number;
    is_trial?: boolean; is_paid?: boolean; created_at?: string;
}
interface Payment {
    id: string | number; amount?: number | string; currency?: string | null;
    status?: string | null; method?: string | null; reference?: string | null;
    description?: string | null; plan?: string | null; created_at?: string;
}
interface ProfileFieldDef { key: string; label: string; type: string }
interface RoleReq {
    id: number; requested_role: string; note?: string | null;
    status: string; review_note?: string | null; created_at?: string;
}
interface Detail {
    user: UserRow;
    stats: { cards: number; published: number; rsvps: number };
    cards: Card[];
    payments: Payment[];
    profile_fields?: ProfileFieldDef[];
    role_requests?: RoleReq[];
}

export function AdminUserDetail() {
    const { lang } = useLang();
    const dialog = useDialog();
    const C = dict({
        bm: {
            backToUsers: 'Kembali ke Senarai Pengguna', noPhone: 'Tiada nombor telefon',
            active: 'Aktif', inactive: 'Tidak aktif', admin: 'Admin', since: 'Sejak',
            premium: 'Premium', free: 'Percuma',
            totalCards: 'Jumlah Kad', published: 'Terbit', rsvp: 'RSVP',
            userCards: 'Kad Milik Pengguna', payments: 'Pembayaran',
            emptyCards: 'Pengguna belum mencipta kad.', emptyPayments: 'Tiada rekod pembayaran.',
            actions: 'Tindakan', deactivate: 'Nyahaktifkan Akaun', activate: 'Aktifkan Akaun',
            resetPassword: 'Tetapkan Semula Kata Laluan',
            roleReqTitle: 'Permohonan Perubahan Peranan', roleReqEmpty: 'Tiada permohonan.',
            reqTo: 'Mohon jadi', approve: 'Lulus', reject: 'Tolak',
            reqPending: 'Menunggu', reqApproved: 'Diluluskan', reqRejected: 'Ditolak',
            confirmApprove: 'Luluskan permohonan ini? Peranan pengguna akan dikemas kini serta-merta.',
            confirmReject: 'Tolak permohonan ini?',
            tplAccess: 'Akses Rekaan', scopeAll: 'Semua rekaan', scopeWedding: 'Kad kahwin sahaja', scopeEvent: 'Acara sahaja',
            shareNote: 'Kongsi kata laluan sementara ini dengan pengguna. Mereka akan diminta menetapkan kata laluan baharu ketika masuk semula.',
            copyAria: 'Salin',
            couple: 'Pengantin', template: 'Rekaan', status: 'Status', views: 'Tontonan', edits: 'Suntingan', created: 'Dicipta',
            reference: 'Rujukan', details: 'Butiran', amount: 'Jumlah', date: 'Tarikh',
            profileTitle: 'Profil & Resit', receiptBranding: 'Jenama resit', brandOwn: 'Perniagaan sendiri', brandPlatform: 'Platform', noneFilled: 'Belum diisi', logoSet: 'Logo dimuat naik',
            terbit: 'Terbit', draf: 'Draf', paid: 'Berjaya', failed: 'Gagal', pending: 'Menunggu',
            confirmReset: (name: string) => `Tetapkan semula kata laluan untuk ${name}?`,
        },
        en: {
            backToUsers: 'Back to Users', noPhone: 'No phone',
            active: 'Active', inactive: 'Inactive', admin: 'Admin', since: 'Since',
            premium: 'Premium', free: 'Free',
            totalCards: 'Total cards', published: 'Published', rsvp: 'RSVP',
            userCards: "User's cards", payments: 'Payments',
            emptyCards: "User hasn't created any cards yet.", emptyPayments: 'No payment records.',
            actions: 'Actions', deactivate: 'Deactivate account', activate: 'Activate account',
            resetPassword: 'Reset password',
            roleReqTitle: 'Role change requests', roleReqEmpty: 'No requests.',
            reqTo: 'Requests', approve: 'Approve', reject: 'Reject',
            reqPending: 'Pending', reqApproved: 'Approved', reqRejected: 'Rejected',
            confirmApprove: "Approve this request? The user's role changes immediately.",
            confirmReject: 'Reject this request?',
            tplAccess: 'Template access', scopeAll: 'All templates', scopeWedding: 'Wedding only', scopeEvent: 'Events only',
            shareNote: "Share this temporary password with the user. They'll be asked to set a new password on their next login.",
            copyAria: 'Copy',
            couple: 'Couple', template: 'Template', status: 'Status', views: 'Views', edits: 'Edits', created: 'Created',
            reference: 'Reference', details: 'Details', amount: 'Amount', date: 'Date',
            profileTitle: 'Profile & Receipt', receiptBranding: 'Receipt branding', brandOwn: 'Own business', brandPlatform: 'Platform', noneFilled: 'Not filled', logoSet: 'Logo uploaded',
            terbit: 'Published', draf: 'Draft', paid: 'Paid', failed: 'Failed', pending: 'Pending',
            confirmImpersonate: (name: string) => `Log in as ${name}? You'll be taken to this user's workspace.`,
            confirmReset: (name: string) => `Reset password for ${name}?`,
        },
        zh: {
            backToUsers: '返回用户列表', noPhone: '无电话',
            active: '启用', inactive: '停用', admin: '管理员', since: '注册于',
            premium: '付费', free: '免费',
            totalCards: '请柬总数', published: '已发布', rsvp: '出席回复',
            userCards: '该用户的请柬', payments: '付款记录',
            emptyCards: '该用户尚未创建任何请柬。', emptyPayments: '暂无付款记录。',
            actions: '操作', deactivate: '停用账户', activate: '启用账户',
            resetPassword: '重置密码',
            roleReqTitle: '角色变更申请', roleReqEmpty: '暂无申请。',
            reqTo: '申请成为', approve: '批准', reject: '拒绝',
            reqPending: '待处理', reqApproved: '已批准', reqRejected: '已拒绝',
            confirmApprove: '批准此申请？用户角色将立即更新。',
            confirmReject: '拒绝此申请？',
            tplAccess: '模板权限', scopeAll: '全部模板', scopeWedding: '仅婚礼', scopeEvent: '仅活动',
            shareNote: '请将此临时密码交给用户。他们下次登录时会被要求设置新密码。',
            copyAria: '复制',
            couple: '新人', template: '设计', status: '状态', views: '浏览量', edits: '编辑次数', created: '创建时间',
            reference: '交易编号', details: '详情', amount: '金额', date: '日期',
            profileTitle: '资料与收据', receiptBranding: '收据品牌', brandOwn: '自己的商号', brandPlatform: '平台', noneFilled: '未填写', logoSet: '已上传标志',
            terbit: '已发布', draf: '草稿', paid: '已付款', failed: '失败', pending: '处理中',
            confirmReset: (name: string) => `确定重置 ${name} 的密码？`,
        },
    }, lang);

    const { id } = useParams<{ id: string }>();
    const [d, setD] = useState<Detail | null>(null);
    const [busy, setBusy] = useState<'' | 'toggle' | 'reset'>('');
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [reqBusy, setReqBusy] = useState<number>(0);

    useEffect(() => {
        api.get<Detail>(`/admin/users/${id}`).then((r) => setD(r.data));
    }, [id]);

    if (!d) return <div className="loading-screen"><div className="spinner" /></div>;
    const u = d.user;

    async function toggle() {
        setBusy('toggle');
        try {
            const r = await api.post(`/admin/users/${id}/toggle`);
            setD((prev) => (prev ? { ...prev, user: { ...prev.user, is_active: r.data.is_active } } : prev));
        } finally { setBusy(''); }
    }

    function setScope(scope: string) {
        setD((prev) => (prev ? { ...prev, user: { ...prev.user, template_scope: scope } } : prev));
        void api.post(`/admin/users/${id}/template-scope`, { template_scope: scope });
    }

    async function reviewRequest(reqId: number, action: 'approve' | 'reject') {
        const label = action === 'approve' ? C.confirmApprove : C.confirmReject;
        if (!(await dialog.confirm({ message: label, danger: action === 'reject' }))) return;
        setReqBusy(reqId);
        try {
            await api.post(`/admin/role-requests/${reqId}/${action}`);
            const r = await api.get<Detail>(`/admin/users/${id}`);
            setD(r.data);
        } finally { setReqBusy(0); }
    }

    async function resetPassword() {
        if (!(await dialog.confirm({ message: C.confirmReset(u.name), danger: true }))) return;
        setBusy('reset');
        try {
            const r = await api.post(`/admin/users/${id}/reset-password`);
            setTempPassword(r.data.temp_password);
            setCopied(false);
        } finally { setBusy(''); }
    }

    async function copyPassword() {
        if (!tempPassword) return;
        try {
            await navigator.clipboard.writeText(tempPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard unavailable — user can still copy manually */ }
    }

    const cardCols: Column<Card>[] = [
        { key: 'couple', label: C.couple, render: (c) => <strong>{c.bride_name} &amp; {c.groom_name}</strong> },
        { key: 'template_key', label: C.template, sortable: true, render: (c) => <span className="badge">{c.template_key}</span> },
        { key: 'status', label: C.status, sortable: true, render: (c) => statusBadge(c.status, { terbit: C.terbit, draf: C.draf }) },
        { key: 'views', label: C.views, align: 'right', sortable: true, sortValue: (c) => c.views + (c.trial_views ?? 0), render: (c) => c.views + (c.trial_views ?? 0) },
        { key: 'edit_count', label: C.edits, align: 'right', sortable: true, sortValue: (c) => c.edit_count ?? 0, render: (c) => c.edit_count ?? 0 },
        { key: 'created_at', label: C.created, sortable: true, sortValue: (c) => c.created_at ?? '', render: (c) => <span className="muted">{fmtDate(c.created_at)}</span> },
    ];

    const payCols: Column<Payment>[] = [
        { key: 'reference', label: C.reference, render: (p) => <code style={{ fontSize: 13 }}>{p.reference ?? `#${p.id}`}</code> },
        { key: 'description', label: C.details, render: (p) => p.description ?? p.plan ?? p.method ?? '—' },
        { key: 'amount', label: C.amount, align: 'right', sortable: true, sortValue: (p) => Number(p.amount ?? 0), render: (p) => fmtMoney(p.amount, p.currency) },
        { key: 'status', label: C.status, sortable: true, render: (p) => paymentBadge(p.status, { paid: C.paid, failed: C.failed, pending: C.pending }) },
        { key: 'created_at', label: C.date, sortable: true, sortValue: (p) => p.created_at ?? '', render: (p) => <span className="muted">{fmtDate(p.created_at)}</span> },
    ];

    return (
        <div>
            <Link to="/admin/users" className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
                <ArrowLeft size={15} /> {C.backToUsers}
            </Link>

            <div className="grid-side">
                <div className="stack" style={{ gap: 18 }}>
                    {/* Profile header */}
                    <div className="panel">
                        <div className="row" style={{ alignItems: 'center', gap: 16 }}>
                            <div style={avatar}>{initials(u.name)}</div>
                            <div style={{ minWidth: 0 }}>
                                <h1 style={{ margin: 0, fontSize: 26 }}>{u.name}</h1>
                                <div className="muted" style={{ fontSize: 14, wordBreak: 'break-all' }}>{u.email}</div>
                                <div className="muted" style={{ fontSize: 14 }}>{u.phone ?? C.noPhone}</div>
                                <div className="row wrap" style={{ marginTop: 10, gap: 8 }}>
                                    {planBadge(u.plan, { premium: C.premium, free: C.free })}
                                    {u.is_active
                                        ? <span className="badge badge-ok">{C.active}</span>
                                        : <span className="badge badge-bad">{C.inactive}</span>}
                                    {u.role === 'admin' && <span className="badge badge-gold">{C.admin}</span>}
                                    {u.created_at && <span className="badge">{C.since} {fmtDate(u.created_at)}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="stat-grid">
                        <Stat n={d.stats.cards} l={C.totalCards} icon={Mail} />
                        <Stat n={d.stats.published} l={C.published} icon={Send} />
                        <Stat n={d.stats.rsvps} l={C.rsvp} icon={MessageSquare} />
                    </div>

                    <div className="panel" style={{ padding: 16 }}>
                        <h3 style={{ margin: '4px 6px 12px' }}>{C.userCards}</h3>
                        <DataTable columns={cardCols} rows={d.cards} searchKeys={['bride_name', 'groom_name', 'template_key']} pageSize={8} empty={C.emptyCards} exportName="kad-pengguna" />
                    </div>

                    <div className="panel" style={{ padding: 16 }}>
                        <h3 style={{ margin: '4px 6px 12px' }}>{C.payments}</h3>
                        <DataTable columns={payCols} rows={d.payments} pageSize={8} empty={C.emptyPayments} exportName="pembayaran" />
                    </div>

                    {/* Role-change requests — a pending one is approved/rejected right here. */}
                    {(d.role_requests?.length ?? 0) > 0 && (
                        <div className="panel" style={{ padding: 16 }}>
                            <h3 style={{ margin: '4px 6px 12px' }}>{C.roleReqTitle}</h3>
                            <div style={{ display: 'grid', gap: 10 }}>
                                {d.role_requests!.map((rq) => (
                                    <div key={rq.id} className="spread" style={{ alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10 }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                {C.reqTo}: {rq.requested_role === 'vendor' ? 'Vendor' : 'Affiliate'}
                                                {reqStatusBadge(rq.status, { pending: C.reqPending, approved: C.reqApproved, rejected: C.reqRejected })}
                                            </div>
                                            {rq.note && <div className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{rq.note}</div>}
                                            {rq.created_at && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{fmtDate(rq.created_at)}</div>}
                                        </div>
                                        {rq.status === 'pending' && (
                                            <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                                                <button className="btn btn-primary btn-sm" disabled={reqBusy !== 0} onClick={() => void reviewRequest(rq.id, 'approve')}>{C.approve}</button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} disabled={reqBusy !== 0} onClick={() => void reviewRequest(rq.id, 'reject')}>{C.reject}</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Profile & receipt monitoring — the values this user filled per the
                        superadmin field definitions, plus their receipt-branding choice. */}
                    {(d.profile_fields?.length ?? 0) > 0 && (
                        <div className="panel" style={{ padding: 16 }}>
                            <div className="spread" style={{ margin: '4px 6px 12px', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>{C.profileTitle}</h3>
                                {(u.role === 'vendor' || u.role === 'affiliate') && (
                                    <span className={u.use_own_receipt_branding ? 'badge badge-gold' : 'badge'}>
                                        {C.receiptBranding}: {u.use_own_receipt_branding ? C.brandOwn : C.brandPlatform}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'grid', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                                {d.profile_fields!.map((f) => {
                                    const raw = f.key === 'company_name' ? u.company_name
                                        : f.key === 'company_logo' ? u.company_logo
                                        : u.profile_data?.[f.key];
                                    const val = f.key === 'company_logo'
                                        ? (raw ? C.logoSet : '')
                                        : (raw ?? '');
                                    return (
                                        <div key={f.key} className="spread" style={{ background: '#fff', padding: '9px 12px', gap: 12, fontSize: 13.5 }}>
                                            <span className="muted" style={{ flexShrink: 0 }}>{f.label}</span>
                                            <span style={{ textAlign: 'right', wordBreak: 'break-word', color: val ? 'var(--ink)' : 'var(--muted)' }}>
                                                {val || C.noneFilled}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions sidebar */}
                <div className="panel" style={{ position: 'sticky', top: 20 }}>
                    <h3 style={{ marginTop: 0 }}>{C.actions}</h3>
                    <div className="stack" style={{ gap: 10 }}>
                        <button className="btn btn-ghost btn-block" onClick={toggle} disabled={busy !== ''}>
                            <Power size={16} /> {u.is_active ? C.deactivate : C.activate}
                        </button>
                        <button className="btn btn-primary btn-block" onClick={resetPassword} disabled={busy !== ''}>
                            <KeyRound size={16} /> {C.resetPassword}
                        </button>
                    </div>

                    {/* Which template kinds this user may browse/use. */}
                    <div style={{ marginTop: 14 }}>
                        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>{C.tplAccess}</label>
                        <select
                            value={u.template_scope ?? 'all'}
                            onChange={(e) => setScope(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, background: '#fff', font: 'inherit', color: 'var(--ink)' }}
                        >
                            <option value="all">{C.scopeAll}</option>
                            <option value="wedding">{C.scopeWedding}</option>
                            <option value="event">{C.scopeEvent}</option>
                        </select>
                    </div>

                    {tempPassword && (
                        <div style={{ marginTop: 16, background: 'var(--cream)', border: '1px dashed var(--gold)', borderRadius: 12, padding: 14 }}>
                            <div className="spread" style={{ gap: 8 }}>
                                <code style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1, color: 'var(--plum)', wordBreak: 'break-all' }}>{tempPassword}</code>
                                <button className="btn btn-ghost btn-sm" onClick={copyPassword} aria-label={C.copyAria} style={{ flexShrink: 0 }}>
                                    {copied ? <Check size={15} /> : <Copy size={15} />}
                                </button>
                            </div>
                            <p className="muted" style={{ fontSize: 12, margin: '10px 0 0', lineHeight: 1.5 }}>
                                {C.shareNote}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Stat({ n, l, icon: Icon }: { n: number; l: string; icon: LucideIcon }) {
    return (
        <div className="stat">
            <div className="spread" style={{ alignItems: 'flex-start' }}>
                <div><div className="n">{n.toLocaleString('ms-MY')}</div><div className="l">{l}</div></div>
                <div style={statIcon}><Icon size={17} /></div>
            </div>
        </div>
    );
}

function statusBadge(status: string, labels: { terbit: string; draf: string }): ReactNode {
    return status === 'published'
        ? <span className="badge badge-ok">{labels.terbit}</span>
        : <span className="badge">{labels.draf}</span>;
}
function paymentBadge(status: string | null | undefined, labels: { paid: string; failed: string; pending: string }): ReactNode {
    const s = (status ?? '').toLowerCase();
    if (s === 'paid' || s === 'success' || s === 'completed') return <span className="badge badge-ok">{labels.paid}</span>;
    if (s === 'failed' || s === 'cancelled' || s === 'canceled') return <span className="badge badge-bad">{labels.failed}</span>;
    return <span className="badge">{status ?? labels.pending}</span>;
}
function planBadge(plan: string | null | undefined, labels: { premium: string; free: string }): ReactNode {
    if (plan === 'premium') return <span className="badge badge-gold">{labels.premium}</span>;
    return <span className="badge badge-free">{labels.free}</span>;
}
function reqStatusBadge(status: string, labels: { pending: string; approved: string; rejected: string }): ReactNode {
    if (status === 'approved') return <span className="badge badge-ok">{labels.approved}</span>;
    if (status === 'rejected') return <span className="badge badge-bad">{labels.rejected}</span>;
    return <span className="badge badge-gold">{labels.pending}</span>;
}
function initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}
function fmtDate(s?: string): string {
    if (!s) return '—';
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtMoney(amount?: number | string, currency?: string | null): string {
    if (amount === undefined || amount === null || amount === '') return '—';
    return `${currency ?? 'RM'}${Number(amount).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const avatar: React.CSSProperties = {
    width: 64, height: 64, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
    background: 'var(--plum)', color: '#fff', fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700,
};
const statIcon: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
