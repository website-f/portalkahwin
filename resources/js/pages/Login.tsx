import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth, isStaff } from '../context/AuthContext';
import { useLang, dict } from '../context/LangContext';
import { AuthShell, Field, PasswordField } from '../components/AuthShell';
import { GoogleButton } from '../components/GoogleButton';
import { setToken } from '../lib/api';

const GOOGLE_ERRORS = {
    bm: {
        generic: 'Log masuk Google tidak berjaya. Sila cuba lagi.',
        google_cancelled: 'Log masuk Google dibatalkan.',
        google_not_configured: 'Log masuk Google belum dikonfigurasi.',
        google_unverified: 'E-mel Google anda belum disahkan oleh Google.',
        account_disabled: 'Akaun ini telah dinyahaktifkan.',
    } as Record<string, string>,
    en: {
        generic: 'Google sign-in failed. Please try again.',
        google_cancelled: 'Google sign-in was cancelled.',
        google_not_configured: 'Google sign-in is not configured yet.',
        google_unverified: 'Your Google email is not verified by Google.',
        account_disabled: 'This account has been deactivated.',
    } as Record<string, string>,
    zh: {
        generic: 'Google 登录失败，请重试。',
        google_cancelled: '已取消 Google 登录。',
        google_not_configured: 'Google 登录尚未配置。',
        google_unverified: '您的 Google 邮箱尚未通过验证。',
        account_disabled: '此账户已被停用。',
    } as Record<string, string>,
};

export function Login() {
    const { login, refresh, user } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [params] = useSearchParams();

    const C = dict({
        bm: {
            heading: 'Masuk ke Akaun', sub: 'Selamat kembali, sambung semula persiapan majlis anda',
            email: 'E-mel', pass: 'Kata laluan',
            submit: 'Masuk', busy: 'Sedang masuk…',
            noAcc: 'Belum mempunyai akaun?', reg: 'Daftar percuma',
            err: 'E-mel atau kata laluan tidak sepadan.',
            show: 'Tunjuk kata laluan', hide: 'Sembunyi kata laluan',
            forgot: 'Lupa kata laluan?',
        },
        en: {
            heading: 'Log In', sub: 'Welcome back',
            email: 'Email', pass: 'Password',
            submit: 'Log in', busy: 'Signing in…',
            noAcc: "Don't have an account?", reg: 'Register here',
            err: 'Invalid email or password.',
            show: 'Show password', hide: 'Hide password',
            forgot: 'Forgot password?',
        },
        zh: {
            heading: '登录账户', sub: '欢迎回来，继续筹备您的婚礼',
            email: '电子邮箱', pass: '密码',
            submit: '登录', busy: '登录中…',
            noAcc: '还没有账户？', reg: '免费注册',
            err: '邮箱或密码不正确。',
            show: '显示密码', hide: '隐藏密码',
            forgot: '忘记密码？',
        },
    }, lang);

    // Google sends us back to /login#token=… — a fragment, so the token never
    // reaches a server log or a Referer header. Consume it, clear it from the
    // address bar, then load the session.
    useEffect(() => {
        const hash = window.location.hash;
        if (!hash.startsWith('#token=')) return;
        const token = decodeURIComponent(hash.slice('#token='.length));
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        setToken(token);
        setBusy(true);
        refresh().finally(() => setBusy(false));
    }, [refresh]);

    // Once refresh() has populated the user, route them to the right panel.
    useEffect(() => {
        if (user) nav(isStaff(user) ? '/admin' : '/panel', { replace: true });
    }, [user, nav]);

    // Google bounced the sign-in (cancelled, misconfigured, disabled account…).
    useEffect(() => {
        const code = params.get('auth_error');
        if (code) setErr(dict(GOOGLE_ERRORS, lang)[code] ?? dict(GOOGLE_ERRORS, lang).generic);
    }, [params, lang]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            const user = await login(email, password);
            nav(isStaff(user) ? '/admin' : '/panel', { replace: true });
        } catch {
            setErr(C.err);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell>
            <form onSubmit={submit}>
                <div className="ash-head">
                    <h1>{C.heading}</h1>
                    <p>{C.sub}</p>
                </div>

                <Field
                    label={C.email}
                    icon={<Mail size={17} />}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                />

                <PasswordField
                    label={C.pass}
                    icon={<Lock size={17} />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    showLabel={C.show}
                    hideLabel={C.hide}
                />

                <p style={{ textAlign: 'right', margin: '-6px 0 12px' }}>
                    <Link to="/forgot-password" style={{ fontSize: 13.5, color: 'var(--plum)', fontWeight: 600 }}>
                        {C.forgot}
                    </Link>
                </p>

                {err && <p className="form-err">{err}</p>}

                <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
                    {busy ? C.busy : <>{C.submit}<ArrowRight size={17} /></>}
                </button>

                <GoogleButton />

                <p className="ash-alt">
                    {C.noAcc} <Link to="/register">{C.reg}</Link>
                </p>
            </form>
        </AuthShell>
    );
}
