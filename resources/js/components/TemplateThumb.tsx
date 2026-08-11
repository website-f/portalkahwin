interface Palette { primary?: string; secondary?: string; accent?: string; bg?: string; text?: string; }

const FALLBACK: Required<Palette> = { primary: '#5b3a2e', secondary: '#8a6d5f', accent: '#c9a24b', bg: '#f6efe6', text: '#4a3b33' };

/**
 * Thumbnail for a template card. Prefers a real cover screenshot (`thumbnail`, an
 * image URL captured from the live template) so every card looks like the actual
 * design; falls back to a palette-driven SVG cover when no image exists yet.
 */
export function TemplateThumb({ name, category, palette, thumbnail }: { name: string; category: string; palette?: Palette | null; thumbnail?: string | null }) {
    if (thumbnail) {
        return (
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0d0b12' }}>
                <img
                    src={thumbnail}
                    alt={name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                />
            </div>
        );
    }
    const p = { ...FALLBACK, ...(palette ?? {}) };
    const dark = isDark(p.bg);
    const line = p.accent;

    return (
        <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden',
            background: `radial-gradient(120% 90% at 50% 8%, ${hexA(p.accent, dark ? 0.16 : 0.12)}, ${p.bg} 62%)`,
            color: p.primary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '26px 20px', textAlign: 'center', fontFamily: 'var(--serif)',
        }}>
            <Motif category={category} c={line} />

            {/* double frame */}
            <div style={{ position: 'absolute', inset: 12, border: `1px solid ${hexA(line, 0.55)}`, borderRadius: 8, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 16, border: `1px solid ${hexA(line, 0.28)}`, borderRadius: 6, pointerEvents: 'none' }} />

            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: p.secondary, position: 'relative', zIndex: 1 }}>
                Walimatulurus
            </div>

            <div style={{ position: 'relative', zIndex: 1, margin: '12px 0' }}>
                <div style={{ fontSize: 27, lineHeight: 1.04, fontWeight: 600 }}>Danial</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', margin: '5px 0', color: p.secondary }}>
                    <span style={{ height: 1, width: 22, background: line, opacity: 0.6 }} />
                    <span style={{ color: line, fontSize: 15 }}>&amp;</span>
                    <span style={{ height: 1, width: 22, background: line, opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: 27, lineHeight: 1.04, fontWeight: 600 }}>Aisyah</div>
            </div>

            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: 2, color: p.secondary, position: 'relative', zIndex: 1 }}>
                12 · 12 · 2026
            </div>
            <div style={{
                position: 'absolute', bottom: 22, left: 0, right: 0, fontFamily: 'var(--font-sans)', fontSize: 9,
                letterSpacing: 1.5, textTransform: 'capitalize', color: hexA(p.secondary, 0.9),
            }}>
                {category} · {name}
            </div>
        </div>
    );
}

/** Category-specific ornament so each template reads distinct at a glance. */
function Motif({ category, c }: { category: string; c: string }) {
    const wrap: React.CSSProperties = { position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', opacity: 0.9 };
    switch (category) {
        case 'floral':
            return <svg width="60" height="30" viewBox="0 0 60 30" style={wrap}>
                <path d="M8 24 Q20 6 30 20 Q40 6 52 24" fill="none" stroke={c} strokeWidth="1.2" />
                {[14, 30, 46].map((x, i) => <circle key={i} cx={x} cy={i === 1 ? 18 : 20} r="3.2" fill={hexA(c, 0.85)} />)}
                {[10, 22, 38, 50].map((x, i) => <ellipse key={i} cx={x} cy="22" rx="2.6" ry="1.1" fill="#7fa06b" transform={`rotate(${i % 2 ? 25 : -25} ${x} 22)`} />)}
            </svg>;
        case 'songket':
        case 'batik':
            return <svg width="64" height="24" viewBox="0 0 64 24" style={wrap}>
                {[8, 24, 40, 56].map((x, i) => <g key={i}><path d={`M${x} 4 L${x + 6} 12 L${x} 20 L${x - 6} 12 Z`} fill="none" stroke={c} strokeWidth="1" /><circle cx={x} cy="12" r="1.6" fill={c} /></g>)}
            </svg>;
        case 'khat':
            return <svg width="34" height="34" viewBox="0 0 34 34" style={wrap}>
                <g fill="none" stroke={c} strokeWidth="1.2">
                    <rect x="7" y="7" width="20" height="20" transform="rotate(45 17 17)" />
                    <rect x="7" y="7" width="20" height="20" />
                </g><circle cx="17" cy="17" r="2" fill={c} />
            </svg>;
        case 'motion':
            return <svg width="60" height="26" viewBox="0 0 60 26" style={wrap}>
                <path d="M6 2 Q6 16 12 24 M18 2 Q18 14 22 22 M54 2 Q54 16 48 24 M42 2 Q42 14 38 22" fill="none" stroke={c} strokeWidth="1.1" opacity="0.8" />
                <path d="M2 2 H58" stroke={c} strokeWidth="1.4" />
            </svg>;
        default: // modern / anything
            return <svg width="54" height="16" viewBox="0 0 54 16" style={wrap}>
                <line x1="4" y1="8" x2="22" y2="8" stroke={c} strokeWidth="1.2" />
                <line x1="32" y1="8" x2="50" y2="8" stroke={c} strokeWidth="1.2" />
                <circle cx="27" cy="8" r="3" fill="none" stroke={c} strokeWidth="1.2" />
            </svg>;
    }
}

function hexA(hex: string, a: number): string {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return hex;
    return `rgba(${r},${g},${b},${a})`;
}
function isDark(hex: string): boolean {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return false;
    return (r * 0.299 + g * 0.587 + b * 0.114) < 120;
}
