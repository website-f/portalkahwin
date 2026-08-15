import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { allCardFonts } from '../lib/cardFonts';

/**
 * A custom dropdown for the card display font. A native <select> can't render each
 * option in its own family reliably across browsers, so this is a button + popover
 * listbox where every option is drawn in its own face — the shape of the letters
 * tells the couple far more than the name does.
 */
export function FontPicker({
    value,
    onChange,
    defaultLabel,
}: {
    value?: string | null;
    onChange: (id: string | null) => void;
    defaultLabel: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const fonts = allCardFonts();
    const current = value ? fonts.find((f) => f.id === value) : null;

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const pick = (id: string | null) => { onChange(id); setOpen(false); };

    return (
        <div ref={ref} className="fontsel">
            <style>{FONTSEL_CSS}</style>
            <button type="button" className="fontsel-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <span className="fontsel-current" style={{ fontFamily: current?.stack }}>
                    {current ? current.label : defaultLabel}
                </span>
                <ChevronDown size={16} className={`fontsel-chev${open ? ' is-open' : ''}`} />
            </button>

            {open && (
                <div className="fontsel-pop" role="listbox">
                    <button
                        type="button" role="option" aria-selected={!value}
                        className={`fontsel-opt${!value ? ' is-on' : ''}`} onClick={() => pick(null)}
                    >
                        <span style={{ fontSize: 15 }}>{defaultLabel}</span>
                        {!value && <Check size={15} />}
                    </button>
                    {fonts.map((f) => (
                        <button
                            key={f.id} type="button" role="option" aria-selected={value === f.id}
                            className={`fontsel-opt${value === f.id ? ' is-on' : ''}`} onClick={() => pick(f.id)}
                            title={f.label}
                        >
                            <span style={{ fontFamily: f.stack, fontSize: 19, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.label}
                            </span>
                            {value === f.id && <Check size={15} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const FONTSEL_CSS = `
.fontsel { position: relative; }
.fontsel-btn {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 11px 13px; border: 1px solid var(--line); border-radius: 10px; background: #fff;
    color: var(--ink); font: inherit; cursor: pointer; text-align: left; transition: border-color .15s ease;
}
.fontsel-btn:hover { border-color: var(--plum); }
.fontsel-current { font-size: 18px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fontsel-chev { flex: 0 0 auto; color: var(--muted); transition: transform .18s ease; }
.fontsel-chev.is-open { transform: rotate(180deg); }
.fontsel-pop {
    position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; right: 0;
    max-height: 340px; overflow-y: auto; padding: 6px;
    background: #fff; border: 1px solid var(--line); border-radius: 12px;
    box-shadow: 0 22px 50px -22px rgba(74,59,196,.5), 0 0 0 1px rgba(74,59,196,.06);
}
.fontsel-opt {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 12px; border: 0; border-radius: 9px; background: transparent; color: var(--ink);
    font: inherit; cursor: pointer; text-align: left;
}
.fontsel-opt:hover { background: var(--cream); }
.fontsel-opt.is-on { background: var(--cream); color: var(--plum); }
.fontsel-opt.is-on svg { color: var(--plum); }
`;
