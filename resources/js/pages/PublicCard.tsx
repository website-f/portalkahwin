import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { api } from '../lib/api';
import { getTemplate } from '../templates/registry';
import { RsvpForm } from '../components/RsvpForm';
import { WishesList } from '../components/WishesList';
import { MusicPlayer } from '../components/MusicPlayer';
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
    const [card, setCard] = useState<CardResponse | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

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
                    <h2 style={{ marginTop: 10 }}>Kad tidak dijumpai</h2>
                    <p className="muted">Jemputan ini mungkin belum diterbitkan atau pautan salah.</p>
                </div>
            </div>
        );
    }

    const Tpl = getTemplate(card.templateKey);
    return (
        <>
            <Tpl
                data={card.data}
                slots={{
                    rsvp: card.rsvpEnabled ? <RsvpForm slug={card.slug} /> : undefined,
                    wishes: <WishesList slug={card.slug} />,
                }}
            />
            {card.data.musicUrl && <MusicPlayer src={card.data.musicUrl} />}
        </>
    );
}
