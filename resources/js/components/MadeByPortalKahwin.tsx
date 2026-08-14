import { Heart } from 'lucide-react';
import { url as appUrl } from '../lib/base';
import { BrandLogo } from './BrandLogo';

/**
 * Small "Made by PortalKahwin" attribution shown across public-facing surfaces
 * (login, register, templates gallery, live card, guest seating, preview…).
 * Self-contained; inherits nothing but theme tokens.
 */
export function MadeByPortalKahwin({ style, logoHeight = 30 }: { style?: React.CSSProperties; logoHeight?: number }) {
    return (
        <div
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                fontSize: 14, color: 'var(--muted)', padding: '20px 12px',
                letterSpacing: 0.2, ...style,
            }}
        >
            <span>Made by</span>
            <a
                href={appUrl("/")}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--plum)', fontWeight: 700, textDecoration: 'none' }}
            >
                <BrandLogo height={logoHeight} style={{ display: 'block' }} />
                <Heart size={14} fill="var(--gold)" color="var(--gold)" />
            </a>
        </div>
    );
}
