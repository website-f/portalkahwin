import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { getTemplate } from '../templates/registry';
import { SAMPLE_INVITATION } from '../templates/sampleData';
import type { InvitationData, Palette } from '../templates/types';
import type { CustomTemplateConfig } from '../templates/customConfig';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import { useLang } from '../context/LangContext';

interface TemplateRow { key: string; base_key?: string | null; palette?: Palette | null; config?: CustomTemplateConfig | null; }

export function TemplatePreviewPage() {
    const { key = 'floral' } = useParams();
    const { lang } = useLang();
    const [tpl, setTpl] = useState<TemplateRow | null>(null);
    const [loading, setLoading] = useState(true);

    const C = {
        bm: { back: 'Rekaan', sample: 'Pratonton · data contoh', use: 'Gunakan rekaan ini' },
        en: { back: 'Templates', sample: 'Preview · sample data', use: 'Use this template' },
    }[lang];

    useEffect(() => {
        setLoading(true);
        api.get<TemplateRow>(`/templates/${key}`)
            .then((r) => setTpl(r.data))
            .catch(() => setTpl(null))
            .finally(() => setLoading(false));
    }, [key]);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    // A contributed / custom design renders with its base component (+ palette, or the full config for the no-code engine).
    const Tpl = getTemplate(tpl?.base_key || key);
    const data: InvitationData = {
        ...SAMPLE_INVITATION,
        ...(tpl?.palette ? { palette: tpl.palette } : {}),
        ...(tpl?.config ? { templateConfig: tpl.config } : {}),
    };

    return (
        <div>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, height: 58,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px',
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)',
            }}>
                <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> {C.back}</Link>
                <span className="muted" style={{ fontSize: 13 }}>{C.sample}</span>
                <Link to={`/register?tpl=${key}`} className="btn btn-primary btn-sm">{C.use}</Link>
            </div>
            <div style={{ paddingTop: 58 }}>
                <Tpl data={data} />
            </div>
            <MadeByPortalKahwin style={{ background: 'var(--cream)' }} />
        </div>
    );
}
