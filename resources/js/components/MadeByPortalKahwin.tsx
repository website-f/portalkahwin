import { BrandLogo } from './BrandLogo';

/** The public marketing home — the attribution logo always points here (not /app). */
const MARKETING_HOME = 'https://www.portalkahwin.com/';

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
                href={MARKETING_HOME}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="PortalKahwin"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--plum)', fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
            >
                <BrandLogo height={logoHeight} style={{ display: 'block' }} />
            </a>
        </div>
    );
}
