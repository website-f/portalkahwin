import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { SeatingBoard } from '../../components/SeatingBoard';

export function SeatingPage() {
    const { id = '' } = useParams();
    return (
        <div>
            <div className="page-head spread">
                <div className="row">
                    <Link to={`/app/cards/${id}/edit`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div>
                        <h1 style={{ fontSize: 26 }}>Susunan Meja</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Letak tetamu ke kerusi — manual atau auto-agih</p>
                    </div>
                </div>
                <Link to={`/app/cards/${id}/guests`} className="btn btn-ghost btn-sm"><Users size={15} /> Senarai Tetamu</Link>
            </div>
            <SeatingBoard invitationId={id} />
        </div>
    );
}
