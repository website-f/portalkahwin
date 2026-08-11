import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { SiteNav } from '../components/SiteNav';
import { TemplateThumb } from '../components/TemplateThumb';
import { api } from '../lib/api';

interface TemplateRow {
    id: string;
    key: string;
    name: string;
    category: string;
    description?: string;
    tier: 'free' | 'premium';
    price_myr: string | number;
    palette?: Record<string, string> | null;
}

export function TemplatesGallery() {
    const [templates, setTemplates] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<TemplateRow[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <SiteNav />
            <section className="section">
                <div className="container">
                    <h2>Templat Kad Kahwin</h2>
                    <p className="sub">Setiap templat direka dengan animasi tatal yang menawan. Klik untuk pratonton penuh.</p>

                    {loading ? (
                        <div className="loading-screen"><div className="spinner" /></div>
                    ) : (
                        <div className="tpl-grid">
                            {templates.map((t) => {
                                return (
                                    <div className="tpl-card" key={t.id}>
                                        <Link to={`/templates/${t.key}`} className="tpl-thumb" aria-label={t.name}>
                                            <TemplateThumb name={t.name} category={t.category} palette={t.palette} />
                                        </Link>
                                        <div className="tpl-body">
                                            <div className="spread">
                                                <h3>{t.name}</h3>
                                                {t.tier === 'free'
                                                    ? <span className="badge badge-free">Percuma</span>
                                                    : <span className="badge badge-gold">RM{Number(t.price_myr)}</span>}
                                            </div>
                                            <p className="muted" style={{ fontSize: 13, margin: '4px 0 14px', minHeight: 34 }}>{t.description}</p>
                                            <div className="row">
                                                <Link to={`/templates/${t.key}`} className="btn btn-ghost btn-sm grow">
                                                    <Eye size={15} /> Pratonton
                                                </Link>
                                                <Link to={`/register?tpl=${t.key}`} className="btn btn-primary btn-sm grow">Guna</Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
