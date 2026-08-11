import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { SeatingBoard } from '../../components/SeatingBoard';
import { useLang } from '../../context/LangContext';

export function SeatingPage() {
    const { id = '' } = useParams();
    const { lang } = useLang();
    const C = ({
        bm: { title: 'Susunan Meja', subtitle: 'Letak tetamu ke kerusi — manual atau auto-agih', guestList: 'Senarai Tetamu' },
        en: { title: 'Seating', subtitle: 'Place guests at seats — manually or auto-assign', guestList: 'Guest List' },
    })[lang];
    return (
        <div>
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
            <SeatingBoard invitationId={id} />
        </div>
    );
}
