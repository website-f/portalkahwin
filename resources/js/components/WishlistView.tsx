import { Gift, ExternalLink } from 'lucide-react';
import { useLang } from '../context/LangContext';
import type { WishlistItem } from '../templates/types';

/**
 * The couple's gift registry / wishlist, injected into every template as
 * `slots.wishlist`. Visually neutral (translucent cards) so it reads well on any
 * template background — light or dark.
 */
export function WishlistView({ items }: { items?: WishlistItem[] }) {
    const { lang } = useLang();
    const C = {
        bm: { empty: 'Senarai hadiah akan dikongsi tidak lama lagi.', buy: 'Lihat / Tempah' },
        en: { empty: 'The gift registry will be shared soon.', buy: 'View / Reserve' },
    }[lang];

    const list = items ?? [];
    if (list.length === 0) {
        return <div style={{ textAlign: 'center', opacity: 0.7, padding: 16 }}>{C.empty}</div>;
    }

    return (
        <div style={{ display: 'grid', gap: 12, maxWidth: 560, margin: '0 auto' }}>
            {list.map((w, i) => (
                <div
                    key={i}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                        background: 'rgba(255,255,255,0.92)', color: '#2a1f2d', borderRadius: 14,
                        padding: '14px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            flex: '0 0 auto', width: 42, height: 42, borderRadius: '50%',
                            display: 'grid', placeItems: 'center',
                            background: 'rgba(201,162,75,0.16)', color: '#b98a2f',
                        }}
                    >
                        <Gift size={20} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{w.title}</div>
                        {w.note && <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{w.note}</div>}
                    </div>
                    {w.url && (
                        <a
                            href={w.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                                fontSize: 13, fontWeight: 600, color: '#8a2e4d', textDecoration: 'none',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {C.buy} <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
}
