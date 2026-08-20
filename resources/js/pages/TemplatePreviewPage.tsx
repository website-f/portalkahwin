import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Music } from 'lucide-react';
import { api } from '../lib/api';
import { getTemplate } from '../templates/registry';
import { CardStage } from '../templates/PkSec';
import { sampleFor, previewCountdownIso } from '../templates/sampleData';
import { artFor } from '../templates/templateArt';
import { readablePalette } from '../lib/contrast';
import type { InvitationData, Palette, WishlistItem } from '../templates/types';
import type { CustomTemplateConfig } from '../templates/customConfig';
import { CardActionBar } from '../components/CardActionBar';
import { CardAtmosphere } from '../components/CardAtmosphere';
import { MusicPlayer } from '../components/MusicPlayer';
import { mediaUrl } from '../lib/base';
import { WishlistView } from '../components/WishlistView';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import { resolvePreviewSong, songGenre, galleryGenre, type PreviewSongSettings } from '../lib/previewSong';
import { useLang, dict } from '../context/LangContext';

interface TemplateRow { key: string; base_key?: string | null; category?: string | null; kind?: string | null; languages?: string[] | null; palette?: Palette | null; config?: CustomTemplateConfig | null; }

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
    // Default background song (set by the admin) so a visitor hears that cards carry music.
    const [songSettings, setSongSettings] = useState<PreviewSongSettings | null>(null);
    // Sample gallery photos (set by the admin) so the Gallery section isn't empty
    // in preview. Kept per-genre (malay|chinese|indian|event) with the old flat
    // list as a shared fallback for genres the admin hasn't filled.
    const [galleryByGenre, setGalleryByGenre] = useState<Record<string, string[]>>({});
    const [galleryLegacy, setGalleryLegacy] = useState<string[]>([]);
    // Superadmin default: show 1 inviting family or 2 in the preview.
    const [oneFamily, setOneFamily] = useState(false);
    // Admin-set countdown target so the preview countdown visibly ticks.
    const [countdownAt, setCountdownAt] = useState<string>('');

    const C = dict({
        bm: { back: 'Rekaan', sample: 'Pratonton · data contoh', use: 'Gunakan rekaan ini' },
        en: { back: 'Templates', sample: 'Preview · sample data', use: 'Use this template' },
        zh: { back: '请柬设计', sample: '预览 · 示例内容', use: '使用此设计' },
    }, lang);

    useEffect(() => {
        api.get<PreviewSongSettings & { preview_gallery_images?: string[]; preview_gallery_by_genre?: Record<string, string[]>; default_parent_families?: string; preview_countdown_at?: string }>('/settings')
            .then((r) => {
                setSongSettings(r.data);
                setGalleryLegacy(Array.isArray(r.data?.preview_gallery_images) ? r.data.preview_gallery_images : []);
                const byGenre = r.data?.preview_gallery_by_genre;
                setGalleryByGenre(byGenre && typeof byGenre === 'object' && !Array.isArray(byGenre) ? byGenre : {});
                setOneFamily(String(r.data?.default_parent_families ?? '2') === '1');
                setCountdownAt(r.data?.preview_countdown_at ?? '');
            })
            .catch(() => { /* no default song / gallery configured */ });
    }, []);

    useEffect(() => {
        setLoading(true);
        api.get<TemplateRow>(`/templates/${key}`)
            .then((r) => setTpl(r.data))
            .catch(() => setTpl(null))
            .finally(() => setLoading(false));
    }, [key]);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    // A contributed / custom design renders with its base component (+ palette, or the full config for the no-code engine).
    const baseKey = tpl?.base_key || key;
    const Tpl = getTemplate(baseKey);
    // Match the LIVE card exactly: merge the design's art palette with the row's,
    // then run readablePalette so contrast is corrected (some rows store the
    // inverted ground/surface convention). Without this a preview could show, e.g.,
    // pale names on a pale panel that the real card renders correctly.
    const palette = readablePalette({
        ...(artFor(baseKey)?.palette ?? {}),
        ...(tpl?.palette ?? {}),
    }) as Palette;
    // Sample photos for this design's genre / event type, falling back to the
    // generic 'event' set (for events) and then the shared legacy set.
    const evType = (tpl?.config as { eventType?: string } | null | undefined)?.eventType ?? null;
    const isEvent = tpl?.kind === 'event' || (tpl?.category ?? '').toLowerCase() === 'event';
    const gGenre = galleryGenre({ category: tpl?.category, languages: tpl?.languages, templateKey: baseKey, kind: tpl?.kind, eventType: evType });
    const genreGallery = (galleryByGenre[gGenre]?.length ? galleryByGenre[gGenre]
        : isEvent && galleryByGenre['event']?.length ? galleryByGenre['event']
        : galleryLegacy) ?? [];
    // A future countdown target so Preview + Test mode visibly tick (the sample
    // event is otherwise "today"). Admin-configurable; falls back to 30 days out.
    const cdIso = previewCountdownIso(countdownAt);
    const data: InvitationData = {
        ...sampleFor({ category: tpl?.category, kind: tpl?.kind, languages: tpl?.languages }),
        wishlist: PREVIEW_WISHLIST,
        sections: ALL_SECTIONS,
        palette,
        akadAt: cdIso,
        receptionAt: cdIso,
        // Admin-uploaded sample photos so the Gallery section shows in preview.
        ...(genreGallery.length ? { galleryImages: genreGallery.map((u) => mediaUrl(u) ?? u) } : {}),
        // Superadmin "1 family" default: show only the groom's family in the preview.
        ...(oneFamily ? { brideParents: undefined, inviteSide: 'groom' as const } : {}),
        ...(tpl?.config ? { templateConfig: tpl.config } : {}),
    };
    // Default song for this preview, picked by the template's type.
    const genre = songGenre({ category: tpl?.category, languages: tpl?.languages, templateKey: baseKey });
    const song = resolvePreviewSong(songSettings, data.kind, data.eventType ?? (tpl?.config as { eventType?: string } | null | undefined)?.eventType ?? null, genre);

    return (
        <div>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, height: 58,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px',
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)',
            }}>
                <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> {C.back}</Link>
                <span className="muted" style={{ fontSize: 13 }}>{C.sample}</span>
                <Link to={`/register-new-user?tpl=${key}`} className="btn btn-primary btn-sm">{C.use}</Link>
            </div>

            {/* The real card, with every section on and the SAME shared atmosphere
                (texture, ornaments, drift, frame, vignette) the live card renders —
                so a preview looks exactly like what the host will publish. */}
            <div style={{ paddingTop: 58 }}>
                <CardAtmosphere
                    templateKey={tpl?.base_key || key}
                    palette={data.palette}
                    motionFile={data.motionFile}
                    motionTint={data.motionTint}
                >
                    {/* Wrap in CardStage so the preview honours the default section
                        order (place → atur cara …) exactly like the live card. */}
                    <CardStage order={data.sectionOrder} hidden={undefined} fontId={data.fontId}>
                        <Tpl
                            data={data}
                            slots={{ wishlist: <WishlistView items={PREVIEW_WISHLIST} /> }}
                        />
                    </CardStage>
                </CardAtmosphere>
            </div>

            {/* A real default song when the admin set one (so a visitor hears cards
                carry music), otherwise the informational note. */}
            {song ? <MusicPlayer src={mediaUrl(song.url) ?? song.url} start={song.start} end={song.end} /> : <PreviewMusicFab />}
            <CardActionBar data={data} slug="__preview__" rsvpEnabled preview />

            {/* Bottom padding clears the fixed action bar so the credit stays visible. */}
            <MadeByPortalKahwin style={{ paddingBottom: 100 }} />
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
