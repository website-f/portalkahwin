import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getTemplate } from '../templates/registry';
import { SAMPLE_INVITATION } from '../templates/sampleData';

export function TemplatePreviewPage() {
    const { key = 'floral' } = useParams();
    const Tpl = getTemplate(key);

    return (
        <div>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, height: 58,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px',
                background: 'rgba(251,247,241,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)',
            }}>
                <Link to="/templates" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> Templat</Link>
                <span className="muted" style={{ fontSize: 13 }}>Pratonton · data contoh</span>
                <Link to={`/register?tpl=${key}`} className="btn btn-primary btn-sm">Guna templat ini</Link>
            </div>
            <div style={{ paddingTop: 58 }}>
                <Tpl data={SAMPLE_INVITATION} />
            </div>
        </div>
    );
}
