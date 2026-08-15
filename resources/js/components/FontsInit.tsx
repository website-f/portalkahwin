import { useEffect } from 'react';
import { api } from '../lib/api';
import { registerCustomFonts, type CardFont } from '../lib/cardFonts';

/**
 * Registers admin-imported Google Fonts once on boot, from the public `card_fonts`
 * setting — so the card editor's picker and every live card resolve the exact same
 * font collection (built-ins + admin additions). Renders nothing.
 */
export function FontsInit() {
    useEffect(() => {
        api.get<{ card_fonts?: CardFont[] }>('/settings')
            .then((r) => registerCustomFonts(Array.isArray(r.data?.card_fonts) ? r.data.card_fonts : []))
            .catch(() => { /* the built-in families still work without this */ });
    }, []);
    return null;
}
