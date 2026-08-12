import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldAlert, KeyRound, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth, isStaff } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';

/** Pull a human-readable message out of a Laravel validation / error response. */
function apiError(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
    const errors = e?.response?.data?.errors;
    if (errors) {
        const first = Object.values(errors)[0];
        if (first && first[0]) return first[0];
    }
    return e?.response?.data?.message ?? fallback;
}

export function ChangePassword() {
    const { user, refresh } = useAuth();
    const nav = useNavigate();

    const [pw, setPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { lang } = useLang();
    const C = ({
        bm: {
            changeFailed: 'Kata laluan belum berjaya ditukar. Sila cuba sekali lagi.',
            tooShort: 'Kata laluan perlu sekurang-kurangnya 6 aksara.',
            mismatch: 'Pengesahan kata laluan tidak sepadan.',
            setNewTitle: 'Tetapkan Kata Laluan Baharu',
            changeTitle: 'Tukar Kata Laluan',
            forcedNotice: 'Kata laluan anda telah ditetapkan semula oleh admin. Sila tetapkan kata laluan baharu sebelum meneruskan.',
            enterNew: 'Masukkan kata laluan baharu untuk akaun anda.',
            newPassword: 'Kata laluan baharu',
            atLeast6: 'Sekurang-kurangnya 6 aksara',
            showPw: 'Papar kata laluan',
            hidePw: 'Sembunyi kata laluan',
            confirmPassword: 'Sahkan kata laluan',
            reenter: 'Masukkan semula kata laluan',
            saving: 'Menyimpan…',
            savePassword: 'Simpan Kata Laluan',
        },
        en: {
            changeFailed: 'Failed to change password. Please try again.',
            tooShort: 'Password must be at least 6 characters.',
            mismatch: 'Passwords do not match.',
            setNewTitle: 'Set a new password',
            changeTitle: 'Change password',
            forcedNotice: 'Your password was reset by an admin. Please set a new password.',
            enterNew: 'Enter a new password for your account.',
            newPassword: 'New password',
            atLeast6: 'At least 6 characters',
            showPw: 'Show password',
            hidePw: 'Hide password',
            confirmPassword: 'Confirm password',
            reenter: 'Re-enter password',
            saving: 'Saving…',
            savePassword: 'Save password',
        },
    })[lang];

    const forced = user?.must_change_password === true;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (pw.length < 6) {
            setError(C.tooShort);
            return;
        }
        if (pw !== confirm) {
            setError(C.mismatch);
            return;
        }

        setBusy(true);
        try {
            await api.post('/change-password', {
                new_password: pw,
                new_password_confirmation: confirm,
            });
            await refresh();
            nav(isStaff(user) ? '/admin' : '/panel');
        } catch (err: unknown) {
            setError(apiError(err, C.changeFailed));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: '8px 0' }}>
            <div className="auth-card">
                <div style={iconWrap}>
                    {forced ? <ShieldAlert size={24} color="var(--plum)" /> : <KeyRound size={24} color="var(--plum)" />}
                </div>

                <h2 style={{ margin: '16px 0 6px', textAlign: 'center' }}>
                    {forced ? C.setNewTitle : C.changeTitle}
                </h2>

                {forced ? (
                    <p style={notice}>
                        <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{C.forcedNotice}</span>
                    </p>
                ) : (
                    <p className="muted center" style={{ margin: '0 0 20px', fontSize: 14 }}>
                        {C.enterNew}
                    </p>
                )}

                <form onSubmit={submit}>
                    <div className="field">
                        <label>{C.newPassword}</label>
                        <div style={pwWrap}>
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                                autoComplete="new-password"
                                placeholder={C.atLeast6}
                                style={{ width: '100%', paddingRight: 42 }}
                                required
                            />
                            <button type="button" style={eyeBtn} onClick={() => setShowPw((s) => !s)} aria-label={showPw ? C.hidePw : C.showPw}>
                                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    <div className="field">
                        <label>{C.confirmPassword}</label>
                        <div style={pwWrap}>
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                autoComplete="new-password"
                                placeholder={C.reenter}
                                style={{ width: '100%', paddingRight: 42 }}
                                required
                            />
                            <button type="button" style={eyeBtn} onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? C.hidePw : C.showPw}>
                                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    {error && <p className="form-err">{error}</p>}

                    <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} disabled={busy}>
                        {busy ? <Lock size={16} /> : <Check size={16} />} {busy ? C.saving : C.savePassword}
                    </button>
                </form>
            </div>
        </div>
    );
}

const iconWrap: React.CSSProperties = {
    width: 56, height: 56, borderRadius: 16, background: 'var(--cream)',
    display: 'grid', placeItems: 'center', margin: '0 auto',
};
const notice: React.CSSProperties = {
    display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fbf1d8', color: '#8a6a1e',
    border: '1px solid var(--gold-soft)', borderRadius: 12, padding: '12px 14px',
    fontSize: 13, lineHeight: 1.5, margin: '0 0 20px',
};
const pwWrap: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: 6, background: 'transparent', border: 0, cursor: 'pointer',
    color: 'var(--muted)', padding: 8, display: 'grid', placeItems: 'center',
};
