import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, Lock, Store, Handshake, Building2, Check, ArrowRight } from 'lucide-react';
import { useAuth, isStaff } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { AuthShell, Field, PasswordField } from '../components/AuthShell';

type Role = 'user' | 'vendor' | 'affiliate';

/** Pull the first human-readable message out of a Laravel validation / error response. */
function apiError(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
    const errors = e?.response?.data?.errors;
    if (errors) {
        const first = Object.values(errors)[0];
        if (first && first[0]) return first[0];
    }
    return e?.response?.data?.message ?? fallback;
}

export function Register() {
    const { register } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();
    const [params] = useSearchParams();
    const tpl = params.get('tpl');

    const [role, setRole] = useState<Role>('user');
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', company_name: '' });
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const C = {
        bm: {
            heading: 'Buka Akaun', sub: 'Pilih jenis akaun dan lengkapkan butiran anda',
            roleLabel: 'Daftar sebagai',
            userT: 'Pengguna', userD: 'Untuk pasangan yang ingin cipta kad kahwin sendiri. Beli rekaan yang disukai — tanpa langganan.',
            vendorT: 'Vendor', vendorD: 'Untuk perniagaan yang uruskan banyak kad pelanggan. Langganan bulanan.',
            affT: 'Affiliate', affD: 'Untuk ejen/reseller. Reka & jual; kad aktif 24 jam sehingga bayaran diterima.',
            name: 'Nama penuh', email: 'E-mel', phone: 'No. telefon', pass: 'Kata laluan',
            company: 'Nama syarikat', companyPh: 'Nama perniagaan anda (pilihan)',
            submit: 'Daftar sekarang', busy: 'Sedang mendaftar…',
            hasAcc: 'Sudah mempunyai akaun?', login: 'Masuk',
            err: 'Pendaftaran tidak berjaya. Sila semak maklumat anda.',
            show: 'Tunjuk kata laluan', hide: 'Sembunyi kata laluan',
        },
        en: {
            heading: 'Create your account', sub: 'Choose an account type and complete your details',
            roleLabel: 'Register as',
            userT: 'Normal User', userD: 'For couples creating their own wedding card. Buy the designs you love — no subscription.',
            vendorT: 'Vendor', vendorD: 'For businesses managing many client cards. Monthly subscription.',
            affT: 'Affiliate', affD: 'For agents/resellers. Design & sell; cards stay live for 24h until payment is received.',
            name: 'Full Name', email: 'Email', phone: 'Phone Number', pass: 'Password',
            company: 'Company name', companyPh: 'Your business name (optional)',
            submit: 'Sign Up Now', busy: 'Creating account…',
            hasAcc: 'Already have an account?', login: 'Log in',
            err: 'Registration failed. Please check your details.',
            show: 'Show password', hide: 'Hide password',
        },
    }[lang];

    const options: { key: Role; title: string; desc: string; icon: ReactNode }[] = [
        { key: 'user', title: C.userT, desc: C.userD, icon: <User size={19} /> },
        { key: 'vendor', title: C.vendorT, desc: C.vendorD, icon: <Store size={19} /> },
        { key: 'affiliate', title: C.affT, desc: C.affD, icon: <Handshake size={19} /> },
    ];

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            // Build as a plain object so extra role/company fields are always sent,
            // regardless of the register() param type.
            const payload = {
                name: form.name,
                email: form.email,
                phone: form.phone || undefined,
                password: form.password,
                role,
                company_name: role === 'user' ? undefined : form.company_name.trim() || undefined,
            };
            const user = await register(payload);
            if (user.status === 'pending') nav('/panel/pending', { replace: true });
            else if (isStaff(user)) nav('/admin', { replace: true });
            else nav(tpl ? `/panel?tpl=${tpl}` : '/panel', { replace: true });
        } catch (e: unknown) {
            setErr(apiError(e, C.err));
        } finally {
            setBusy(false);
        }
    }

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [k]: e.target.value });

    return (
        <AuthShell>
            <form onSubmit={submit}>
                <div className="ash-head">
                    <h1>{C.heading}</h1>
                    <p>{C.sub}</p>
                </div>

                {/* ---- Role picker: choose the kind of account up front ---- */}
                <div className="field">
                    <label>{C.roleLabel}</label>
                    <div role="radiogroup" aria-label={C.roleLabel} style={{ display: 'grid', gap: 8 }}>
                        {options.map((o) => {
                            const sel = role === o.key;
                            return (
                                <button
                                    type="button"
                                    key={o.key}
                                    role="radio"
                                    aria-checked={sel}
                                    onClick={() => setRole(o.key)}
                                    style={cardStyle(sel)}
                                >
                                    <span style={iconBox(sel)}>{o.icon}</span>
                                    <span style={{ minWidth: 0, flex: 1 }}>
                                        <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>
                                            {o.title}
                                        </span>
                                        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45, marginTop: 2 }}>
                                            {o.desc}
                                        </span>
                                    </span>
                                    {sel && <Check size={17} color="var(--plum)" style={{ flexShrink: 0, marginTop: 2 }} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Field
                    label={C.name}
                    icon={<User size={17} />}
                    value={form.name}
                    onChange={set('name')}
                    autoComplete="name"
                    required
                />

                <Field
                    label={C.email}
                    icon={<Mail size={17} />}
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    autoComplete="email"
                    required
                />

                <Field
                    label={C.phone}
                    icon={<Phone size={17} />}
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    autoComplete="tel"
                    placeholder="+60…"
                />

                {role !== 'user' && (
                    <Field
                        label={C.company}
                        icon={<Building2 size={17} />}
                        value={form.company_name}
                        onChange={set('company_name')}
                        autoComplete="organization"
                        placeholder={C.companyPh}
                    />
                )}

                <PasswordField
                    label={C.pass}
                    icon={<Lock size={17} />}
                    value={form.password}
                    onChange={set('password')}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    showLabel={C.show}
                    hideLabel={C.hide}
                />

                {err && <p className="form-err">{err}</p>}

                <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
                    {busy ? C.busy : <>{C.submit}<ArrowRight size={17} /></>}
                </button>

                <p className="ash-alt">
                    {C.hasAcc} <Link to="/login">{C.login}</Link>
                </p>
            </form>
        </AuthShell>
    );
}

/* ---- Inline styles for the role cards (app.css is off-limits) ---- */
const cardStyle = (sel: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left',
    padding: '12px 14px', borderRadius: 14, cursor: 'pointer', transition: '0.15s ease',
    border: `1.5px solid ${sel ? 'var(--plum)' : 'var(--line)'}`,
    background: sel ? 'var(--cream)' : '#fff',
    boxShadow: sel ? '0 0 0 3px rgba(74, 59, 196, 0.08)' : 'none',
});

const iconBox = (sel: boolean): React.CSSProperties => ({
    flex: '0 0 auto', width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center',
    background: sel ? 'var(--plum)' : 'var(--cream)', color: sel ? '#fff' : 'var(--plum)',
    transition: '0.15s ease',
});
