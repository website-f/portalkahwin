import { type CSSProperties } from 'react';

/**
 * The doa / prayer block, shown on a wedding card just before the countdown.
 *
 * Shared by every template so the couple's prayer reads consistently while still
 * following each design's palette + fonts. It is a fixed (non-movable) block —
 * deliberately NOT wrapped in <PkSec> — so the section-reorder machinery leaves
 * it exactly where each template renders it (between the couple block and the
 * countdown). The host hides it with the `prayer` section toggle, which nulls
 * `data.prayer` server-side, so a falsy value renders nothing.
 *
 * Lines beginning with "#" (e.g. a couple hashtag) are lifted out and shown in
 * the accent colour beneath the prayer.
 */
export function PrayerSection({
    text,
    primary,
    accent,
    secondary,
    serif,
    background,
    maxWidth = 600,
}: {
    text?: string | null;
    /** Prayer ink. */
    primary: string;
    /** Divider + hashtag colour. */
    accent: string;
    /** Optional supporting tone (unused fallback = primary). */
    secondary?: string;
    /** Font stack for the prayer text (defaults to a serif). */
    serif?: string;
    /** Optional full-bleed section background. */
    background?: string;
    maxWidth?: number;
}) {
    if (!text || !text.trim()) return null;

    const lines = text.split('\n');
    const bodyLines = lines.filter((l) => !l.trim().startsWith('#'));
    const hashLines = lines.filter((l) => l.trim().startsWith('#'));
    const body = bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const face = serif ?? 'Georgia, "Times New Roman", serif';

    return (
        <section style={{ ...sectionStyle, background }}>
            <div style={{ maxWidth, margin: '0 auto' }}>
                {/* a slim ornamental rule + diamond, palette-coloured */}
                <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
                    <span style={{ width: 34, height: 1, background: accent, opacity: 0.55 }} />
                    <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', opacity: 0.85 }} />
                    <span style={{ width: 34, height: 1, background: accent, opacity: 0.55 }} />
                </div>

                <p
                    style={{
                        fontFamily: face,
                        fontStyle: 'italic',
                        fontSize: 'clamp(17px, 3.9vw, 23px)',
                        lineHeight: 1.75,
                        color: primary,
                        margin: 0,
                        whiteSpace: 'pre-line',
                    }}
                >
                    {body}
                </p>

                {hashLines.map((h, i) => (
                    <div
                        key={i}
                        style={{
                            marginTop: 16,
                            fontFamily: face,
                            fontSize: 'clamp(15px, 3.4vw, 19px)',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            color: accent,
                        }}
                    >
                        {h.trim()}
                    </div>
                ))}
            </div>
        </section>
    );
}

const sectionStyle: CSSProperties = {
    padding: 'clamp(46px, 9vw, 76px) 22px',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
};
