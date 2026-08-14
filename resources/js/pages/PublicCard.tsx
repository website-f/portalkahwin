import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SearchX, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { getTemplate } from '../templates/registry';
import { WishesList } from '../components/WishesList';
import { WishlistView } from '../components/WishlistView';
import { MusicPlayer } from '../components/MusicPlayer';
import { CardActionBar } from '../components/CardActionBar';
import { useLang, dict } from '../context/LangContext';
import { LangToggle } from '../components/LangToggle';
import { CoverIntro } from '../components/CoverIntro';
import { formatCardDate, formatCardTime, formatHijri, formatProgramTime } from '../lib/datetime';
import { mediaUrl, mediaUrls } from '../lib/base';
import { readablePalette } from '../lib/contrast';
import { artFor } from '../templates/templateArt';
import type { InvitationData } from '../templates/types';
import { CardStage } from '../templates/PkSec';
import { CardAtmosphere } from '../components/CardAtmosphere';

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
    rsvpFields?: 'both' | 'email' | 'phone';
    // A trial/test card — rendered for real but watermarked, and RSVP is inert.
    trial?: boolean;
    owner?: Owner | null;
    data: InvitationData;
}

interface ExpiredResponse {
    expired: true;
    owner?: Owner | null;
    invitation: { brideName: string; groomName: string };
}

interface TrialExhaustedResponse {
    trial_exhausted: true;
    owner?: Owner | null;
    invitation: { brideName: string; groomName: string };
}

type PublicResponse = CardResponse | ExpiredResponse | TrialExhaustedResponse;

function isExpired(r: PublicResponse): r is ExpiredResponse {
    return 'expired' in r && r.expired === true;
}

function isTrialExhausted(r: PublicResponse): r is TrialExhaustedResponse {
    return 'trial_exhausted' in r && r.trial_exhausted === true;
}

