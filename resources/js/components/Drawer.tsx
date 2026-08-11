import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    title?: string;
    width?: number;
    children: ReactNode;
    footer?: ReactNode;
}

/** Right-side off-canvas panel (full-width on mobile). */
export function Drawer({ open, onClose, title, width = 460, children, footer }: Props) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        if (open) document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="drawer-root" role="dialog" aria-modal="true">
            <div className="drawer-backdrop" onClick={onClose} />
            <aside className="drawer-panel" style={{ maxWidth: width }}>
                <div className="drawer-head">
                    <h3 style={{ margin: 0 }}>{title}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Tutup"><X size={17} /></button>
                </div>
                <div className="drawer-body">{children}</div>
                {footer && <div className="drawer-foot">{footer}</div>}
            </aside>
        </div>
    );
}
