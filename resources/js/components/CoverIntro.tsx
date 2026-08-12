import { useEffect, useState } from 'react';
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
    dateLabel,
    /** Preview mode inside the editor: no auto-dismiss, no scroll lock. */
    preview = false,
    holdMs = 2600,
}: {
    src?: string | null;
    groomName?: string;
    brideName?: string;
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

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="cover-intro"
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    // Dissolve upward and out, so the card feels revealed rather than swapped.
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: 'blur(6px)' }}
                    transition={{ duration: reduce ? 0.2 : 0.9, ease: 'easeInOut' }}
                    style={shell}
                >
                    <motion.div
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 18 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: reduce ? 0.2 : 1, ease: [0.16, 1, 0.3, 1] }}
                        style={frame}
                    >
                        <img src={src} alt={couple || 'Cover'} style={photo} />
                        {/* Scrim so the names stay legible over any photo. */}
                        <div style={scrim} />

                        <div style={caption}>
                            {couple && <div style={coupleText}>{couple}</div>}
                            {dateLabel && <div style={dateText}>{dateLabel}</div>}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                        style={hint}
                    >
                        {C.tap}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

const shell: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 90,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 18, padding: '28px 22px',
    background: 'var(--cream, #f6efe6)',
    cursor: 'pointer',
};

const frame: React.CSSProperties = {
    position: 'relative',
    width: 'min(78vw, 420px)',
    aspectRatio: '3 / 4',
    borderRadius: 26,
    overflow: 'hidden',
    boxShadow: '0 40px 90px -30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.5)',
};

const photo: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
};

const scrim: React.CSSProperties = {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.16) 42%, transparent 68%)',
};

const caption: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: '0 22px 26px', textAlign: 'center', color: '#fff',
};

const coupleText: React.CSSProperties = {
    fontFamily: 'var(--serif, Georgia, serif)',
    fontSize: 'clamp(22px, 6vw, 32px)',
    lineHeight: 1.15,
    textShadow: '0 2px 18px rgba(0,0,0,0.45)',
};

const dateText: React.CSSProperties = {
    marginTop: 6, fontSize: 12.5, letterSpacing: 2.4, textTransform: 'uppercase',
    opacity: 0.92, textShadow: '0 2px 12px rgba(0,0,0,0.5)',
};

const hint: React.CSSProperties = {
    fontSize: 11.5, letterSpacing: 3, textTransform: 'uppercase',
    color: 'var(--muted, #8a7f76)',
};
