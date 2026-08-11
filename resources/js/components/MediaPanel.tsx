import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Music, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../context/LangContext';

interface Props {
    invitationId: string;
    coverImage?: string | null;
    galleryImages?: string[] | null;
    musicUrl?: string | null;
    onSaved: (inv: any) => void;
}

export function MediaPanel({ invitationId, coverImage, galleryImages, musicUrl, onSaved }: Props) {
    const { lang } = useLang();
    const C = ({
        bm: {
            heading: 'Galeri, Gambar & Muzik',
            cover: 'Gambar Muka Depan',
            uploadPhoto: 'Muat naik gambar',
            gallery: 'Galeri',
            addPhoto: 'Tambah gambar',
            bgMusic: 'Muzik Latar (MP3)',
            uploadSong: 'Muat naik lagu',
            audioUrl: 'atau tampal URL audio…',
        },
        en: {
            heading: 'Gallery, Photos & Music',
            cover: 'Cover photo',
            uploadPhoto: 'Upload photo',
            gallery: 'Gallery',
            addPhoto: 'Add photo',
            bgMusic: 'Background music (MP3)',
            uploadSong: 'Upload song',
            audioUrl: 'or paste an audio URL…',
        },
    })[lang];
    const gallery = galleryImages ?? [];
    const [busy, setBusy] = useState<string | null>(null);
    const coverRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);
    const musicRef = useRef<HTMLInputElement>(null);

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
                        <img src={coverImage} alt="cover" style={{ width: 140, height: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }} />
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
                            <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
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
                    <div className="row">
                        <Music size={16} color="var(--plum)" />
                        <audio src={musicUrl} controls style={{ height: 34, flex: 1 }} />
                        <button className="btn btn-ghost btn-sm" onClick={() => persist({ music_url: null })}><X size={14} /></button>
                    </div>
                ) : (
                    <div className="row wrap">
                        <button className="btn btn-ghost btn-sm" onClick={() => musicRef.current?.click()} disabled={busy === 'music'}>
                            {busy === 'music' ? <Loader2 size={15} className="spin" /> : <Music size={15} />} {C.uploadSong}
                        </button>
                        <input placeholder={C.audioUrl} style={{ padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, font: 'inherit', flex: 1, minWidth: 160 }}
                            onKeyDown={(e) => { if (e.key === 'Enter') persist({ music_url: (e.target as HTMLInputElement).value }); }} />
                    </div>
                )}
                <input ref={musicRef} type="file" accept="audio/*" hidden onChange={onMusic} />
            </div>
        </div>
    );
}

const remove: React.CSSProperties = {
    position: 'absolute', top: -8, right: -8, width: 24, height: 24, padding: 0, borderRadius: '50%',
    background: 'var(--bad)', color: '#fff', display: 'grid', placeItems: 'center',
};
