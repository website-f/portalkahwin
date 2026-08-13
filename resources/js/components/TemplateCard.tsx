import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { TemplateThumb } from './TemplateThumb';

/** Cards created from a design before it earns the POPULAR flag. */
export const POPULAR_AT = 3;

/** The template fields every listing needs. Extra fields on the row are ignored. */
export interface TemplateCardData {
    key: string;
    name: string;
    category: string;
    tier: 'free' | 'premium';
    price_myr: string | number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    usage_count?: number;
    /** A contributed design renders through this base component. */
    base_key?: string | null;
    config?: Record<string, unknown> | null;
}

/** One button in the card's split action strip. */
export interface TemplateCardAction {
    label: string;
    /** In-app route. */
    to?: string;
    /** Full URL — opened in a new tab (used for the public preview page). */
    href?: string;
    onClick?: () => void;
    /** `gold` marks the paid path (add to cart); `danger` a destructive one. */
    tone?: 'gold' | 'danger';
}

interface Props {
    t: TemplateCardData;
    /** Where the device itself links. Route by default; `deviceHref` for a new tab. */
    deviceTo?: string;
    deviceHref?: string;
    /** Left-to-right; exactly two read best in the split strip. */
    actions: TemplateCardAction[];
    labels: { free: string; popular: string; owned?: string };
    /** Marks a design the signed-in user can already use. */
    owned?: boolean;
    /** Favourite heart, shown only when the page supports saving. */
    favorite?: { on: boolean; onToggle: () => void; saveLabel: string; unsaveLabel: string };
}

/**
 * The one template card used everywhere a design is listed — the public
 * gallery, the panel's Templates and Saved pages. The design is a mobile-first
 * product, so it is always previewed inside a handset: bezel, notch, screen.
 *
 * Only the action buttons differ per page; the visual language never does.
 */
export function TemplateCard({ t, deviceTo, deviceHref, actions, labels, owned, favorite }: Props) {
    const device = (
        <>
            <span className="gal-notch" aria-hidden="true" />
            <span className="gal-screen">
                <TemplateThumb
                    name={t.name}
                    category={t.category}
                    palette={t.palette}
                    thumbnail={t.thumbnail}
                    templateKey={t.key}
                    baseKey={t.base_key}
                    config={t.config as Parameters<typeof TemplateThumb>[0]['config']}
                />
            </span>
            {/* Flags genuinely popular designs, not merely paid ones. */}
            {(t.usage_count ?? 0) >= POPULAR_AT
                ? <span className="gal-flag gal-flag--hot">{labels.popular} ★</span>
                : t.tier === 'free'
                    ? <span className="gal-flag gal-flag--free">{labels.free}</span>
                    : null}
        </>
    );

    return (
        <article className="gal-card">
            {/* Panel holds only the device and the action row — the phone is the
                subject, so it is given nearly the whole width rather than
                floating in padding. */}
            <div className="gal-shell">
                {deviceHref ? (
                    <a href={deviceHref} target="_blank" rel="noreferrer" className="gal-device" aria-label={t.name}>{device}</a>
                ) : (
                    <Link to={deviceTo ?? `/templates/${t.key}`} className="gal-device" aria-label={t.name}>{device}</Link>
                )}

                {favorite && (
                    <button
                        type="button"
                        className={`gal-fav${favorite.on ? ' is-on' : ''}`}
                        aria-label={favorite.on ? favorite.unsaveLabel : favorite.saveLabel}
                        aria-pressed={favorite.on}
                        title={favorite.on ? favorite.unsaveLabel : favorite.saveLabel}
                        onClick={(e) => { e.stopPropagation(); favorite.onToggle(); }}
                    >
                        <Heart size={15} color="var(--gold)" fill={favorite.on ? 'var(--gold)' : 'none'} />
                    </button>
                )}

                <div className="gal-actions">
                    {actions.map((a) => <Action key={a.label} a={a} />)}
                </div>
            </div>

            <h3 className="gal-name" title={t.name}>{t.name}</h3>
            <div className="gal-meta">
                <span className="gal-tag">{t.category}</span>
                {owned && labels.owned
                    ? <span className="gal-owned">{labels.owned}</span>
                    : t.tier === 'premium' && <span className="gal-price">RM{Number(t.price_myr)}</span>}
            </div>
        </article>
    );
}

function Action({ a }: { a: TemplateCardAction }): ReactNode {
    const cls = `gal-btn${a.tone ? ` gal-btn--${a.tone}` : ''}`;
    if (a.href) return <a className={cls} href={a.href} target="_blank" rel="noreferrer">{a.label}</a>;
    if (a.to) return <Link className={cls} to={a.to}>{a.label}</Link>;
    return <button type="button" className={cls} onClick={a.onClick}>{a.label}</button>;
}
