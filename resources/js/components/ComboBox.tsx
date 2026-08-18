import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * A select-2-style combobox: pick from a list of suggestions OR type a free-form
 * value. The suggestions come from the admin-managed list; anything typed that
 * isn't in the list is kept as a custom value. Replaces the native <datalist>,
 * whose dropdown styling and discoverability are inconsistent across browsers.
 */
export function ComboBox({
    value, onChange, options, placeholder, maxLength = 40, ariaLabel,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    maxLength?: number;
    ariaLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Close on any click outside the widget.
    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const q = value.trim().toLowerCase();
    const matches = options.filter((o) => o.toLowerCase().includes(q));
    const list = q && !options.some((o) => o.toLowerCase() === q) ? matches : (matches.length ? matches : options);

    return (
        <div ref={rootRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={value}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    aria-label={ariaLabel}
                    onChange={(e) => { onChange(e.target.value); if (!open) setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    style={{ paddingRight: 34, width: '100%' }}
                />
                <button
                    type="button"
                    aria-label="toggle options"
                    tabIndex={-1}
                    onClick={() => setOpen((o) => !o)}
                    style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--muted)',
                        display: 'grid', placeItems: 'center', padding: 2,
                    }}
                >
                    <ChevronDown size={16} style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }} />
                </button>
            </div>

            {open && list.length > 0 && (
                <div role="listbox" style={dropdown}>
                    {list.map((o) => {
                        const sel = o.toLowerCase() === q;
                        return (
                            <button
                                key={o}
                                type="button"
                                role="option"
                                aria-selected={sel}
                                onClick={() => { onChange(o); setOpen(false); }}
                                style={{ ...optionStyle, background: sel ? 'var(--cream)' : 'transparent', textTransform: 'capitalize' }}
                            >
                                <span>{o}</span>
                                {sel && <Check size={14} style={{ color: 'var(--plum)' }} />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const dropdown: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30,
    background: '#fff', border: '1px solid var(--line)', borderRadius: 10,
    boxShadow: 'var(--shadow)', padding: 5, maxHeight: 220, overflowY: 'auto',
};
const optionStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    width: '100%', textAlign: 'left', border: 0, cursor: 'pointer',
    padding: '8px 10px', borderRadius: 7, font: 'inherit', fontSize: 13.5, color: 'var(--ink)',
};
