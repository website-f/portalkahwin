import { useEffect, useRef, useState } from 'react';
import { mediaUrl } from '../lib/base';
import { Upload, X, Image as ImageIcon, Music, Loader2, ListMusic } from 'lucide-react';
import { api } from '../lib/api';
import { youtubeId } from './MusicPlayer';
import { useLang, dict } from '../context/LangContext';

/** Whole seconds → m:ss for the track duration shown to hosts. */
const fmtDur = (s: number): string => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

interface Props {
    invitationId: string;
    coverImage?: string | null;
    galleryImages?: string[] | null;
    musicUrl?: string | null;
    motionFile?: string | null;
    motionTint?: boolean;
    onSaved: (inv: any) => void;
}

export function MediaPanel({ invitationId, coverImage, galleryImages, musicUrl, motionFile, motionTint, onSaved }: Props) {
    const { lang } = useLang();
    const C = dict({
        bm: {
            heading: 'Galeri, Gambar & Muzik',
            cover: 'Gambar pembuka',
            uploadPhoto: 'Muat naik gambar',
            gallery: 'Galeri',
            addPhoto: 'Tambah gambar',
            bgMusic: 'Lagu latar (MP3 atau YouTube)',
            uploadSong: 'Muat naik lagu',
            audioUrl: 'atau tampal URL audio / YouTube…',
            ytHint: 'Pautan YouTube dimainkan sebagai audio latar sahaja — video tidak dipaparkan pada kad.',
            ytAudio: 'Audio latar YouTube',
        },
        en: {
            heading: 'Gallery, Photos & Music',
            cover: 'Cover photo',
            uploadPhoto: 'Upload photo',
            gallery: 'Gallery',
            addPhoto: 'Add photo',
            bgMusic: 'Background music (MP3 or YouTube)',
            motion: 'Card animation', motionNone: 'No animation',
            motionTintLabel: 'Recolour to match the card palette',
            motionHint: 'A decorative moving layer behind the card. It does not play for guests who ask for reduced motion.',
            pickPreset: 'Pick from the library', noPresets: 'No tracks in the library yet.', useThis: 'Use',
            uploadSong: 'Upload song',
            audioUrl: 'or paste an audio / YouTube URL…',
            ytHint: 'A YouTube link plays as background audio only — the video is never shown on the card.',
            ytAudio: 'YouTube background audio',
        },
        zh: {
            heading: '相册、照片与音乐',
            cover: '封面照片',
            uploadPhoto: '上传照片',
            gallery: '相册',
            addPhoto: '添加照片',
            bgMusic: '背景音乐（MP3 或 YouTube）',
            motion: '请柬动效', motionNone: '不使用动效',
            motionTintLabel: '按请柬配色重新着色',
            motionHint: '请柬背后的装饰动效。为选择减少动态效果的宾客不会播放。',
            pickPreset: '从曲库中选择', noPresets: '曲库暂无曲目。', useThis: '使用',
            uploadSong: '上传音乐',
            audioUrl: '或粘贴音频 / YouTube 链接…',
            ytHint: 'YouTube 链接仅作背景音乐播放，请柬上不会显示视频画面。',
            ytAudio: 'YouTube 背景音乐',
        },
    }, lang);
    const gallery = galleryImages ?? [];
    const [busy, setBusy] = useState<string | null>(null);
    const coverRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);
    const musicRef = useRef<HTMLInputElement>(null);

    // The curated library: most couples have no track in mind, and pasting a
    // YouTube link is the step they most often get wrong.
    const [presets, setPresets] = useState<{ id: string; title: string; artist?: string | null; url: string; start_sec?: number; end_sec?: number | null; duration_sec?: number | null }[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Card animations are files on disk, so the list is whatever has been
    // dropped into public/lottie — empty until the first one is added.
    const [motions, setMotions] = useState<{ file: string; label: string; size_kb: number }[]>([]);
    useEffect(() => {
        api.get<typeof motions>('/motions').then((r) => setMotions(r.data)).catch(() => setMotions([]));
    }, []);
    useEffect(() => {
        api.get<typeof presets>('/music-presets').then((r) => setPresets(r.data)).catch(() => setPresets([]));
    }, []);

    async function uploadFile(file: File): Promise<string> {
        const fd = new FormData();
        fd.append('file', file);
        const r = await api.post(`/invitations/${invitationId}/upload`, fd);
        return r.data.url as string;
    }

    async function persist(patch: Record<string, unknown>) {
        const r = await api.put(`/invitations/${invitationId}`, patch);
        onSaved(r.data);
    }

    async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy('cover');
        try { await persist({ cover_image: await uploadFile(file) }); }
        finally { setBusy(null); if (coverRef.current) coverRef.current.value = ''; }
    }

    async function onGallery(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setBusy('gallery');
        try {
            const urls: string[] = [];
            for (const f of files) urls.push(await uploadFile(f));
            await persist({ gallery_images: [...gallery, ...urls] });
        } finally { setBusy(null); if (galleryRef.current) galleryRef.current.value = ''; }
    }

    async function onMusic(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy('music');
        try { await persist({ music_url: await uploadFile(file) }); }
        finally { setBusy(null); if (musicRef.current) musicRef.current.value = ''; }
    }

    return (
        <div className="panel">
            <h3>{C.heading}</h3>

            {/* Cover */}
            <div className="field">
                <label>{C.cover}</label>
                {coverImage ? (
                    <div style={{ position: 'relative', width: 140 }}>
                        <img src={mediaUrl(coverImage)} alt="cover" style={{ width: 140, height: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }} />
                        <button className="btn btn-sm" onClick={() => persist({ cover_image: null })} style={remove}><X size={13} /></button>
                    </div>
                ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => coverRef.current?.click()} disabled={busy === 'cover'}>
                        {busy === 'cover' ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} {C.uploadPhoto}
                    </button>
                )}
                <input ref={coverRef} type="file" accept="image/*" hidden onChange={onCover} />
            </div>

            {/* Gallery */}
            <div className="field">
                <label>{C.gallery} ({gallery.length})</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {gallery.map((url) => (
                        <div key={url} style={{ position: 'relative' }}>
                            <img src={mediaUrl(url)} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                            <button className="btn btn-sm" onClick={() => persist({ gallery_images: gallery.filter((g) => g !== url) })} style={remove}><X size={12} /></button>
                        </div>
                    ))}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => galleryRef.current?.click()} disabled={busy === 'gallery'}>
                    {busy === 'gallery' ? <Loader2 size={15} className="spin" /> : <ImageIcon size={15} />} {C.addPhoto}
                </button>
                <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onGallery} />
            </div>

            {/* Music */}
            <div className="field">
                <label>{C.bgMusic}</label>
                {musicUrl ? (
                    youtubeId(musicUrl) ? (
                        <div className="row" style={{ gap: 8 }}>
                            <Music size={18} color="#d11" />
                            <a href={musicUrl} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--plum)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {C.ytAudio}
                            </a>
                            <button className="btn btn-ghost btn-sm" onClick={() => persist({ music_url: null })}><X size={14} /></button>
                        </div>
                    ) : (
                        <div className="row">
                            <Music size={16} color="var(--plum)" />
                            <audio src={musicUrl} controls style={{ height: 34, flex: 1 }} />
                            <button className="btn btn-ghost btn-sm" onClick={() => persist({ music_url: null })}><X size={14} /></button>
                        </div>
                    )
                ) : (
                    <div className="row wrap">
                        <button className="btn btn-ghost btn-sm" onClick={() => setPickerOpen((v) => !v)} aria-expanded={pickerOpen}>
                            <ListMusic size={15} /> {C.pickPreset}
                            {presets.length > 0 && <span className="badge" style={{ marginLeft: 6 }}>{presets.length}</span>}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => musicRef.current?.click()} disabled={busy === 'music'}>
                            {busy === 'music' ? <Loader2 size={15} className="spin" /> : <Music size={15} />} {C.uploadSong}
                        </button>
                        <input placeholder={C.audioUrl} style={{ padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, font: 'inherit', flex: 1, minWidth: 160 }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v) persist({ music_url: v }); } }}
                            onBlur={(e) => { const v = e.target.value.trim(); if (v) persist({ music_url: v }); }} />
                    </div>
                )}
                {pickerOpen && !musicUrl && (
                    <div style={{
                        marginTop: 10, border: '1px solid var(--line)', borderRadius: 12,
                        maxHeight: 220, overflowY: 'auto', background: '#fff',
                    }}>
                        {presets.length === 0 ? (
                            <p className="muted" style={{ margin: 0, padding: 14, fontSize: 13 }}>{C.noPresets}</p>
                        ) : presets.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                className="btn btn-ghost btn-sm btn-block"
                                style={{ justifyContent: 'space-between', borderRadius: 0, gap: 8 }}
                                onClick={() => { setPickerOpen(false); void persist({ music_url: m.url, music_start: m.start_sec ?? 0, music_end: m.end_sec ?? null }); }}
                            >
                                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                    {m.title}{m.artist ? <span className="muted"> · {m.artist}</span> : null}
                                </span>
                                <span className="row" style={{ flex: 'none', gap: 8, alignItems: 'center' }}>
                                    {m.duration_sec ? <span className="muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmtDur(m.duration_sec)}</span> : null}
                                    <span style={{ color: 'var(--plum)' }}>{C.useThis}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <small className="muted" style={{ display: 'block', marginTop: 6 }}>{C.ytHint}</small>
                <input ref={musicRef} type="file" accept="audio/*" hidden onChange={onMusic} />
            </div>

            {/* Motion — only offered once an animation exists to offer. */}
            {motions.length > 0 && (
                <div className="field">
                    <label>{C.motion}</label>
                    <select
                        value={motionFile ?? ''}
                        onChange={(e) => persist({ motion_file: e.target.value || null })}
                    >
                        <option value="">{C.motionNone}</option>
                        {motions.map((m) => (
                            <option key={m.file} value={m.file}>{m.label} · {m.size_kb} KB</option>
                        ))}
                    </select>
                    {motionFile && (
                        <label className="row" style={{ fontSize: 13.5, marginTop: 8 }}>
                            <input
                                type="checkbox"
                                checked={motionTint !== false}
                                onChange={(e) => persist({ motion_tint: e.target.checked })}
                            />
                            {C.motionTintLabel}
                        </label>
                    )}
                    <small className="muted" style={{ display: 'block', marginTop: 6 }}>{C.motionHint}</small>
                </div>
            )}
        </div>
    );
}

const remove: React.CSSProperties = {
    position: 'absolute', top: -8, right: -8, width: 24, height: 24, padding: 0, borderRadius: '50%',
    background: 'var(--bad)', color: '#fff', display: 'grid', placeItems: 'center',
};
