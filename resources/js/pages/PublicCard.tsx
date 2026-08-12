import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SearchX, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { getTemplate } from '../templates/registry';
import { WishesList } from '../components/WishesList';
import { WishlistView } from '../components/WishlistView';
import { MusicPlayer } from '../components/MusicPlayer';
import { CardActionBar } from '../components/CardActionBar';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import { useLang } from '../context/LangContext';
import type { InvitationData } from '../templates/types';

interface Owner {
    role: string | null;
    company_name: string | null;
    company_logo: string | null;
}

interface CardResponse {
    id: string;
    slug: string;
    templateKey: string;
    rsvpEnabled: boolean;
    owner?: Owner | null;
    data: InvitationData;
}

interface ExpiredResponse {
    expired: true;
    owner?: Owner | null;
    invitation: { brideName: string; groomName: string };
}

type PublicResponse = CardResponse | ExpiredResponse;

function isExpired(r: PublicResponse): r is ExpiredResponse {
    return 'expired' in r && r.expired === true;
}

export function PublicCard() {
    const { slug = '' } = useParams();
    const { lang } = useLang();
    const [card, setCard] = useState<CardResponse | null>(null);
    const [expired, setExpired] = useState<ExpiredResponse | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'expired' | 'notfound'>('loading');
    const C = {
        bm: {
            notFoundTitle: 'Kad tidak ditemui',
            notFoundText: 'Jemputan ini mungkin belum diterbitkan, atau pautannya tidak tepat.',
            awaitingTitle: 'Jemputan ini menunggu pengesahan bayaran',
            awaitingText: 'Jemputan ini telah tamat tempoh paparan percuma dan sedang menunggu pengesahan bayaran. Sila hubungi penganjur untuk mengaktifkannya semula.',
            presentedBy: 'Dianjurkan oleh',
        },
        en: {
            notFoundTitle: 'Card not found',
            notFoundText: 'This invitation may not be published yet, or the link may be incorrect.',
            awaitingTitle: 'This invitation is awaiting payment confirmation',
            awaitingText: 'The free preview window for this invitation has ended and it is awaiting payment confirmation. Please contact the organiser to reactivate it.',
            presentedBy: 'Presented by',
        },
    }[lang];

    useEffect(() => {
        setState('loading');
        api.get<PublicResponse>(`/cards/${slug}`)
            .then((r) => {
                if (isExpired(r.data)) {
                    setExpired(r.data);
                    setState('expired');
                } else {
                    setCard(r.data);
                    setState('ready');
                }
            })
            .catch(() => setState('notfound'));
    }, [slug]);

    if (state === 'loading') {
        return <div className="loading-screen"><div className="spinner" /></div>;
    }

    if (state === 'expired' && expired) {
        const { groomName, brideName } = expired.invitation;
        return (
            <div className="auth-wrap">
                <div className="auth-card center">
                    <Clock size={44} style={{ color: 'var(--gold)', margin: '0 auto' }} />
                    <h2 className="serif" style={{ marginTop: 12 }}>
                        {groomName} &amp; {brideName}
                    </h2>
                    <p style={{ fontWeight: 600, margin: '4px 0 8px' }}>{C.awaitingTitle}</p>
                    <p className="muted" style={{ lineHeight: 1.6 }}>{C.awaitingText}</p>
                </div>
            </div>
        );
    }

    if (state === 'notfound' || !card) {
        return (
            <div className="auth-wrap">
                <div className="auth-card center">
                    <SearchX size={44} style={{ color: 'var(--muted)', margin: '0 auto' }} />
                    <h2 style={{ marginTop: 10 }}>{C.notFoundTitle}</h2>
                    <p className="muted">{C.notFoundText}</p>
                </div>
            </div>
        );
    }

    const Tpl = getTemplate(card.templateKey);
    const wishlist = card.data.wishlist ?? [];
    const sections = card.data.sections ?? {};
    const owner = card.owner;
    const hasBranding = !!(owner && (owner.company_name || owner.company_logo));

    return (
        <>
            <Tpl
                data={card.data}
                slots={{
                    // RSVP lives only in the floating action bar (no inline duplication).
                    wishes: (sections.wishes ?? true) ? <WishesList slug={card.slug} /> : undefined,
                    wishlist: wishlist.length > 0 ? <WishlistView items={wishlist} /> : undefined,
                }}
            />
            <div style={brandStrip}>
                {hasBranding && owner && (
                    <div className="row" style={{ gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <span style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: 0.3 }}>{C.presentedBy}</span>
                        {owner.company_logo && (
                            <img src={owner.company_logo} alt={owner.company_name ?? ''} style={brandLogo} />
                        )}
                        {owner.company_name && (
                            <span style={{ fontWeight: 700, color: 'var(--plum)', fontSize: 14 }}>{owner.company_name}</span>
                        )}
                    </div>
                )}
                <MadeByPortalKahwin style={{ padding: hasBranding ? '4px 12px 0' : '0 12px' }} />
            </div>
            {card.data.musicUrl && <MusicPlayer src={card.data.musicUrl} />}
            <CardActionBar data={card.data} slug={card.slug} rsvpEnabled={card.rsvpEnabled} />
        </>
    );
}

const brandStrip: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    // Clear the floating CardActionBar (fixed at the bottom of the viewport).
    padding: '18px 16px 120px',
    background: 'var(--ivory, #fff)',
    borderTop: '1px solid var(--line)',
};
const brandLogo: React.CSSProperties = {
    height: 26,
    maxWidth: 120,
    objectFit: 'contain',
    display: 'block',
};
