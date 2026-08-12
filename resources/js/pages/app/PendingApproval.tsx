import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldCheck, RotateCw, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';

export function PendingApproval() {
    const { user, logout, refresh } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();
    const [checking, setChecking] = useState(false);

    // If approval lands (status flips away from pending), move them into the app.
    useEffect(() => {
        if (user && user.status && user.status !== 'pending') {
            nav(user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/panel', { replace: true });
        }
    }, [user, nav]);

    const C = dict({
        bm: {
            badge: 'Menunggu kelulusan',
            heading: 'Akaun anda sedang disemak',
            intro: 'Terima kasih kerana mendaftar. Pasukan PortalKahwin akan menghubungi anda tidak lama lagi untuk menguruskan pembayaran.',
            intro2: 'Sebaik sahaja pembayaran disahkan, kami akan mengaktifkan akaun anda dan menghantar e-mel pengesahan kepada anda.',
            name: 'Nama', type: 'Jenis akaun', company: 'Syarikat',
            emailNote: 'Tiada tindakan lanjut diperlukan buat masa ini — anda akan menerima e-mel sebaik sahaja akaun diaktifkan.',
            refresh: 'Semak semula', checking: 'Menyemak…', logout: 'Log Keluar',
        },
        en: {
            badge: 'Awaiting approval',
            heading: 'Your account is under review',
            intro: 'Thanks for signing up. The PortalKahwin team will contact you shortly to arrange payment.',
            intro2: 'Once your payment is confirmed, we will activate your account and send you a confirmation email.',
            name: 'Name', type: 'Account type', company: 'Company',
            emailNote: 'No further action is needed for now — you will get an email as soon as your account is active.',
            refresh: 'Refresh', checking: 'Checking…', logout: 'Log Out',
        },
        zh: {
            badge: '等待审批',
            heading: '您的账户正在审核中',
            intro: '感谢您的注册。PortalKahwin 团队将尽快与您联系以安排付款。',
            intro2: '付款确认后，我们会启用您的账户并发送确认邮件。',
            name: '姓名', type: '账户类型', company: '公司',
            emailNote: '目前无需任何操作 — 账户启用后我们会立即以邮件通知您。',
            refresh: '刷新', checking: '检查中…', logout: '退出登录',
        },
    }, lang);

    // Keyed by role, not by language — the roles are proper nouns everywhere but
    // "user", which is the only one worth translating.
    const roleLabel = {
        user: dict({ bm: 'Pengguna', en: 'Normal User', zh: '一般用户' }, lang),
        vendor: 'Vendor', affiliate: 'Affiliate', admin: 'Admin', superadmin: 'Superadmin',
    }[user?.role ?? 'user'];

    async function doLogout() {
        await logout();
        nav('/', { replace: true });
    }

    async function recheck() {
        setChecking(true);
        try {
            await refresh();
        } finally {
            setChecking(false);
        }
    }

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: '8px 0' }}>
            <div className="panel" style={{ width: 'min(520px, 100%)', textAlign: 'center' }}>
                <div style={iconWrap}>
                    <Clock size={26} color="var(--plum)" />
                </div>

                <span className="badge badge-gold" style={{ marginTop: 16 }}>
                    <Clock size={12} /> {C.badge}
                </span>

                <h2 style={{ margin: '12px 0 8px' }}>{C.heading}</h2>
                <p className="muted" style={{ margin: '0 0 6px', fontSize: 14.5, lineHeight: 1.55 }}>{C.intro}</p>
                <p className="muted" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55 }}>{C.intro2}</p>

                <div style={detailBox}>
                    <div className="spread">
                        <span className="muted" style={{ fontSize: 13 }}>{C.name}</span>
                        <strong style={{ fontSize: 14 }}>{user?.name}</strong>
                    </div>
                    <div className="spread">
                        <span className="muted" style={{ fontSize: 13 }}>{C.type}</span>
                        <span className="badge badge-gold">{roleLabel}</span>
                    </div>
                    {user?.company_name && (
                        <div className="spread">
                            <span className="muted" style={{ fontSize: 13 }}>{C.company}</span>
                            <strong style={{ fontSize: 14 }}>{user.company_name}</strong>
                        </div>
                    )}
                </div>

                <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'center', fontSize: 12.5, lineHeight: 1.5, margin: '0 0 18px' }}>
                    <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--ok)' }} />
                    <span>{C.emailNote}</span>
                </p>

                <div className="row" style={{ justifyContent: 'center' }}>
                    <button className="btn btn-ghost" onClick={doLogout}>
                        <LogOut size={16} /> {C.logout}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={recheck} disabled={checking} style={{ color: 'var(--muted)' }}>
                        <RotateCw size={15} /> {checking ? C.checking : C.refresh}
                    </button>
                </div>
            </div>
        </div>
    );
}

const iconWrap: React.CSSProperties = {
    width: 60, height: 60, borderRadius: 18, background: 'var(--cream)',
    display: 'grid', placeItems: 'center', margin: '0 auto',
};

const detailBox: React.CSSProperties = {
    display: 'grid', gap: 10, textAlign: 'left', background: 'var(--cream)',
    border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', margin: '18px 0',
};
