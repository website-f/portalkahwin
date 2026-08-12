import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth, isStaff } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { AuthShell, Field, PasswordField } from '../components/AuthShell';

export function Login() {
    const { login } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const C = {
        bm: {
            heading: 'Masuk ke Akaun', sub: 'Selamat kembali, sambung semula persiapan majlis anda',
            email: 'E-mel', pass: 'Kata laluan',
            submit: 'Masuk', busy: 'Sedang masuk…',
            noAcc: 'Belum mempunyai akaun?', reg: 'Daftar percuma',
            err: 'E-mel atau kata laluan tidak sepadan.',
            show: 'Tunjuk kata laluan', hide: 'Sembunyi kata laluan',
        },
        en: {
            heading: 'Log In', sub: 'Welcome back',
            email: 'Email', pass: 'Password',
            submit: 'Log in', busy: 'Signing in…',
            noAcc: "Don't have an account?", reg: 'Register here',
            err: 'Invalid email or password.',
            show: 'Show password', hide: 'Hide password',
        },
    }[lang];

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

                {err && <p className="form-err">{err}</p>}

                <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
                    {busy ? C.busy : <>{C.submit}<ArrowRight size={17} /></>}
                </button>

                <p className="ash-alt">
                    {C.noAcc} <Link to="/register">{C.reg}</Link>
                </p>
            </form>
        </AuthShell>
    );
}
