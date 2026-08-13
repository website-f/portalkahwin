import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLang, LANGS, type Lang } from '../context/LangContext';
import { BrandLogo } from './BrandLogo';

/**
 * First-visit language chooser.
 *
 * Shown once, before anything else, so a visitor never has to read a page in the
 * wrong language to find the switcher. The choice is written to a cookie (and
 * localStorage), so it survives across the whole site and is readable by the
 * server later if we ever want to render the first paint already translated.
 */
export function LanguageGate() {
    const { chosen, setLang } = useLang();

    const FLAVOUR: Record<Lang, { native: string; sub: string }> = {
        bm: { native: 'Bahasa Melayu', sub: 'Teruskan dalam Bahasa Melayu' },
        en: { native: 'English', sub: 'Continue in English' },
        zh: { native: '中文', sub: '以中文继续' },
    };

    return (
        <AnimatePresence>
            {!chosen && (
                <motion.div
                    key="lang-gate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={backdrop}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Choose your language"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 22, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        style={panel}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                            <BrandLogo height={38} />
                        </div>

                        <h2 style={heading}>Pilih Bahasa · Choose Language · 选择语言</h2>

                        <div style={grid}>
                            {LANGS.map((l, i) => (
                                <motion.button
                                    key={l.id}
                                    type="button"
                                    onClick={() => setLang(l.id)}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
                                    whileHover={{ y: -3 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="lang-gate-card"
                                >
                                    <span className="lang-gate-code">{l.short}</span>
                                    <span className="lang-gate-native">{FLAVOUR[l.id].native}</span>
                                    <span className="lang-gate-sub">{FLAVOUR[l.id].sub}</span>
                                    <span className="lang-gate-tick"><Check size={14} /></span>
                                </motion.button>
                            ))}
                        </div>

                        <p style={footnote}>
                            Anda boleh menukarnya bila-bila masa · You can change this anytime · 可随时更改
                        </p>
                    </motion.div>

                    <style>{GATE_CSS}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

const backdrop: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    display: 'grid', placeItems: 'center', padding: 20,
    background: 'rgba(35, 25, 40, 0.55)', backdropFilter: 'blur(8px)',
};

const panel: React.CSSProperties = {
    width: 'min(560px, 100%)',
    background: '#fff', borderRadius: 22, padding: '30px 26px 24px',
    boxShadow: '0 40px 90px -30px rgba(0,0,0,0.5)', textAlign: 'center',
};

const heading: React.CSSProperties = {
    margin: '0 0 20px', fontSize: 17, fontWeight: 600, color: 'var(--muted)',
    letterSpacing: 0.2, lineHeight: 1.5,
};

const grid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12,
};

const footnote: React.CSSProperties = {
    margin: '18px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6,
};

const GATE_CSS = `
.lang-gate-card {
    position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 20px 14px 18px; cursor: pointer; text-align: center;
    border: 1.5px solid var(--line); border-radius: 16px; background: #fff;
    transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
}
.lang-gate-card:hover { border-color: var(--gold); background: var(--cream); box-shadow: 0 14px 30px -18px rgba(0,0,0,.35); }
.lang-gate-code { font-family: var(--serif); font-size: 26px; font-weight: 700; color: var(--plum); line-height: 1.1; }
.lang-gate-native { font-size: 14px; font-weight: 600; color: var(--ink); }
.lang-gate-sub { font-size: 11.5px; color: var(--muted); }
.lang-gate-tick {
    position: absolute; top: 10px; right: 10px; opacity: 0;
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 999px; background: var(--gold); color: #241a06;
    transition: opacity .18s ease;
}
.lang-gate-card:hover .lang-gate-tick { opacity: 1; }
`;
