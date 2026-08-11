import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getTemplate } from '../templates/registry';
import { SAMPLE_INVITATION } from '../templates/sampleData';
import { useLang } from '../context/LangContext';

export function TemplatePreviewPage() {
    const { key = 'floral' } = useParams();
    const { lang } = useLang();
    const Tpl = getTemplate(key);
    const C = {
        bm: { back: 'Rekaan', sample: 'Pratonton · data contoh', use: 'Gunakan rekaan ini' },
        en: { back: 'Templates', sample: 'Preview · sample data', use: 'Use this template' },
    }[lang];

    return (
        <div>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, height: 58,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px',
                background: 'rgba(251,247,241,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)',
            }}>
                <Link to="/templates" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> {C.back}</Link>
                <span className="muted" style={{ fontSize: 13 }}>{C.sample}</span>
                <Link to={`/register?tpl=${key}`} className="btn btn-primary btn-sm">{C.use}</Link>
            </div>
            <div style={{ paddingTop: 58 }}>
                <Tpl data={SAMPLE_INVITATION} />
            </div>
        </div>
    );
}
