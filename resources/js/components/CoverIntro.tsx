import { useEffect, useState } from 'react';
import { findCardFont, loadCardFont } from '../lib/cardFonts';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLang, dict } from '../context/LangContext';

/**
 * Opening splash built from the host's cover photo.
 *
 * The uploaded cover was previously read by only 3 of the 21 templates, so for
 * most cards it went nowhere. Rather than teach every template about it, the
 * photo becomes a shared intro: it holds for a beat, then dissolves into the
 * card underneath.
 *
 * Renders nothing without a photo, so cards that never had one are unchanged.
 */
export function CoverIntro({
    src,
    groomName,
    brideName,
    fontId,
    dateLabel,
    /** Preview mode inside the editor: no auto-dismiss, no scroll lock. */
    preview = false,
    holdMs = 2600,
}: {
    src?: string | null;
    groomName?: string;
    brideName?: string;
    /** Host's display font, applied to the names on the splash. */
    fontId?: string | null;
    dateLabel?: string | null;
    preview?: boolean;
    holdMs?: number;
}) {
    const [open, setOpen] = useState(!!src && !preview);
    const reduce = useReducedMotion();
    const { lang } = useLang();

    const C = dict({
        bm: { tap: 'Ketik untuk membuka' },
        en: { tap: 'Tap to open' },
        zh: { tap: '点击进入' },
    }, lang);

    // Auto-dismiss after the hold, but a tap always wins.
    useEffect(() => {
        if (!open) return;
        const id = window.setTimeout(() => setOpen(false), holdMs);
        return () => window.clearTimeout(id);
    }, [open, holdMs]);

    // Keep the card still underneath while the splash is up.
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    if (!src) return null;

    const couple = [groomName, brideName].filter(Boolean).join(' & ');
    // The splash is the first thing a guest sees, so the face has to be ready.
    useEffect(() => { loadCardFont(fontId); }, [fontId]);
    const font = findCardFont(fontId);

    // Ken Burns runs across the whole hold plus the exit, for a living, unhurried feel.
    const kbDur = reduce ? 0 : holdMs / 1000 + 1.4;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="cover-intro"
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    // The whole cover gently lifts + fades to reveal the card beneath —
                    // a smooth curtain-lift rather than an abrupt cut.
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: '-4%', scale: 1.04 }}
                    transition={{ duration: reduce ? 0.2 : 0.9, ease: [0.4, 0, 0.2, 1] }}
                    style={font ? { ...shell, ['--pk-name' as string]: font.stack } : shell}
                >
                    {/* Full-bleed photo with a slow Ken Burns zoom, so the cover fills
                        the screen like a real opening rather than a small framed card. */}
                    <motion.img
                        src={src}
                        alt={couple || 'Cover'}
                        style={photo}
                        initial={reduce ? undefined : { scale: 1.12 }}
                        animate={reduce ? undefined : { scale: 1 }}
                        transition={{ duration: kbDur, ease: 'linear' }}
                    />
                    {/* Scrim so the names stay legible over any photo. */}
                    <div style={scrim} />

                    <motion.div
                        style={caption}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduce ? 0.2 : 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {couple && <div style={coupleText}>{couple}</div>}
                        {dateLabel && <div style={dateText}>{dateLabel}</div>}
                        <motion.div
                            style={hint}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.9, 0.5, 0.9] }}
                            transition={{ delay: 1, duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            {C.tap}
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

const shell: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 90,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
    overflow: 'hidden',
    background: '#0b0b0d',
    cursor: 'pointer',
};

const photo: React.CSSProperties = {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
    willChange: 'transform',
};

const scrim: React.CSSProperties = {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.05) 62%, transparent 80%)',
};

const caption: React.CSSProperties = {
    position: 'relative', zIndex: 1, left: 0, right: 0,
    padding: '0 24px calc(env(safe-area-inset-bottom, 0px) + 52px)', textAlign: 'center', color: '#fff',
};

const coupleText: React.CSSProperties = {
    // Falls back to the app serif when the host has not picked a font.
    fontFamily: 'var(--pk-name, var(--serif, Georgia, serif))',
    fontSize: 'clamp(26px, 7vw, 40px)',
    lineHeight: 1.15,
    textShadow: '0 2px 22px rgba(0,0,0,0.55)',
};

const dateText: React.CSSProperties = {
    marginTop: 8, fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase',
    opacity: 0.94, textShadow: '0 2px 14px rgba(0,0,0,0.6)',
};

const hint: React.CSSProperties = {
    marginTop: 22, fontSize: 11.5, letterSpacing: 3, textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 10px rgba(0,0,0,0.5)',
};
