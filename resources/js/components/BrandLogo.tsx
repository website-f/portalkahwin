import { url } from '../lib/base';

const LOGO = '/Portal-Kahwin-Logo-Header-2.webp';

/**
 * The PortalKahwin wordmark. Every surface that used to type the brand as text
 * renders this instead, so swapping the logo is a one-line change here.
 *
 * On dark backgrounds use `plate` — it sets the logo on a rounded white card.
 * Do NOT reach for a brightness/invert filter: the artwork is not a flat
 * silhouette, so inverting it collapses the whole image into a white block.
 */
export function BrandLogo({
    height = 30,
    plate = false,
    style,
}: {
    height?: number;
    /** White rounded backing, for placing the logo on a dark panel. */
    plate?: boolean;
    style?: React.CSSProperties;
}) {
    const img = (
        <img
            src={url(LOGO)}
            alt="PortalKahwin"
            style={{
                height,
                width: 'auto',
                maxWidth: '100%',
                display: 'block',
                objectFit: 'contain',
                ...(plate ? null : style),
            }}
        />
    );

    if (!plate) return img;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                borderRadius: 999,
                padding: `${Math.round(height * 0.34)}px ${Math.round(height * 0.7)}px`,
                boxShadow: '0 10px 30px -12px rgba(0,0,0,0.45)',
                ...style,
            }}
        >
            {img}
        </span>
    );
}
