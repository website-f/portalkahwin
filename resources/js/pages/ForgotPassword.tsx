import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight, Copy, Check, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';
import { AuthShell, Field } from '../components/AuthShell';

type Step = 'email' | 'code' | 'done';

function errMsg(e: unknown, fallback: string): string {
    const r = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
    const first = r?.response?.data?.errors && Object.values(r.response.data.errors)[0]?.[0];
    return first ?? r?.response?.data?.message ?? fallback;
}

export function ForgotPassword() {
    const { lang } = useLang();
    const nav = useNavigate();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [temp, setTemp] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);

    const C = dict({
        bm: {
            heading: 'Lupa Kata Laluan',
            sub: 'Masukkan e-mel akaun anda dan kami akan hantar kod pengesahan.',
            email: 'E-mel',
            send: 'Hantar Kod', sending: 'Menghantar…',
            codeHeading: 'Masukkan Kod',
            codeSub: (e: string) => `Kami telah menghantar kod 6 digit ke ${e}. Kod ini sah selama 5 minit.`,
            code: 'Kod 6 digit',
            verify: 'Sahkan Kod', verifying: 'Menyemak…',
            resend: 'Hantar semula kod',
            expiresIn: (s: string) => `Kod tamat dalam ${s}`,
            expired: 'Kod telah tamat tempoh. Sila hantar semula.',
            doneHeading: 'Kata Laluan Sementara Anda',
            doneSub: 'Gunakan kata laluan ini untuk log masuk. Anda akan diminta menetapkan kata laluan baharu sebaik sahaja masuk.',
            copy: 'Salin', copied: 'Disalin',
            toLogin: 'Pergi ke Log Masuk',
            back: 'Kembali ke log masuk',
            errSend: 'Kod belum berjaya dihantar. Sila cuba lagi.',
            errVerify: 'Kod tidak sah. Sila semak semula.',
            note: 'Jika e-mel itu berdaftar dengan kami, kod akan tiba dalam beberapa minit. Semak folder spam juga.',
        },
        en: {
            heading: 'Forgot Password',
            sub: 'Enter your account email and we will send you a verification code.',
            email: 'Email',
            send: 'Send Code', sending: 'Sending…',
            codeHeading: 'Enter the Code',
            codeSub: (e: string) => `We sent a 6-digit code to ${e}. It is valid for 5 minutes.`,
            code: '6-digit code',
            verify: 'Verify Code', verifying: 'Checking…',
            resend: 'Resend code',
            expiresIn: (s: string) => `Code expires in ${s}`,
            expired: 'The code has expired. Please request a new one.',
            doneHeading: 'Your Temporary Password',
            doneSub: 'Use this to log in. You will be asked to set a new password as soon as you are in.',
            copy: 'Copy', copied: 'Copied',
            toLogin: 'Go to Log In',
            back: 'Back to log in',
            errSend: 'Could not send the code. Please try again.',
            errVerify: 'Invalid code. Please check and try again.',
            note: 'If that email is registered with us, the code will arrive within a few minutes. Check your spam folder too.',
        },
        zh: {
            heading: '忘记密码',
            sub: '请输入您的账户邮箱，我们将发送验证码。',
            email: '电子邮箱',
            send: '发送验证码', sending: '发送中…',
            codeHeading: '输入验证码',
            codeSub: (e: string) => `我们已将 6 位验证码发送至 ${e}，有效期为 5 分钟。`,
            code: '6 位验证码',
            verify: '验证', verifying: '验证中…',
            resend: '重新发送验证码',
            expiresIn: (s: string) => `验证码将在 ${s} 后失效`,
            expired: '验证码已失效，请重新获取。',
            doneHeading: '您的临时密码',
            doneSub: '请使用此密码登录。登录后系统会要求您设置新密码。',
            copy: '复制', copied: '已复制',
            toLogin: '前往登录',
            back: '返回登录',
            errSend: '验证码发送失败，请重试。',
            errVerify: '验证码无效，请重新检查。',
            note: '如果该邮箱已注册，验证码将在几分钟内送达。也请检查垃圾邮件文件夹。',
        },
    }, lang);

    // Visible countdown so "expires in 5 minutes" is a fact, not a promise.
    useEffect(() => {
        if (step !== 'code' || secondsLeft <= 0) return;
        const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearInterval(id);
    }, [step, secondsLeft]);

    const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

    async function sendCode(e?: React.FormEvent) {
        e?.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            const r = await api.post<{ expires_in_minutes: number }>('/password/forgot', { email });
            setSecondsLeft((r.data.expires_in_minutes ?? 5) * 60);
            setCode('');
            setStep('code');
        } catch (e2) {
            setErr(errMsg(e2, C.errSend));
        } finally {
            setBusy(false);
        }
    }

    async function verify(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            const r = await api.post<{ temp_password: string }>('/password/verify-code', { email, code });
            setTemp(r.data.temp_password);
            setStep('done');
        } catch (e2) {
            setErr(errMsg(e2, C.errVerify));
        } finally {
            setBusy(false);
        }
    }

    function copyTemp() {
        navigator.clipboard?.writeText(temp).then(
            () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
            },
            () => undefined,
        );
    }

    return (
        <AuthShell>
            {step === 'email' && (
                <form onSubmit={sendCode}>
                    <div className="ash-head">
                        <h1>{C.heading}</h1>
                        <p>{C.sub}</p>
                    </div>

                    <Field
                        label={C.email}
                        icon={<Mail size={17} />}
                        type="email"
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        autoComplete="email"
                        required
                        autoFocus
                    />

                    {err && <p className="form-err">{err}</p>}

                    <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
                        {busy ? C.sending : <>{C.send}<ArrowRight size={17} /></>}
                    </button>

                    <p className="ash-alt"><Link to="/login">{C.back}</Link></p>
                </form>
            )}

            {step === 'code' && (
                <form onSubmit={verify}>
                    <div className="ash-head">
                        <h1>{C.codeHeading}</h1>
                        <p>{C.codeSub(email)}</p>
                    </div>

                    <div className="field">
                        <label>{C.code}</label>
                        <input
                            value={code}
                            onChange={(ev) => setCode(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="000000"
                            required
                            autoFocus
                            style={{
                                textAlign: 'center',
                                fontSize: 26,
                                letterSpacing: 12,
                                fontWeight: 700,
                                fontFamily: 'var(--serif)',
                                paddingLeft: 12,
                            }}
                        />
                    </div>

                    <p className="muted" style={{ fontSize: 13, margin: '0 0 10px', textAlign: 'center' }}>
                        {secondsLeft > 0 ? C.expiresIn(mmss) : C.expired}
                    </p>

                    {err && <p className="form-err">{err}</p>}

                    <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
                        {busy ? C.verifying : <>{C.verify}<ShieldCheck size={17} /></>}
                    </button>

                    <p className="ash-alt">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => void sendCode()}
                            disabled={busy}
                        >
                            {C.resend}
                        </button>
                    </p>
                    <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.6 }}>{C.note}</p>
                </form>
            )}

            {step === 'done' && (
                <div>
                    <div className="ash-head">
                        <h1>{C.doneHeading}</h1>
                        <p>{C.doneSub}</p>
                    </div>

                    <div
                        style={{
                            background: 'var(--cream)',
                            border: '1px solid var(--gold-soft)',
                            borderRadius: 14,
                            padding: '18px 16px',
                            textAlign: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--gold)' }}>
                            <KeyRound size={22} />
                        </div>
                        <div
                            style={{
                                fontFamily: 'var(--serif)',
                                fontSize: 28,
                                letterSpacing: 3,
                                color: 'var(--plum)',
                                wordBreak: 'break-all',
                            }}
                        >
                            {temp}
                        </div>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={copyTemp}
                            style={{ marginTop: 12 }}
                        >
                            {copied ? <><Check size={14} /> {C.copied}</> : <><Copy size={14} /> {C.copy}</>}
                        </button>
                    </div>

                    <button className="btn btn-primary btn-block" onClick={() => nav('/login')}>
                        {C.toLogin}<ArrowRight size={17} />
                    </button>
                </div>
            )}
        </AuthShell>
    );
}
