import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { api } from '../lib/api';
import { getTemplate } from '../templates/registry';
import { WishesList } from '../components/WishesList';
import { WishlistView } from '../components/WishlistView';
import { MusicPlayer } from '../components/MusicPlayer';
import { CardActionBar } from '../components/CardActionBar';
import { useLang } from '../context/LangContext';
import type { InvitationData } from '../templates/types';

interface CardResponse {
    id: string;
    slug: string;
    templateKey: string;
    rsvpEnabled: boolean;
    data: InvitationData;
}

export function PublicCard() {
    const { slug = '' } = useParams();
    const { lang } = useLang();
    const [card, setCard] = useState<CardResponse | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
    const C = {
        bm: {
            notFoundTitle: 'Kad tidak ditemui',
            notFoundText: 'Jemputan ini mungkin belum diterbitkan, atau pautannya tidak tepat.',
        },
        en: {
            notFoundTitle: 'Card not found',
            notFoundText: 'This invitation may not be published yet, or the link may be incorrect.',
        },
    }[lang];

    useEffect(() => {
        api.get<CardResponse>(`/cards/${slug}`)
            .then((r) => { setCard(r.data); setState('ready'); })
            .catch(() => setState('notfound'));
    }, [slug]);

    if (state === 'loading') {
        return <div className="loading-screen"><div className="spinner" /></div>;
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
    return (
        <>
            <Tpl
                data={card.data}
                slots={{
                    // RSVP lives only in the floating action bar (no inline duplication).
                    wishes: <WishesList slug={card.slug} />,
                    wishlist: wishlist.length > 0 ? <WishlistView items={wishlist} /> : undefined,
                }}
            />
            {card.data.musicUrl && <MusicPlayer src={card.data.musicUrl} />}
            <CardActionBar data={card.data} slug={card.slug} rsvpEnabled={card.rsvpEnabled} />
        </>
    );
}
