import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { TemplateThumb } from '../../components/TemplateThumb';
import { useLang } from '../../context/LangContext';

interface Tpl {
    id: string; key: string; name: string; category: string;
    description?: string; tier: 'free' | 'premium'; price_myr: string | number;
    palette?: Record<string, string> | null;
}

export function AppTemplates() {
    const { lang } = useLang();
    const nav = useNavigate();
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [loading, setLoading] = useState(true);

    const C = {
        bm: { title: 'Templat', subtitle: 'Terokai koleksi templat — pilih satu untuk cipta kad anda', free: 'Percuma', preview: 'Pratonton', use: 'Guna templat' },
        en: { title: 'Templates', subtitle: 'Browse the collection — pick one to create your card', free: 'Free', preview: 'Preview', use: 'Use template' },
    }[lang];

    useEffect(() => {
        api.get<Tpl[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <div className="tpl-grid">
                {templates.map((t) => (
                    <div className="tpl-card" key={t.id}>
                        <div className="tpl-thumb"><TemplateThumb name={t.name} category={t.category} palette={t.palette} /></div>
                        <div className="tpl-body">
                            <div className="spread">
                                <h3>{t.name}</h3>
                                {t.tier === 'free'
                                    ? <span className="badge badge-free">{C.free}</span>
                                    : <span className="badge badge-gold">RM{Number(t.price_myr)}</span>}
                            </div>
                            <p className="muted" style={{ fontSize: 13, margin: '4px 0 14px', minHeight: 34 }}>{t.description}</p>
                            <div className="row">
                                <a href={`/templates/${t.key}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm grow">
                                    <Eye size={15} /> {C.preview}
                                </a>
                                <button className="btn btn-primary btn-sm grow" onClick={() => nav(`/app?tpl=${t.key}`)}>
                                    <Plus size={15} /> {C.use}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
