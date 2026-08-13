import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLang } from '../context/LangContext';

interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    /** Rendered in the header, left of the close button — e.g. a section switch. */
    headAction?: ReactNode;
    children: ReactNode;
}

/**
 * Reusable bottom off-canvas sheet: slides up from the bottom, dimmed
 * backdrop, Esc-to-close, drag-the-grabber-to-dismiss, body-scroll-lock and a
 * `.pk-scroll` scrollable body. Mirrors the CardActionBar sheet pattern but
 * scoped to the editor (styles live in a local <style> block, never app.css).
 */
export function EditorSheet({ open, onClose, title, subtitle, headAction, children }: Props) {
    const { lang } = useLang();
    const closeLabel = lang === 'bm' ? 'Tutup' : 'Close';

    const [mounted, setMounted] = useState(open);
    const [shown, setShown] = useState(false);
    const [dragY, setDragY] = useState(0);
    const dragStart = useRef<number | null>(null);

    // Mount on open then flip "shown" so the panel transitions up; on close keep
    // it mounted through the exit transition. We wait TWO frames before flipping
    // `shown`: the first frame commits the panel in its off-screen base state,
    // the second flips it — this guarantees the browser sees a state change to
    // animate, so the slide-up always plays (a single rAF can be batched with the
    // initial paint and skip the transition entirely).
    useEffect(() => {
        if (open) {
            setMounted(true);
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setShown(true));
            });
            return () => {
                cancelAnimationFrame(raf1);
                cancelAnimationFrame(raf2);
            };
        }
        setShown(false);
        const t = setTimeout(() => {
            setMounted(false);
            setDragY(0);
        }, 360);
        return () => clearTimeout(t);
    }, [open]);

    // Esc to close + lock body scroll while open.
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!mounted) return null;

    const onGrabDown = (e: React.PointerEvent) => {
        dragStart.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onGrabMove = (e: React.PointerEvent) => {
        if (dragStart.current === null) return;
        setDragY(Math.max(0, e.clientY - dragStart.current));
    };
    const onGrabUp = (e: React.PointerEvent) => {
        if (dragStart.current === null) return;
        const dy = e.clientY - dragStart.current;
        dragStart.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* pointer already released */
        }
        setDragY(0);
        if (dy > 120) onClose();
    };

    const panelStyle: React.CSSProperties =
        dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : {};

    return (
        <div className="es-root" role="dialog" aria-modal="true" aria-label={title}>
            <style>{ES_CSS}</style>
            <div className={`es-backdrop${shown ? ' is-shown' : ''}`} onClick={onClose} />
            <div className={`es-panel${shown ? ' is-shown' : ''}`} style={panelStyle}>
                <div
                    className="es-grab-zone"
                    onPointerDown={onGrabDown}
                    onPointerMove={onGrabMove}
                    onPointerUp={onGrabUp}
                    onPointerCancel={onGrabUp}
                >
                    <div className="es-grabber" aria-hidden="true" />
                </div>
                <div className="es-head">
                    <div style={{ minWidth: 0 }}>
                        <h3 className="serif">{title}</h3>
                        {subtitle && <p className="es-sub">{subtitle}</p>}
                    </div>
                    <div className="es-head-r">
                        {headAction}
                        <button className="es-close" onClick={onClose} aria-label={closeLabel}>
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="es-body pk-scroll">{children}</div>
            </div>
        </div>
    );
}

const ES_CSS = `
.es-root { position: fixed; inset: 0; z-index: 130; }
.es-backdrop {
    position: absolute; inset: 0; background: rgba(30, 26, 51, 0.42);
    -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
    /* Exit easing (accelerate out) — applies when .is-shown is removed. */
    opacity: 0; transition: opacity .24s cubic-bezier(.4, 0, 1, 1);
}
/* Entrance easing (decelerate in). */
.es-backdrop.is-shown { opacity: 1; transition: opacity .3s cubic-bezier(.16, 1, .3, 1); }
.es-panel {
    position: absolute; left: 0; right: 0; bottom: 0; margin: 0 auto;
    width: min(760px, 100%); max-height: 88vh;
    display: flex; flex-direction: column;
    background: #fff; border-radius: 24px 24px 0 0; border-top: 1px solid var(--line);
    box-shadow: 0 -30px 70px -24px rgba(30, 26, 51, 0.5);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    /* EXIT: ease-in so it slides away smoothly (not a sudden jump). */
    transform: translateY(102%); transition: transform .3s cubic-bezier(.4, 0, 1, 1);
    will-change: transform;
}
/* ENTRANCE: ease-out so it settles gently into place. */
.es-panel.is-shown { transform: translateY(0); transition: transform .42s cubic-bezier(.16, 1, .3, 1); }
/* On desktop the panel + dock live in the content column to the RIGHT of the
   244px sidebar. Offset the panel so it centres over that column and lines up
   with the bottom dock (which sits at 50% + 122px), instead of centring on the
   whole viewport and drifting left of the toolbar. */
@media (min-width: 861px) {
    .es-panel { left: 244px; right: 0; }
}
.es-grab-zone { flex: none; display: flex; justify-content: center; padding: 12px 0 4px; cursor: grab; touch-action: none; }
.es-grab-zone:active { cursor: grabbing; }
.es-grabber { width: 44px; height: 5px; border-radius: 999px; background: rgba(30, 26, 51, 0.18); }
.es-head {
    flex: none; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    padding: 4px 22px 14px; border-bottom: 1px solid var(--line);
}
.es-head-r { flex: none; display: flex; align-items: center; gap: 10px; }
.es-head h3 { margin: 0; font-size: 21px; color: var(--plum); line-height: 1.2; }
.es-sub { margin: 3px 0 0; font-size: 13px; color: var(--muted); line-height: 1.45; }
.es-close {
    flex: none; border: 0; cursor: pointer; width: 36px; height: 36px; border-radius: 50%;
    display: grid; place-items: center; background: var(--cream); color: var(--plum); transition: background .15s ease;
}
.es-close:hover { background: #e6e2f6; }
.es-body { overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 18px 22px 26px; }
@media (max-width: 520px) {
    .es-head { padding: 4px 16px 14px; }
    .es-body { padding: 16px 16px 24px; }
}
@media print { .es-root { display: none !important; } }
`;
