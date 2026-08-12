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
import { useLang, dict } from '../context/LangContext';
import { LangToggle } from '../components/LangToggle';
import { CoverIntro } from '../components/CoverIntro';
import { formatCardDate, formatCardTime } from '../lib/datetime';
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
    const C = dict({
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
        zh: {
            notFoundTitle: '找不到请柬',
            notFoundText: '这份请柬可能尚未发布，或链接不正确。',
            awaitingTitle: '此请柬正在等待付款确认',
            awaitingText: '本请柬的免费展示期已结束，正在等待付款确认。请联系主办方重新启用。',
            presentedBy: '呈献单位',
        },
    }, lang);

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

    // Localise the date here rather than in 20 template files: every template
    // reads data.dateLabel, so reformatting it upstream covers all of them.
    // The host's typed label is Malay by definition and can't be translated, but
    // the card also stores real timestamps — so reformat from those and fall back
    // to the typed text only when no timestamp exists. timeLabel is left alone:
    // it's a range ("12:00 tengah hari – 4:00 petang") that a single timestamp
    // cannot reconstruct.
    const localised: InvitationData = {
        ...card.data,
        dateLabel: formatCardDate(
            card.data.receptionAt ?? card.data.akadAt,
            lang,
            card.data.dateLabel,
        ),
        timeLabel: card.data.timeLabel || formatCardTime(card.data.receptionAt ?? card.data.akadAt, lang),
    };

    const wishlist = card.data.wishlist ?? [];
    const sections = card.data.sections ?? {};
    const owner = card.owner;
    const hasBranding = !!(owner && (owner.company_name || owner.company_logo));

    return (
        <>
            {/* The host's cover photo opens the card, then dissolves into it. */}
            <CoverIntro
                src={card.data.coverImage}
                groomName={card.data.groomName}
                brideName={card.data.brideName}
                dateLabel={localised.dateLabel}
            />

            {/* Guests pick their own language; the choice persists in localStorage. */}
            <div style={cardLangDock}>
                <LangToggle compact />
            </div>
            <Tpl
                data={localised}
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

/* Floating language picker on the live card — top-right, above the artwork,
   clear of the fixed CardActionBar at the bottom. */
const cardLangDock: React.CSSProperties = {
    position: 'fixed',
    top: 14,
    right: 14,
    zIndex: 60,
    backdropFilter: 'blur(6px)',
    borderRadius: 999,
    boxShadow: '0 6px 20px -8px rgba(0,0,0,0.35)',
};

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
