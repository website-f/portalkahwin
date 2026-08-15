import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

type Base = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

export type NumberInputProps = Base & {
    /** Current value — a number, a numeric string, or empty. */
    value: number | string | null | undefined;
    /**
     * Fires with the sanitised raw text: an empty string when the field is
     * cleared, digits with no stray leading zero otherwise. It never fabricates
     * a 0, so the caller decides how to coerce/store it.
     */
    onChange: (text: string) => void;
    /** Allow a single decimal point (for prices). Integers only when false. */
    decimals?: boolean;
    /** Allow a leading minus (for signed amounts like a payout adjustment). */
    signed?: boolean;
};

/**
 * A number field that behaves the way people actually expect. The classic
 * controlled `<input type="number">` bug is that a value of 0 renders "0",
 * clearing it snaps the 0 straight back (`Number("") === 0`), and typing a digit
 * over it leaves "04" instead of "4". This holds its own display string so the
 * field can be empty or mid-edit, strips leading zeros as you type, and keeps a
 * numeric keypad on mobile via inputMode. Emits raw text; callers coerce.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
    { value, onChange, decimals = false, signed = false, onBlur, onFocus, inputMode, ...rest },
    ref,
) {
    const toText = (v: number | string | null | undefined) =>
        v === null || v === undefined ? '' : String(v);

    const [text, setText] = useState<string>(toText(value));
    // While the user is actively editing we are the source of truth for the
    // display, so an incoming controlled value can't clobber "" or "0." mid-type.
    const editing = useRef(false);

    useEffect(() => {
        if (editing.current) return;
        const incoming = toText(value);
        // Only resync when the numeric meaning actually differs from what's shown.
        if (incoming !== text && Number(incoming || 'x') !== Number(text || 'x')) {
            setText(incoming);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const pattern = new RegExp(`^${signed ? '-?' : ''}\\d*${decimals ? '\\.?\\d*' : ''}$`);

    const handleChange = (raw: string) => {
        if (!pattern.test(raw)) return; // reject the keystroke outright
        // Strip leading zeros but keep a lone "0", a "0.x", and any sign.
        const next = raw.replace(/^(-?)0+(?=\d)/, '$1');
        setText(next);
        onChange(next);
    };

    return (
        <input
            {...rest}
            ref={ref}
            type="text"
            inputMode={inputMode ?? (decimals || signed ? 'decimal' : 'numeric')}
            value={text}
            onFocus={(e) => {
                editing.current = true;
                onFocus?.(e);
            }}
            onBlur={(e) => {
                editing.current = false;
                setText(toText(value)); // settle on the stored, canonical value
                onBlur?.(e);
            }}
            onChange={(e) => handleChange(e.target.value)}
        />
    );
});
