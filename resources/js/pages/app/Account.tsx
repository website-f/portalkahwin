import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User as UserIcon, Mail, Phone, Save, Check, Lock, Building2, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';

/**
 * Account details, shared by every signed-in role. Vendors and affiliates also
 * get their company name here; the richer branding editor (logo upload) stays on
 * the Company Profile page so this stays a short, obvious form.
 */
export function Account() {
    const { user, refresh } = useAuth();
    const { lang } = useLang();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [company, setCompany] = useState('');
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const isBusiness = user?.role === 'vendor' || user?.role === 'affiliate';

    useEffect(() => {
        if (!user) return;
        setName(user.name ?? '');
        setPhone(user.phone ?? '');
        setCompany(user.company_name ?? '');
    }, [user]);

    const C = dict({
        bm: {
            title: 'Profil Saya',
            subtitle: 'Kemas kini maklumat akaun anda.',
            name: 'Nama penuh',
            email: 'E-mel',
            emailNote: 'E-mel digunakan untuk log masuk dan tidak boleh diubah di sini. Hubungi sokongan jika perlu menukarnya.',
            phone: 'Nombor telefon',
            phonePlaceholder: 'cth. 012-3456789',
            company: 'Nama syarikat',
            save: 'Simpan Perubahan', saving: 'Menyimpan…', savedMsg: 'Perubahan disimpan',
            security: 'Keselamatan',
            changePassword: 'Tukar Kata Laluan',
            passwordBlurb: 'Tetapkan kata laluan baharu untuk akaun anda.',
            branding: 'Penjenamaan Syarikat',
            brandingBlurb: 'Muat naik logo dan tetapkan jenama yang dipaparkan pada kad tetamu anda.',
            brandingCta: 'Buka Profil Syarikat',
            role: 'Jenis akaun',
            err: 'Perubahan belum berjaya disimpan. Sila cuba lagi.',
        },
        en: {
            title: 'My Profile',
            subtitle: 'Update your account details.',
            name: 'Full name',
            email: 'Email',
            emailNote: 'Your email is used to log in and cannot be changed here. Contact support if you need it changed.',
            phone: 'Phone number',
            phonePlaceholder: 'e.g. 012-3456789',
            company: 'Company name',
            save: 'Save Changes', saving: 'Saving…', savedMsg: 'Changes saved',
            security: 'Security',
            changePassword: 'Change Password',
            passwordBlurb: 'Set a new password for your account.',
            branding: 'Company Branding',
            brandingBlurb: 'Upload a logo and set the branding shown on your guests’ cards.',
            brandingCta: 'Open Company Profile',
            role: 'Account type',
            err: 'Could not save your changes. Please try again.',
        },
        zh: {
            title: '我的资料',
            subtitle: '更新您的账户信息。',
            name: '姓名',
            email: '电子邮箱',
            emailNote: '邮箱用于登录，无法在此更改。如需修改请联系客服。',
            phone: '联系电话',
            phonePlaceholder: '例如 012-3456789',
            company: '公司名称',
            save: '保存更改', saving: '保存中…', savedMsg: '更改已保存',
            security: '安全设置',
            changePassword: '修改密码',
            passwordBlurb: '为您的账户设置新密码。',
            branding: '公司品牌',
            brandingBlurb: '上传标志并设置显示在宾客请柬上的品牌信息。',
            brandingCta: '打开公司资料',
            role: '账户类型',
            err: '保存失败，请重试。',
        },
    }, lang);

    const roleLabel = {
        user: dict({ bm: 'Pengguna', en: 'Normal User', zh: '一般用户' }, lang),
        vendor: 'Vendor', affiliate: 'Affiliate', admin: 'Admin', superadmin: 'Superadmin',
    }[user?.role ?? 'user'];

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        setSaved(false);
        try {
            await api.put('/me/profile', {
                name,
                phone: phone || null,
                ...(isBusiness ? { company_name: company || null } : null),
            });
            await refresh();
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2500);
        } catch {
            setErr(C.err);
        } finally {
            setBusy(false);
        }
    }

    if (!user) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-head" style={{ maxWidth: 620, margin: '0 auto 24px' }}>
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <div style={{ display: 'grid', gap: 18, maxWidth: 620, margin: '0 auto' }}>
                <form className="panel" onSubmit={save}>
                    <div className="field">
                        <label>{C.name}</label>
                        <div className="ash-inp">
                            <span className="ash-inp-ico"><UserIcon size={16} /></span>
                            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
                        </div>
                    </div>

                    <div className="field">
                        <label>{C.email}</label>
                        <div className="ash-inp">
                            <span className="ash-inp-ico"><Mail size={16} /></span>
                            <input value={user.email} readOnly disabled />
                        </div>
                        <p className="muted" style={{ fontSize: 12, margin: '6px 0 0', lineHeight: 1.5 }}>{C.emailNote}</p>
                    </div>

                    <div className="field">
                        <label>{C.phone}</label>
                        <div className="ash-inp">
                            <span className="ash-inp-ico"><Phone size={16} /></span>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder={C.phonePlaceholder}
                                maxLength={30}
                            />
                        </div>
                    </div>

                    {isBusiness && (
                        <div className="field">
                            <label>{C.company}</label>
                            <div className="ash-inp">
                                <span className="ash-inp-ico"><Building2 size={16} /></span>
                                <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={160} />
                            </div>
                        </div>
                    )}

                    <div className="field">
                        <label>{C.role}</label>
                        <div><span className="badge badge-gold">{roleLabel}</span></div>
                    </div>

                    {err && <p className="form-err">{err}</p>}

                    <button className="btn btn-primary" disabled={busy}>
                        {saved ? <><Check size={16} /> {C.savedMsg}</> : busy ? C.saving : <><Save size={16} /> {C.save}</>}
                    </button>
                </form>

                <div className="panel">
                    <h3 style={{ margin: '0 0 4px', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldCheck size={17} /> {C.security}
                    </h3>
                    <p className="muted" style={{ fontSize: 13.5, margin: '0 0 12px' }}>{C.passwordBlurb}</p>
                    <Link to="/panel/change-password" className="btn btn-ghost btn-sm">
                        <Lock size={15} /> {C.changePassword}
                    </Link>
                </div>

                {isBusiness && (
                    <div className="panel">
                        <h3 style={{ margin: '0 0 4px', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Building2 size={17} /> {C.branding}
                        </h3>
                        <p className="muted" style={{ fontSize: 13.5, margin: '0 0 12px' }}>{C.brandingBlurb}</p>
                        <Link to="/panel/profile" className="btn btn-ghost btn-sm">{C.brandingCta}</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
