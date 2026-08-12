import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { SiteNav } from '../components/SiteNav';
import { TemplateThumb } from '../components/TemplateThumb';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

interface TemplateRow {
    id: string;
    key: string;
    name: string;
    category: string;
    description?: string;
    tier: 'free' | 'premium';
    price_myr: string | number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
}

export function TemplatesGallery() {
    const { lang } = useLang();
    const [templates, setTemplates] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const C = dict({
        bm: {
            title: 'Koleksi Kad Kahwin',
            subtitle: 'Setiap rekaan hadir dengan gerak halus dan suasana tersendiri. Buka pratonton untuk melihat keseluruhan jemputan.',
            free: 'Percuma',
            preview: 'Pratonton',
            use: 'Gunakan',
        },
        en: {
            title: 'Wedding Card Templates',
            subtitle: 'Every template is designed with elegant scroll animation. Open a full preview before choosing.',
            free: 'Free',
            preview: 'Preview',
            use: 'Use',
        },
        zh: {
            title: '婚礼请柬设计',
            subtitle: '每款设计都配有细腻的滚动动画与独特氛围。选择前可先浏览完整预览。',
            free: '免费',
            preview: '预览',
            use: '使用',
        },
    }, lang);

    useEffect(() => {
        api.get<TemplateRow[]>('/templates').then((r) => setTemplates(r.data)).finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <SiteNav />
            <section className="section">
                <div className="container">
                    <h2>{C.title}</h2>
                    <p className="sub">{C.subtitle}</p>

                    {loading ? (
                        <div className="loading-screen"><div className="spinner" /></div>
                    ) : (
                        <div className="tpl-grid">
                            {templates.map((t) => {
                                return (
                                    <div className="tpl-card" key={t.id}>
                                        <Link to={`/templates/${t.key}`} className="tpl-thumb" aria-label={t.name}>
                                            <TemplateThumb name={t.name} category={t.category} palette={t.palette} thumbnail={t.thumbnail} />
                                        </Link>
                                        <div className="tpl-body">
                                            <div className="tpl-head">
                                                <h3>{t.name}</h3>
                                                {t.tier === 'free'
                                                    ? <span className="badge badge-free">{C.free}</span>
                                                    : <span className="badge badge-gold">RM{Number(t.price_myr)}</span>}
                                            </div>
                                            <p className="muted" style={{ fontSize: 13, margin: '4px 0 14px', minHeight: 34 }}>{t.description}</p>
                                            <div className="tpl-actions">
                                                <Link to={`/templates/${t.key}`} className="btn btn-ghost btn-sm">
                                                    <Eye size={15} /> {C.preview}
                                                </Link>
                                                <Link to={`/register?tpl=${t.key}`} className="btn btn-primary btn-sm">{C.use}</Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
            <MadeByPortalKahwin style={{ paddingBottom: 32 }} />
        </div>
    );
}