export function PublicCard() {
    const { slug = '' } = useParams();
    const { lang } = useLang();
    const [card, setCard] = useState<CardResponse | null>(null);
    const [expired, setExpired] = useState<ExpiredResponse | null>(null);
    const [trialEnd, setTrialEnd] = useState<TrialExhaustedResponse | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'expired' | 'trialEnd' | 'notfound'>('loading');
    const C = dict({
        bm: {
            notFoundTitle: 'Kad tidak ditemui',
            notFoundText: 'Jemputan ini mungkin belum diterbitkan, atau pautannya tidak tepat.',
            awaitingTitle: 'Jemputan ini menunggu pengesahan bayaran',
            awaitingText: 'Jemputan ini telah tamat tempoh paparan percuma dan sedang menunggu pengesahan bayaran. Sila hubungi penganjur untuk mengaktifkannya semula.',
            trialEndTitle: 'Mod percubaan telah tamat',
            trialEndText: 'Kad ini dalam mod percubaan dan telah mencapai had paparan. Sila minta penganjur meneruskan pembayaran untuk menerbitkannya.',
            watermark: 'PRATONTON',
        },
        en: {
            notFoundTitle: 'Card not found',
            notFoundText: 'This invitation may not be published yet, or the link may be incorrect.',
            awaitingTitle: 'This invitation is awaiting payment confirmation',
            awaitingText: 'The free preview window for this invitation has ended and it is awaiting payment confirmation. Please contact the organiser to reactivate it.',
            trialEndTitle: 'Trial mode has ended',
            trialEndText: 'This card is in trial mode and has reached its view limit. Please ask the host to proceed with payment to publish it.',
            watermark: 'PREVIEW',
        },
        zh: {
            notFoundTitle: '找不到请柬',
            notFoundText: '这份请柬可能尚未发布，或链接不正确。',
            awaitingTitle: '此请柬正在等待付款确认',
            awaitingText: '本请柬的免费展示期已结束，正在等待付款确认。请联系主办方重新启用。',
            trialEndTitle: '试用模式已结束',
            trialEndText: '此请柬处于试用模式且已达到浏览上限。请主办方完成付款以正式发布。',
            watermark: '预览',
        },
    }, lang);

    useEffect(() => {
        setState('loading');
        api.get<PublicResponse>(`/cards/${slug}`)
            .then((r) => {
                if (isTrialExhausted(r.data)) {
                    setTrialEnd(r.data);
                    setState('trialEnd');
                } else if (isExpired(r.data)) {
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

    if (state === 'trialEnd' && trialEnd) {
        const { groomName, brideName } = trialEnd.invitation;
        return (
            <div className="auth-wrap">
                <div className="auth-card center">
                    <Clock size={44} style={{ color: 'var(--gold)', margin: '0 auto' }} />
                    <h2 className="serif" style={{ marginTop: 12 }}>
                        {groomName} &amp; {brideName}
                    </h2>
                    <p style={{ fontWeight: 600, margin: '4px 0 8px' }}>{C.trialEndTitle}</p>
                    <p className="muted" style={{ lineHeight: 1.6 }}>{C.trialEndText}</p>
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
        // Stored media is root-relative; re-point it at the mount path so every
        // template gets working URLs without each one knowing about /app.
        // Gold on cream measures ~2:1. Correct the palette here so no template
        // has to think about it and a host's own colours are covered too.
        // Design art direction first, then the host's own overrides on top.
        palette: readablePalette({ ...(artFor(card.templateKey)?.palette ?? {}), ...(card.data.palette ?? {}) }) as typeof card.data.palette,
        coverImage: mediaUrl(card.data.coverImage),
        galleryImages: mediaUrls(card.data.galleryImages),
        musicUrl: mediaUrl(card.data.musicUrl),
        dateLabel: formatCardDate(
            card.data.receptionAt ?? card.data.akadAt,
            lang,
            card.data.dateLabel,
        ),
        timeLabel: card.data.timeLabel || formatCardTime(card.data.receptionAt ?? card.data.akadAt, lang),
        // Run-of-show times are stored as HH:MM and read out in the guest's
        // own language; anything hand-typed on an older card passes through.
        program: (card.data.program ?? []).map((p) => ({ ...p, time: formatProgramTime(p.time, lang) })),
        // Host's own wording wins; otherwise convert from the real date.
        hijriLabel: formatHijri(card.data.akadAt ?? card.data.receptionAt, lang, card.data.hijriLabel),
    };

    // Darkest to lightest, so a retinted animation keeps its own shading.
    const motionRamp = [
        localised.palette?.primary,
        localised.palette?.secondary,
        localised.palette?.accent,
    ].filter((c): c is string => !!c);

    const wishlist = card.data.wishlist ?? [];
    const sections = card.data.sections ?? {};

    return (
        <>
            {/* The host's cover photo opens the card, then dissolves into it. */}
            <CoverIntro
                src={localised.coverImage}
                groomName={card.data.groomName}
                brideName={card.data.brideName}
                dateLabel={localised.dateLabel}
                fontId={card.data.fontId}
            />

            {/* Guests pick their own language; the choice persists in localStorage. */}
            <div style={cardLangDock}>
                <LangToggle compact />
            </div>
            {/* The template renders its own section order; this wrapper permutes
                them to the host's, and hides the guestbook — the one block every
                template renders unconditionally, placeholder and all. */}
            <CardAtmosphere
                templateKey={card.templateKey}
                palette={localised.palette}
                motionFile={localised.motionFile}
                motionTint={localised.motionTint}
            >
                        <CardStage order={card.data.sectionOrder} hidden={{ wishes: !(sections.wishes ?? true) }} fontId={card.data.fontId} bottomClear={104}>
                <Tpl
                    data={localised}
                    slots={{
                        // RSVP lives only in the floating action bar (no inline duplication).
                        wishes: (sections.wishes ?? true) ? <WishesList slug={card.slug} /> : undefined,
                        wishlist: wishlist.length > 0 ? <WishlistView items={wishlist} /> : undefined,
                    }}
                />
            </CardStage>
            </CardAtmosphere>
            {card.data.musicUrl && <MusicPlayer src={card.data.musicUrl} />}
            <CardActionBar data={localised} slug={card.slug} rsvpEnabled={card.rsvpEnabled} rsvpFields={card.rsvpFields} preview={!!card.trial} />

            {/* Trial cards are watermarked so a shared preview can't pass as a real,
                paid card — a full-width band across the middle, over the artwork. */}
            {card.trial && (
                <div className="pk-wm" aria-hidden="true">
                    <style>{PK_WM_CSS}</style>
                    <div className="pk-wm-band">{`${C.watermark} · ${C.watermark} · ${C.watermark}`}</div>
                </div>
            )}
        </>
    );
}

const PK_WM_CSS = `
.pk-wm { position: fixed; inset: 0; z-index: 88; pointer-events: none; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.pk-wm-band {
    width: 150%; margin-left: -25%; text-align: center; padding: 12px 0;
    background: rgba(30, 26, 51, 0.5); color: rgba(255, 255, 255, 0.92);
    font-weight: 900; letter-spacing: 0.4em; text-transform: uppercase;
    font-size: clamp(22px, 7vw, 56px); white-space: nowrap;
    border-top: 2px solid rgba(255, 255, 255, 0.55); border-bottom: 2px solid rgba(255, 255, 255, 0.55);
    transform: rotate(-8deg); box-shadow: 0 10px 40px rgba(0,0,0,0.25);
}
@media print { .pk-wm { display: none !important; } }
`;

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

