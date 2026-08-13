import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useLang, dict } from '../context/LangContext';
import { LangToggle } from './LangToggle';
import { MadeByPortalKahwin } from './MadeByPortalKahwin';
import { BrandLogo } from './BrandLogo';
import { SAMPLE_DATE_DOTTED } from '../templates/sampleData';

/* ------------------------------------------------------------------ *
 * Layout-scoped styles. app.css owns the design tokens + base classes
 * (.field .btn .form-err …); everything here is prefixed `ash-` so it
 * never collides. Kept inline because we may not touch app.css.
 * ------------------------------------------------------------------ */
const CSS = `
.ash { min-height: 100vh; display: grid; grid-template-columns: 1fr; background: var(--ivory); font-family: var(--font-sans); }
.ash-left { display: none; }
.ash-right { position: relative; display: flex; align-items: center; justify-content: center; padding: 44px 18px; }
@media (min-width: 900px) {
  .ash { grid-template-columns: 1.02fr 0.98fr; }
  .ash-left { display: flex; }
}

/* ---- Left branded panel (desktop only) ---- */
.ash-left {
  position: relative; overflow: hidden;
  flex-direction: column; align-items: center; justify-content: center;
  padding: 56px 48px;
  background: linear-gradient(157deg, var(--plum) 0%, var(--plum-deep) 100%);
  color: #fff;
}
.ash-left::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(620px 320px at 50% 10%, rgba(230, 211, 163, 0.16), transparent 70%);
}
.ash-flourish { position: absolute; width: 250px; height: 250px; color: var(--gold-soft); opacity: 0.16; pointer-events: none; }
.ash-flourish.tl { top: -26px; left: -30px; }
.ash-flourish.br { bottom: -26px; right: -30px; transform: rotate(180deg); }
.ash-left-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 34px; width: 100%; max-width: 360px; text-align: center; }

.ash-brand { font-family: var(--serif); font-weight: 700; font-size: 42px; line-height: 1; letter-spacing: 0.5px; color: #fff; }
.ash-brand span { color: var(--gold); }

.ash-mock { position: relative; width: 300px; max-width: 100%; color: var(--ink);
  background: linear-gradient(180deg, #fffdf9, var(--ivory)); border-radius: 14px;
  padding: 30px 26px 28px; box-shadow: 0 34px 72px -30px rgba(0, 0, 0, 0.6); }
.ash-mock::before { content: ''; position: absolute; inset: 9px; border: 1px solid rgba(201, 162, 75, 0.5); border-radius: 8px; pointer-events: none; }
.ash-mock > * { position: relative; }
.ash-mock-eyebrow { font-size: 10.5px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold); font-weight: 700; margin-bottom: 12px; }
.ash-mock-names { font-family: var(--serif); font-size: 34px; line-height: 1.08; color: var(--plum); margin: 0 0 6px; }
.ash-mock-div { display: flex; justify-content: center; margin: 12px 0; }
.ash-mock-date { font-family: var(--serif); font-size: 20px; letter-spacing: 3px; color: var(--ink); }
.ash-mock-save { margin-top: 10px; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); }

.ash-tagline { font-family: var(--serif); font-style: italic; font-size: 21px; line-height: 1.4; color: rgba(255, 255, 255, 0.92); }

/* ---- Right form panel ---- */
.ash-toggle { position: absolute; top: 20px; right: 20px; z-index: 5; }
.ash-card { width: min(430px, 100%); background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 40px 34px; box-shadow: var(--shadow); }
.ash-card-brand { display: none; justify-content: center; font-size: 27px; margin-bottom: 10px; }
.ash-head { text-align: center; margin-bottom: 24px; }
.ash-head h1 { font-size: 30px; margin: 0 0 6px; color: var(--ink); }
.ash-head p { margin: 0; color: var(--muted); font-size: 14.5px; }

.ash-inp { position: relative; display: flex; align-items: center; }
.ash-inp-ico { position: absolute; left: 13px; display: inline-flex; color: var(--muted); pointer-events: none; }
.ash-inp input { width: 100%; padding-left: 40px; }
.ash-pass input { padding-right: 46px; }
.ash-eye { position: absolute; right: 6px; display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; padding: 0; border: 0; background: transparent; color: var(--muted); cursor: pointer;
  border-radius: 8px; transition: 0.15s ease; }
.ash-eye:hover { color: var(--plum); background: var(--cream); }

.ash-alt { text-align: center; margin-top: 18px; font-size: 14px; color: var(--muted); }
.ash-alt a { color: var(--plum); font-weight: 600; }

@media (max-width: 899px) { .ash-card-brand { display: flex; } }
@media (max-width: 480px) {
  .ash-right { padding: 30px 16px; }
  .ash-card { border: 0; box-shadow: none; background: transparent; padding: 26px 4px; }
}
`;

