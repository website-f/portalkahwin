import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Music } from 'lucide-react';
import { api } from '../lib/api';
import { getTemplate } from '../templates/registry';
import { SAMPLE_INVITATION } from '../templates/sampleData';
import type { InvitationData, Palette, WishlistItem } from '../templates/types';
import type { CustomTemplateConfig } from '../templates/customConfig';
import { CardActionBar } from '../components/CardActionBar';
import { WishlistView } from '../components/WishlistView';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import { useLang, dict } from '../context/LangContext';

interface TemplateRow { key: string; base_key?: string | null; palette?: Palette | null; config?: CustomTemplateConfig | null; }

/** Dummy registry so the "Gift registry" tab isn't a dead end in the preview. */
const PREVIEW_WISHLIST: WishlistItem[] = [
    { title: 'Set Pinggan Mangkuk', note: 'Warna putih & emas' },
    { title: 'Cadar Queen', note: 'Katun lembut' },
    { title: 'Periuk Nasi Elektrik' },
];

/** Every optional section switched on, so a preview shows the whole card. */
const ALL_SECTIONS: Record<string, boolean> = {
    opening: true, couple: true, date: true, program: true, location: true,
    wishes: true, wishlist: true, contacts: true, gift: true, gallery: true, rsvp: true,
};

export function TemplatePreviewPage() {
    const { key = 'floral' } = useParams();
    const { lang } = useLang();
    const [tpl, setTpl] = useState<TemplateRow | null>(null);
    const [loading, setLoading] = useState(true);

    const C = dict({
        bm: { back: 'Rekaan', sample: 'Pratonton · data contoh', use: 'Gunakan rekaan ini' },
        en: { back: 'Templates', sample: 'Preview · sample data', use: 'Use this template' },
        zh: { back: '请柬设计', sample: '预览 · 示例内容', use: '使用此设计' },
    }, lang);

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
        wishlist: PREVIEW_WISHLIST,
        sections: ALL_SECTIONS,
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

            {/* The real card, with every section on, so a visitor sees the whole thing. */}
            <div style={{ paddingTop: 58 }}>
                <Tpl
                    data={data}
                    slots={{ wishlist: <WishlistView items={PREVIEW_WISHLIST} /> }}
                />
            </div>

            {/* Demo background-music button + the live bottom action bar (preview-safe RSVP). */}
            <PreviewMusicFab />
            <CardActionBar data={data} slug="__preview__" rsvpEnabled preview />

            <MadeByPortalKahwin style={{ background: 'var(--cream)' }} />
        </div>
    );
}

/**
 * A self-contained "background music" button matching the live card's FAB, but
 * for a preview it never loads an external player — tapping just shows a small
 * note so a visitor understands their chosen song plays here on the real card.
 */
function PreviewMusicFab() {
    const { lang } = useLang();
    const L = dict({
        bm: { note: 'Muzik latar akan dimainkan di sini pada kad sebenar.' },
        en: { note: 'Your chosen song plays here on the real card.' },
        zh: { note: '在正式请柬上，您选择的歌曲会在这里播放。' },
    }, lang);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => setOpen(false), 3200);
        return () => clearTimeout(t);
    }, [open]);
    return (
        <>
            {open && (
                <div style={{
                    position: 'fixed', bottom: 150, right: 16, zIndex: 97, maxWidth: 220,
                    background: '#3d1a30', color: '#fff', fontSize: 12.5, lineHeight: 1.5,
                    padding: '9px 12px', borderRadius: 12, boxShadow: '0 12px 30px -10px rgba(0,0,0,0.5)',
                }}>
                    {L.note}
                </div>
            )}
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Muzik latar (pratonton)"
                style={{
                    position: 'fixed', bottom: 92, right: 16, zIndex: 97,
                    width: 52, height: 52, borderRadius: '50%', border: 'none',
                    background: '#3d1a30', color: '#fff', cursor: 'pointer',
                    boxShadow: '0 10px 26px rgba(0,0,0,0.35)', display: 'grid', placeItems: 'center',
                }}
            >
                <Music size={22} />
            </button>
        </>
    );
}
