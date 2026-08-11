interface Palette { primary?: string; secondary?: string; accent?: string; bg?: string; text?: string; }

const FALLBACK: Required<Palette> = { primary: '#5b3a2e', secondary: '#8a6d5f', accent: '#c9a24b', bg: '#f6efe6', text: '#4a3b33' };

/** A clean, always-legible themed cover preview derived from a template's palette. */
export function TemplateThumb({ name, category, palette }: { name: string; category: string; palette?: Palette | null }) {
    const p = { ...FALLBACK, ...(palette ?? {}) };
    return (
        <div style={{
            position: 'absolute', inset: 0, background: p.bg, color: p.primary,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '22px 18px', textAlign: 'center', fontFamily: 'var(--serif)', overflow: 'hidden',
        }}>
            {/* corner flourishes */}
            <Corner style={{ top: 10, left: 10 }} c={p.accent} />
            <Corner style={{ top: 10, right: 10, transform: 'scaleX(-1)' }} c={p.accent} />
            <Corner style={{ bottom: 10, left: 10, transform: 'scaleY(-1)' }} c={p.accent} />
            <Corner style={{ bottom: 10, right: 10, transform: 'scale(-1)' }} c={p.accent} />

            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: p.secondary, opacity: 0.85 }}>
                Walimatulurus
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.05, margin: '10px 0 4px', fontWeight: 600 }}>Danial</div>
            <div style={{ fontSize: 18, color: p.accent }}>&amp;</div>
            <div style={{ fontSize: 30, lineHeight: 1.05, margin: '4px 0 12px', fontWeight: 600 }}>Aisyah</div>
            <div style={{ width: 46, height: 1, background: p.accent, opacity: 0.7 }} />
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: 1, color: p.secondary, marginTop: 12, textTransform: 'capitalize' }}>
                {category} · {name}
            </div>
        </div>
    );
}

function Corner({ style, c }: { style: React.CSSProperties; c: string }) {
    return (
        <svg width="34" height="34" viewBox="0 0 34 34" style={{ position: 'absolute', opacity: 0.6, ...style }}>
            <path d="M2 32 C2 14 14 2 32 2" fill="none" stroke={c} strokeWidth="1.4" />
            <circle cx="6" cy="28" r="2.2" fill={c} />
        </svg>
    );
}