/** Decorative gold vine — original inline SVG, used in both panel corners. */
function Flourish({ className }: { className: string }) {
    return (
        <svg className={className} viewBox="0 0 240 240" fill="none" aria-hidden="true">
            <path
                d="M12 232 C70 205 78 158 70 118 C64 86 84 60 120 50 C156 40 168 16 166 -6"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
            />
            <path d="M70 118 C44 112 30 122 24 142 C48 146 66 138 70 118 Z" fill="currentColor" />
            <path d="M70 118 C96 112 108 96 106 74 C82 82 70 98 70 118 Z" fill="currentColor" />
            <path d="M96 78 C74 74 62 84 58 102 C80 104 94 96 96 78 Z" fill="currentColor" />
            <path d="M120 50 C146 46 158 30 158 8 C134 14 122 30 120 50 Z" fill="currentColor" />
            <path d="M120 50 C98 46 86 56 82 74 C104 76 118 68 120 50 Z" fill="currentColor" />
            <circle cx="150" cy="34" r="3.2" fill="currentColor" />
            <circle cx="40" cy="150" r="3" fill="currentColor" />
            <circle cx="96" cy="92" r="2.6" fill="currentColor" />
        </svg>
    );
}

/** Floral divider inside the mini wedding-card mockup — original inline SVG. */
function CardDivider() {
    return (
        <svg width="128" height="18" viewBox="0 0 128 18" fill="none" aria-hidden="true">
            <path d="M4 9 H46" stroke="#c9a24b" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M82 9 H124" stroke="#c9a24b" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M64 2 C60 5 60 13 64 16 C68 13 68 5 64 2 Z" fill="#c9a24b" />
            <path d="M64 5.5 C61.5 8 61.5 10 64 12.5 C66.5 10 66.5 8 64 5.5 Z" fill="#fffdf9" />
            <circle cx="50" cy="9" r="1.6" fill="#c9a24b" />
            <circle cx="78" cy="9" r="1.6" fill="#c9a24b" />
        </svg>
    );
}

/* ---- Shared form field helpers (keep icon + eye-toggle markup DRY) ---- */

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; icon: ReactNode };

/** Labelled input with a leading lucide icon. */
export function Field({ label, icon, ...rest }: FieldProps) {
    return (
        <div className="field">
            <label>{label}</label>
            <div className="ash-inp">
                <span className="ash-inp-ico">{icon}</span>
                <input {...rest} />
            </div>
        </div>
    );
}

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    label: string;
    icon: ReactNode;
    showLabel: string;
    hideLabel: string;
};

/** Password input with a leading icon and an Eye/EyeOff show-hide toggle. */
export function PasswordField({ label, icon, showLabel, hideLabel, ...rest }: PasswordFieldProps) {
    const [show, setShow] = useState(false);
    return (
        <div className="field">
            <label>{label}</label>
            <div className="ash-inp ash-pass">
                <span className="ash-inp-ico">{icon}</span>
                <input type={show ? 'text' : 'password'} {...rest} />
                <button
                    type="button"
                    className="ash-eye"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? hideLabel : showLabel}
                >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );
}

/**
 * Two-sided auth layout: a branded wedding visual on the left (desktop ≥ 900px)
 * and the form card on the right. `children` is the full card content.
 */
export function AuthShell({ children }: { children: ReactNode }) {
    const { lang } = useLang();
    const C = dict({
        bm: { eyebrow: 'Walimatulurus', save: 'Simpan Tarikh', tagline: 'Jemputan digital yang disiapkan dengan rasa.' },
        en: { eyebrow: 'The Wedding Of', save: 'Save the Date', tagline: 'Digital wedding cards, made with heart.' },
        zh: { eyebrow: '婚宴', save: '敬请预留', tagline: '用心制作的数码婚礼请柬。' },
    }, lang);

    return (
        <div className="ash">
            <style>{CSS}</style>

            <aside className="ash-left">
                <Flourish className="ash-flourish tl" />
                <Flourish className="ash-flourish br" />
                <div className="ash-left-inner">
                    <Link to="/" className="ash-brand">
                        <BrandLogo height={44} plate />
                    </Link>

                    <div className="ash-mock">
                        <div className="ash-mock-eyebrow">{C.eyebrow}</div>
                        <div className="ash-mock-names">Adam &amp; Hawa</div>
                        <div className="ash-mock-div">
                            <CardDivider />
                        </div>
                        <div className="ash-mock-date">{SAMPLE_DATE_DOTTED}</div>
                        <div className="ash-mock-save">{C.save}</div>
                    </div>

                    <p className="ash-tagline">{C.tagline}</p>
                </div>
            </aside>

            <main className="ash-right">
                <div className="ash-toggle">
                    <LangToggle />
                </div>
                <div style={{ width: 'min(430px, 100%)' }}>
                    <div className="ash-card">
                        <Link to="/" className="brand ash-card-brand">
                            <BrandLogo height={38} />
                        </Link>
                        {children}
                    </div>
                    <MadeByPortalKahwin style={{ paddingTop: 20, paddingBottom: 0 }} />
                </div>
            </main>
        </div>
    );
}
