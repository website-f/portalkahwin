import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, Power, UserCog, KeyRound, Copy, Check,
    Mail, Send, MessageSquare, type LucideIcon,
} from 'lucide-react';
import { api, setToken } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

interface UserRow {
    id: number; name: string; email: string; phone?: string | null;
    role: string; plan?: string | null; is_active: boolean; created_at?: string;
}
interface Card {
    id: string | number; bride_name: string; groom_name: string;
    template_key: string; status: string; views: number; created_at?: string;
}
interface Payment {
    id: string | number; amount?: number | string; currency?: string | null;
    status?: string | null; method?: string | null; reference?: string | null;
    description?: string | null; plan?: string | null; created_at?: string;
}
interface Detail {
    user: UserRow;
    stats: { cards: number; published: number; rsvps: number };
    cards: Card[];
    payments: Payment[];
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
            loginAs: 'Masuk sebagai', resetPassword: 'Tetapkan Semula Kata Laluan',
            shareNote: 'Kongsi kata laluan sementara ini dengan pengguna. Mereka akan diminta menetapkan kata laluan baharu ketika masuk semula.',
            copyAria: 'Salin',
            couple: 'Pengantin', template: 'Rekaan', status: 'Status', views: 'Tontonan', created: 'Dicipta',
            reference: 'Rujukan', details: 'Butiran', amount: 'Jumlah', date: 'Tarikh',
            terbit: 'Terbit', draf: 'Draf', paid: 'Berjaya', failed: 'Gagal', pending: 'Menunggu',
            confirmImpersonate: (name: string) => `Masuk sebagai ${name}? Anda akan dibawa ke ruang kerja pengguna ini.`,
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
            loginAs: 'Log in as', resetPassword: 'Reset password',
            shareNote: "Share this temporary password with the user. They'll be asked to set a new password on their next login.",
            copyAria: 'Copy',
            couple: 'Couple', template: 'Template', status: 'Status', views: 'Views', created: 'Created',
            reference: 'Reference', details: 'Details', amount: 'Amount', date: 'Date',
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
            loginAs: '以此用户身份登录', resetPassword: '重置密码',
            shareNote: '请将此临时密码交给用户。他们下次登录时会被要求设置新密码。',
            copyAria: '复制',
            couple: '新人', template: '设计', status: '状态', views: '浏览量', created: '创建时间',
            reference: '交易编号', details: '详情', amount: '金额', date: '日期',
            terbit: '已发布', draf: '草稿', paid: '已付款', failed: '失败', pending: '处理中',
            confirmImpersonate: (name: string) => `以 ${name} 的身份登录？您将进入该用户的工作台。`,
            confirmReset: (name: string) => `确定重置 ${name} 的密码？`,
        },
    }, lang);

    const { id } = useParams<{ id: string }>();
    const [d, setD] = useState<Detail | null>(null);
    const [busy, setBusy] = useState<'' | 'toggle' | 'impersonate' | 'reset'>('');
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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

    async function impersonate() {
        if (!(await dialog.confirm({ message: C.confirmImpersonate(u.name) }))) return;
        setBusy('impersonate');
        try {
            const r = await api.post(`/admin/users/${id}/impersonate`);
            setToken(r.data.token);
            window.location.href = '/panel';
        } catch { setBusy(''); }
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
        { key: 'views', label: C.views, align: 'right', sortable: true, sortValue: (c) => c.views },
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
                </div>

                {/* Actions sidebar */}
                <div className="panel" style={{ position: 'sticky', top: 20 }}>
                    <h3 style={{ marginTop: 0 }}>{C.actions}</h3>
                    <div className="stack" style={{ gap: 10 }}>
                        <button className="btn btn-ghost btn-block" onClick={toggle} disabled={busy !== ''}>
                            <Power size={16} /> {u.is_active ? C.deactivate : C.activate}
                        </button>
                        {u.role !== 'admin' && (
                            <button className="btn btn-ghost btn-block" onClick={impersonate} disabled={busy !== ''}>
                                <UserCog size={16} /> {C.loginAs}
                            </button>
                        )}
                        <button className="btn btn-primary btn-block" onClick={resetPassword} disabled={busy !== ''}>
                            <KeyRound size={16} /> {C.resetPassword}
                        </button>
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
function initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}
function fmtDate(s?: string): string {
    if (!s) return '—';
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
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
