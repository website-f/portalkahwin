import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Crown } from 'lucide-react';
import { SeatingBoard } from '../../components/SeatingBoard';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';

export function SeatingPage() {
    const { id = '' } = useParams();
    const { lang } = useLang();
    const { user } = useAuth();
    const nav = useNavigate();
    // Seating unlocks for any paying customer (bought ≥1 design) or premium/admin.
    const isPremium = !!user?.has_paid_access || user?.plan === 'premium' || user?.role === 'admin';
    const C = ({
        bm: {
            title: 'Susunan Meja', subtitle: 'Tempatkan tetamu di kerusi secara manual atau automatik.', guestList: 'Senarai Tetamu',
            lockTitle: 'Susun Atur Meja — Ciri Premium',
            lockBody: 'RSVP dan senarai tetamu tetap percuma. Naik taraf ke Premium untuk susun atur meja dan tempat duduk tetamu.',
            upgrade: 'Naik Taraf',
        },
        en: {
            title: 'Seating', subtitle: 'Place guests at seats — manually or auto-assign', guestList: 'Guest List',
            lockTitle: 'Table Management — Premium',
            lockBody: 'RSVP and the guest list remain free. Upgrade to Premium to manage tables and guest seating.',
            upgrade: 'Upgrade',
        },
    })[lang];

    const header = (
        <div className="page-head spread">
            <div className="row">
                <Link to={`/app/cards/${id}/edit`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                <div>
                    <h1 style={{ fontSize: 26 }}>{C.title}</h1>
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>{C.subtitle}</p>
                </div>
            </div>
            <Link to={`/app/cards/${id}/guests`} className="btn btn-ghost btn-sm"><Users size={15} /> {C.guestList}</Link>
        </div>
    );

    if (!isPremium) {
        return (
            <div>
                {header}
                <div className="panel center" style={{ maxWidth: 480, margin: '40px auto', padding: 48 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                        display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--gold)',
                    }}>
                        <Crown size={26} />
                    </div>
                    <h2 style={{ margin: '0 0 10px' }}>{C.lockTitle}</h2>
                    <p className="muted" style={{ margin: '0 0 22px', lineHeight: 1.5 }}>{C.lockBody}</p>
                    <button className="btn btn-primary" onClick={() => nav('/app/templates')}><Crown size={16} /> {C.upgrade}</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {header}
            <SeatingBoard invitationId={id} />
        </div>
    );
}
