import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { AuthShell, Field, PasswordField } from '../components/AuthShell';

export function Register() {
    const { register } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();
    const [params] = useSearchParams();
    const tpl = params.get('tpl');
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const C = {
        bm: {
            heading: 'Buka Akaun Percuma', sub: 'Mula hasilkan kad kahwin digital anda',
            name: 'Nama penuh', email: 'E-mel', phone: 'No. telefon', pass: 'Kata laluan',
            submit: 'Daftar sekarang', busy: 'Sedang mendaftar…',
            hasAcc: 'Sudah mempunyai akaun?', login: 'Masuk',
            err: 'Pendaftaran tidak berjaya. Sila semak maklumat anda.',
            show: 'Tunjuk kata laluan', hide: 'Sembunyi kata laluan',
        },
        en: {
            heading: 'Create a Free Account', sub: 'Start creating your digital wedding cards',
            name: 'Full Name', email: 'Email', phone: 'Phone Number', pass: 'Password',
            submit: 'Sign Up Now', busy: 'Creating account…',
            hasAcc: 'Already have an account?', login: 'Log in',
            err: 'Registration failed. Please check your details.',
            show: 'Show password', hide: 'Hide password',
        },
    }[lang];

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            await register(form);
            nav(tpl ? `/app?tpl=${tpl}` : '/app', { replace: true });
        } catch (e: unknown) {
            // Narrow the axios-style error shape without resorting to `any`.
            const apiErr = e as { response?: { data?: { errors?: { email?: string[] } } } };
            setErr(apiErr?.response?.data?.errors?.email?.[0] || C.err);
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

                <Field
                    label={C.name}
                    icon={<User size={17} />}
                    value={form.name}
                    onChange={set('name')}
                    autoComplete="name"
                    required
                    autoFocus
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
