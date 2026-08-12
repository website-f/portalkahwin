import {
    useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Eye, Save, Send, Check, X, Loader2, Clock, Upload,
    Palette as PaletteIcon, BookOpen, Sparkles, Flower2, LayoutGrid, FileText,
} from 'lucide-react';
import { api } from '../../lib/api';
import { EditorSheet } from '../../components/EditorSheet';
import { useLang } from '../../context/LangContext';
import { useAuth, isStaff } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { getTemplate } from '../../templates/registry';
import { SAMPLE_INVITATION } from '../../templates/sampleData';
import {
    CUSTOM_SECTIONS, DEFAULT_CUSTOM_CONFIG, normalizeConfig,
    type CustomTemplateConfig, type CustomPalette, type CustomSectionConfig,
    type CoverReveal, type AmbientEffect, type DecorationStyle, type HeadingFont,
} from '../../templates/customConfig';

type DesignStatus = 'draft' | 'pending' | 'approved' | 'rejected';

interface Design {
    id: string;
    key: string;
    name: string;
    category?: string | null;
    description?: string | null;
    status: DesignStatus;
    thumbnail?: string | null;
    config?: Partial<CustomTemplateConfig> | null;
}

interface PublicSettings { allow_user_templates: boolean }

type TabId = 'tema' | 'kulit' | 'kesan' | 'hiasan' | 'bahagian' | 'butiran';

const TAB_ICON: Record<TabId, ReactNode> = {
    tema: <PaletteIcon size={19} />,
    kulit: <BookOpen size={19} />,
    kesan: <Sparkles size={19} />,
    hiasan: <Flower2 size={19} />,
    bahagian: <LayoutGrid size={19} />,
    butiran: <FileText size={19} />,
};
const TAB_ORDER: TabId[] = ['tema', 'kulit', 'kesan', 'hiasan', 'bahagian', 'butiran'];

/** Coerce any colour value into a #rrggbb hex an <input type="color"> accepts. */
function toHex(v: string | undefined | null, fallback: string): string {
    if (!v) return fallback;
    const s = v.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) return ('#' + s.slice(1).split('').map((c) => c + c).join('')).toLowerCase();
    return fallback;
}

export function Designer() {
    const { id } = useParams();
    const { lang } = useLang();
    const { user } = useAuth();
    const dialog = useDialog();
    const nav = useNavigate();
    const isAdmin = isStaff(user);

    const C = ({
        bm: {
            back: 'Kembali', newTitle: 'Reka Baharu',
            preview: 'Pratonton', saveDraft: 'Simpan Draf', saved: 'Disimpan', saving: 'Menyimpan…',
            publish: 'Terbitkan', submitReview: 'Hantar untuk Semakan', submitting: 'Menghantar…',
            close: 'Tutup',
            closedTitle: 'Ciri ini belum dibuka',
            closedBody: 'Reka rekaan komuniti belum diaktifkan buat masa ini. Sila kembali kemudian — kami akan membukanya tidak lama lagi.',
            nameRequired: 'Sila beri nama untuk rekaan anda dahulu.',
            publishedTitle: 'Rekaan diterbitkan!', publishedBody: 'Rekaan anda kini tersedia untuk semua pengguna.',
            submittedTitle: 'Rekaan dihantar!', submittedBody: 'Terima kasih. Rekaan anda kini menunggu semakan admin.',
            tabs: { tema: 'Tema', kulit: 'Kulit', kesan: 'Kesan', hiasan: 'Hiasan', bahagian: 'Bahagian', butiran: 'Butiran' } as Record<TabId, string>,
            subs: {
                tema: 'Warna & fon tajuk', kulit: 'Animasi buka kad', kesan: 'Kesan halus latar',
                hiasan: 'Hiasan tepi & sudut', bahagian: 'Hidup/mati, latar & animasi setiap bahagian',
                butiran: 'Nama, kategori & keamatan animasi',
            } as Record<TabId, string>,
            colors: { primary: 'Utama', secondary: 'Sokongan', accent: 'Aksen', bg: 'Latar', text: 'Teks' } as Record<keyof CustomPalette, string>,
            headingFont: 'Fon tajuk',
            fonts: {
                serif: 'Serif', sans: 'Sans', script: 'Skrip',
                elegant: 'Elegan', modern: 'Moden', custom: 'Tersuai',
            } as Record<HeadingFont, string>,
            uploadFont: 'Muat naik fon tersuai', removeFont: 'Buang fon',
            reveal: 'Gaya buka', accentColor: 'Warna aksen',
            reveals: { plain: 'Biasa', curtain: 'Tirai', envelope: 'Sampul', zoom: 'Zum', blinds: 'Bidai' } as Record<CoverReveal, string>,
            effectType: 'Jenis kesan', color: 'Warna', density: 'Ketumpatan',
            effects: {
                none: 'Tiada', petals: 'Kelopak', sakura: 'Sakura', hearts: 'Hati', stars: 'Bintang',
                sparkles: 'Kilauan', snow: 'Salji', leaves: 'Daun', bubbles: 'Buih', confetti: 'Konfeti',
                fireflies: 'Kelip-kelip', butterflies: 'Rama-rama', bokeh: 'Bokeh', dust: 'Serbuk Emas',
            } as Record<AmbientEffect, string>,
            decoStyle: 'Gaya hiasan',
            decos: {
                none: 'Tiada', cornerFloral: 'Bunga Sudut', roots: 'Akar', leaves: 'Dedaun',
                geometric: 'Geometri', goldFrame: 'Bingkai Emas', arch: 'Gerbang',
                lantern: 'Tanglung', artdeco: 'Art Deco', moroccan: 'Maghribi',
            } as Record<DecorationStyle, string>,
            uploadImage: 'Muat naik imej',
            sections: {
                opening: 'Kata Aluan', couple: 'Pengantin', date: 'Tarikh', program: 'Atur Cara',
                location: 'Lokasi', wishes: 'Ucapan', wishlist: 'Senarai Hadiah', contacts: 'Hubungi',
                gift: 'Salam Kaut', gallery: 'Galeri',
            } as Record<string, string>,
            background: 'Latar', animation: 'Animasi masuk',
            bgTypes: { none: 'Tiada', color: 'Warna', gradient: 'Gradien', image: 'Imej' } as Record<CustomSectionConfig['bg']['type'], string>,
            stop1: 'Warna 1', stop2: 'Warna 2', angle: 'Sudut', imageUrl: 'Pautan imej',
            anims: { none: 'Tiada', fade: 'Reda', slideUp: 'Naik', slideLeft: 'Kiri', zoom: 'Zum' } as Record<CustomSectionConfig['animation'], string>,
            secHint: 'Bahagian yang dimatikan tidak akan dipaparkan pada kad.',
            name: 'Nama rekaan', namePh: 'cth. Lavender Impian',
            category: 'Kategori', catPh: 'cth. floral', description: 'Penerangan', descOptional: '(pilihan)',
            descPh: 'Ceritakan sedikit tentang rekaan anda…',
            motion: 'Keamatan animasi', motions: { calm: 'Tenang', lively: 'Rancak' } as Record<CustomTemplateConfig['motion'], string>,
            adminNote: 'Sebagai admin, “Terbitkan” akan menjadikan rekaan ini terus tersedia untuk semua.',
            userNote: 'Rekaan yang dihantar akan disemak oleh admin sebelum diterbitkan.',
        },
        en: {
            back: 'Back', newTitle: 'New Design',
            preview: 'Preview', saveDraft: 'Save Draft', saved: 'Saved', saving: 'Saving…',
            publish: 'Publish', submitReview: 'Submit for Review', submitting: 'Submitting…',
            close: 'Close',
            closedTitle: 'This feature isn’t open yet',
            closedBody: 'Community design creation isn’t enabled right now. Please check back later — we’ll open it soon.',
            nameRequired: 'Please give your design a name first.',
            publishedTitle: 'Design published!', publishedBody: 'Your design is now available to everyone.',
            submittedTitle: 'Design submitted!', submittedBody: 'Thank you. Your design is now awaiting admin review.',
            tabs: { tema: 'Theme', kulit: 'Cover', kesan: 'Effect', hiasan: 'Decoration', bahagian: 'Sections', butiran: 'Details' } as Record<TabId, string>,
            subs: {
                tema: 'Colours & heading font', kulit: 'Card reveal animation', kesan: 'Ambient background effect',
                hiasan: 'Side & corner ornaments', bahagian: 'Per-section on/off, background & animation',
                butiran: 'Name, category & motion intensity',
            } as Record<TabId, string>,
            colors: { primary: 'Primary', secondary: 'Secondary', accent: 'Accent', bg: 'Background', text: 'Text' } as Record<keyof CustomPalette, string>,
            headingFont: 'Heading font',
            fonts: {
                serif: 'Serif', sans: 'Sans', script: 'Script',
                elegant: 'Elegant', modern: 'Modern', custom: 'Custom',
            } as Record<HeadingFont, string>,
            uploadFont: 'Upload custom font', removeFont: 'Remove font',
            reveal: 'Reveal style', accentColor: 'Accent colour',
            reveals: { plain: 'Plain', curtain: 'Curtain', envelope: 'Envelope', zoom: 'Zoom', blinds: 'Blinds' } as Record<CoverReveal, string>,
            effectType: 'Effect type', color: 'Colour', density: 'Density',
            effects: {
                none: 'None', petals: 'Petals', sakura: 'Sakura', hearts: 'Hearts', stars: 'Stars',
                sparkles: 'Sparkles', snow: 'Snow', leaves: 'Leaves', bubbles: 'Bubbles', confetti: 'Confetti',
                fireflies: 'Fireflies', butterflies: 'Butterflies', bokeh: 'Bokeh', dust: 'Golden Dust',
            } as Record<AmbientEffect, string>,
            decoStyle: 'Decoration style',
            decos: {
                none: 'None', cornerFloral: 'Corner Floral', roots: 'Roots', leaves: 'Leaves',
                geometric: 'Geometric', goldFrame: 'Gold Frame', arch: 'Arch',
                lantern: 'Lanterns', artdeco: 'Art Deco', moroccan: 'Moroccan',
            } as Record<DecorationStyle, string>,
            uploadImage: 'Upload image',
            sections: {
                opening: 'Opening', couple: 'The Couple', date: 'Date', program: 'Run of Show',
                location: 'Location', wishes: 'Wishes', wishlist: 'Gift Registry', contacts: 'Contacts',
                gift: 'Cash Gift', gallery: 'Gallery',
            } as Record<string, string>,
            background: 'Background', animation: 'Scroll-in animation',
            bgTypes: { none: 'None', color: 'Colour', gradient: 'Gradient', image: 'Image' } as Record<CustomSectionConfig['bg']['type'], string>,
            stop1: 'Colour 1', stop2: 'Colour 2', angle: 'Angle', imageUrl: 'Image URL',
            anims: { none: 'None', fade: 'Fade', slideUp: 'Slide Up', slideLeft: 'Slide Left', zoom: 'Zoom' } as Record<CustomSectionConfig['animation'], string>,
            secHint: 'Sections switched off will not appear on the card.',
            name: 'Design name', namePh: 'e.g. Lavender Dream',
            category: 'Category', catPh: 'e.g. floral', description: 'Description', descOptional: '(optional)',
            descPh: 'Tell us a little about your design…',
            motion: 'Motion intensity', motions: { calm: 'Calm', lively: 'Lively' } as Record<CustomTemplateConfig['motion'], string>,
            adminNote: 'As an admin, “Publish” makes this design instantly available to everyone.',
            userNote: 'Submitted designs are reviewed by an admin before going live.',
        },
    })[lang];

    // ------------------------------------------------------------------
    const [allow, setAllow] = useState<boolean | null>(null);
    const [loading, setLoading] = useState<boolean>(!!id);
    const [config, setConfig] = useState<CustomTemplateConfig>(() => normalizeConfig(DEFAULT_CUSTOM_CONFIG));
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [designId, setDesignId] = useState('');
    const [status, setStatus] = useState<DesignStatus>('draft');

    const [openTab, setOpenTab] = useState<TabId | null>(null);
    const [fsOpen, setFsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [nameError, setNameError] = useState(false);

    // Upload progress state
    const [fontUploading, setFontUploading] = useState(false);
    const [imgUploading, setImgUploading] = useState<Set<string>>(() => new Set());
    const fontInputRef = useRef<HTMLInputElement>(null);
    const imgInputs = useRef<Record<string, HTMLInputElement | null>>({});

    const loadedId = useRef<string | null>(null);

    // Public settings gate — admins are always allowed.
    useEffect(() => {
        api.get<PublicSettings>('/settings')
            .then((r) => setAllow(!!r.data?.allow_user_templates))
            .catch(() => setAllow(false));
    }, []);

    // Load an existing design for editing (skips when we already loaded this id,
    // e.g. right after the first save replaces the URL with the new id).
    useEffect(() => {
        if (!id) { setLoading(false); return; }
        if (loadedId.current === id) return;
        loadedId.current = id;
        setLoading(true);
        api.get<Design>(`/me/designs/${id}`).then((r) => {
            const d = r.data;
            setDesignId(d.id);
            setName(d.name ?? '');
            setCategory(d.category && d.category !== 'custom' ? d.category : '');
            setDescription(d.description ?? '');
            setStatus(d.status ?? 'draft');
            setConfig(normalizeConfig(d.config));
        }).finally(() => setLoading(false));
    }, [id]);

    // Lock body scroll while the full-screen preview is open.
    useEffect(() => {
        if (!fsOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setFsOpen(false); }
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener('keydown', onKey);
        };
    }, [fsOpen]);

    // ---- config mutators ----
    const setPal = (k: keyof CustomPalette, v: string) =>
        setConfig((c) => ({ ...c, palette: { ...c.palette, [k]: v } }));
    const setCover = (p: Partial<CustomTemplateConfig['cover']>) =>
        setConfig((c) => ({ ...c, cover: { ...c.cover, ...p } }));
    const setEffect = (p: Partial<CustomTemplateConfig['effect']>) =>
        setConfig((c) => ({ ...c, effect: { ...c.effect, ...p } }));
    const setDeco = (p: Partial<CustomTemplateConfig['decoration']>) =>
        setConfig((c) => ({ ...c, decoration: { ...c.decoration, ...p } }));
    const setSection = (key: string, p: Partial<CustomSectionConfig>) =>
        setConfig((c) => ({ ...c, sections: { ...c.sections, [key]: { ...c.sections[key], ...p } } }));
    const setSectionBg = (key: string, p: Partial<CustomSectionConfig['bg']>) =>
        setConfig((c) => {
            const s = c.sections[key];
            return { ...c, sections: { ...c.sections, [key]: { ...s, bg: { ...s.bg, ...p } } } };
        });

    // ---- uploads (fonts + section images) ----
    async function uploadFile(file: File): Promise<string | null> {
        const fd = new FormData();
        fd.append('file', file);
        const r = await api.post<{ url: string }>('/me/designs/upload', fd);
        return r.data?.url ?? null;
    }

    async function handleFontUpload(file: File) {
        setFontUploading(true);
        try {
            const url = await uploadFile(file);
            if (url) {
                setConfig((c) => ({ ...c, headingFontUrl: url, headingFontName: file.name, heading: 'custom' }));
            }
        } finally {
            setFontUploading(false);
        }
    }

    const clearFont = () =>
        setConfig((c) => ({ ...c, headingFontUrl: undefined, headingFontName: undefined, heading: 'serif' }));

    async function handleSectionImage(key: string, file: File) {
        setImgUploading((s) => new Set(s).add(key));
        try {
            const url = await uploadFile(file);
            if (url) setSectionBg(key, { image: url });
        } finally {
            setImgUploading((s) => {
                const n = new Set(s);
                n.delete(key);
                return n;
            });
        }
    }

    // ---- persistence ----
    async function saveDraft(): Promise<string | null> {
        if (!name.trim()) {
            setNameError(true);
            setOpenTab('butiran');
            return null;
        }
        setSaving(true);
        const payload = {
            name: name.trim(),
            category: category.trim() || undefined,
            description: description.trim() || undefined,
            config,
        };
        try {
            if (designId) {
                const r = await api.put<Design>(`/me/designs/${designId}`, payload);
                setStatus(r.data.status ?? status);
                flashSaved();
                return designId;
            }
            const r = await api.post<Design>('/me/designs', payload);
            setDesignId(r.data.id);
            setStatus(r.data.status ?? 'draft');
            loadedId.current = r.data.id; // avoid a redundant GET when the URL updates
            nav(`/panel/designer/${r.data.id}`, { replace: true });
            flashSaved();
            return r.data.id;
        } finally {
            setSaving(false);
        }
    }

    function flashSaved() {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1800);
    }

    async function submit() {
        const savedId = await saveDraft();
        if (!savedId) return;
        setSubmitting(true);
        try {
            await api.post(`/me/designs/${savedId}/submit`);
            await dialog.alert({
                title: isAdmin ? C.publishedTitle : C.submittedTitle,
                message: isAdmin ? C.publishedBody : C.submittedBody,
            });
            nav('/panel/designs');
        } finally {
            setSubmitting(false);
        }
    }

    // ------------------------------------------------------------------
    if (allow === null || loading) {
        return <div className="loading-screen"><div className="spinner" /></div>;
    }

    // Non-admin, feature gated off.
    if (!isAdmin && !allow) {
        return (
            <div>
                <div className="page-head">
                    <h1>{C.newTitle}</h1>
                </div>
                <div className="panel" style={{ textAlign: 'center', padding: '46px 24px', maxWidth: 560, margin: '0 auto' }}>
                    <div style={closedIcon}><Clock size={26} /></div>
                    <h3 style={{ margin: '0 0 6px' }}>{C.closedTitle}</h3>
                    <p className="muted" style={{ margin: 0, fontSize: 14 }}>{C.closedBody}</p>
                </div>
            </div>
        );
    }

    const submitLabel = isAdmin ? C.publish : C.submitReview;

    return (
        <div className="dsn">
            <style>{DSN_CSS}</style>

            {/* ---------- Header ---------- */}
            <div className="dsn-head">
                <div className="dsn-head-l">
                    <button className="btn btn-ghost btn-sm" onClick={() => nav('/panel/designs')} aria-label={C.back}><ArrowLeft size={15} /></button>
                    <div className="dsn-title">
                        <h1>{name.trim() || C.newTitle}</h1>
                        <p><StatusBadge status={status} lang={lang} /></p>
                    </div>
                </div>
                <div className="dsn-head-r">
                    <button className="btn btn-ghost btn-sm" onClick={() => setFsOpen(true)}><Eye size={15} /> {C.preview}</button>
                    <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => void saveDraft()}>
                        {justSaved ? <><Check size={15} /> {C.saved}</> : <><Save size={15} /> {saving ? C.saving : C.saveDraft}</>}
                    </button>
                    <button className="btn btn-primary btn-sm" disabled={submitting || saving} onClick={() => void submit()}>
                        {submitting ? <Loader2 size={15} className="dsn-spin" /> : <Send size={15} />} {submitting ? C.submitting : submitLabel}
                    </button>
                </div>
            </div>

            {/* ---------- Preview hero ---------- */}
            <div className="dsn-stage">
                <ConfigPreview config={config} />
            </div>

            {/* ---------- Bottom dock ---------- */}
            <nav className="dsn-dock" aria-label={lang === 'bm' ? 'Alat reka' : 'Design tools'}>
                <div className="dsn-dock-track">
                    {TAB_ORDER.map((t) => (
                        <button key={t} className="dsn-tab" onClick={() => setOpenTab(t)} aria-haspopup="dialog" title={C.tabs[t]}>
                            {TAB_ICON[t]}
                            <span className="lbl">{C.tabs[t]}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* ---------- Tema ---------- */}
            <EditorSheet open={openTab === 'tema'} onClose={() => setOpenTab(null)} title={C.tabs.tema} subtitle={C.subs.tema}>
                <div className="dsn-swatches">
                    {(['primary', 'secondary', 'accent', 'bg', 'text'] as (keyof CustomPalette)[]).map((k) => (
                        <ColorField key={k} label={C.colors[k]} value={config.palette[k]} onChange={(v) => setPal(k, v)} />
                    ))}
                </div>
                <div className="dsn-glabel">{C.headingFont}</div>
                <Segmented<HeadingFont>
                    value={config.heading}
                    onChange={(v) => setConfig((c) => ({ ...c, heading: v }))}
                    options={(['serif', 'sans', 'script', 'elegant', 'modern'] as HeadingFont[]).map((f) => ({ id: f, label: C.fonts[f] }))}
                />
                <div className="dsn-fontup">
                    <input
                        ref={fontInputRef}
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleFontUpload(f);
                            e.target.value = '';
                        }}
                    />
                    {config.headingFontName ? (
                        <div className={`dsn-fontfile${config.heading === 'custom' && config.headingFontUrl ? ' is-on' : ''}`}>
                            <span
                                className="dsn-fontfile-name"
                                title={config.headingFontName}
                                style={config.headingFontUrl ? { fontFamily: "'pkcustomhead', serif" } : undefined}
                            >
                                {config.headingFontName}
                            </span>
                            <button type="button" className="dsn-fontfile-x" onClick={clearFont} aria-label={C.removeFont} title={C.removeFont}>
                                <X size={15} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="dsn-seg-btn dsn-upbtn"
                            disabled={fontUploading}
                            onClick={() => fontInputRef.current?.click()}
                        >
                            {fontUploading ? <Loader2 size={14} className="dsn-spin" /> : <Upload size={14} />} {C.uploadFont}
                        </button>
                    )}
                </div>
            </EditorSheet>

            {/* ---------- Kulit (Cover) ---------- */}
            <EditorSheet open={openTab === 'kulit'} onClose={() => setOpenTab(null)} title={C.tabs.kulit} subtitle={C.subs.kulit}>
                <div className="dsn-glabel">{C.reveal}</div>
                <CardPicker<CoverReveal>
                    value={config.cover.reveal}
                    onChange={(v) => setCover({ reveal: v })}
                    options={(['plain', 'curtain', 'envelope', 'zoom', 'blinds'] as CoverReveal[]).map((r) => ({ id: r, label: C.reveals[r] }))}
                />
                <div className="dsn-glabel">{C.accentColor}</div>
                <ColorField label={C.accentColor} value={toHex(config.cover.accentColor, config.palette.primary)} onChange={(v) => setCover({ accentColor: v })} />
            </EditorSheet>

            {/* ---------- Kesan (Effect) ---------- */}
            <EditorSheet open={openTab === 'kesan'} onClose={() => setOpenTab(null)} title={C.tabs.kesan} subtitle={C.subs.kesan}>
                <div className="dsn-glabel">{C.effectType}</div>
                <CardPicker<AmbientEffect>
                    value={config.effect.type}
                    onChange={(v) => setEffect({ type: v })}
                    options={(['none', 'petals', 'sakura', 'hearts', 'stars', 'sparkles', 'snow', 'leaves', 'bubbles', 'confetti', 'fireflies', 'butterflies', 'bokeh', 'dust'] as AmbientEffect[]).map((e) => ({ id: e, label: C.effects[e] }))}
                />
                {config.effect.type !== 'none' && (
                    <>
                        <div className="dsn-glabel">{C.color}</div>
                        <ColorField label={C.color} value={toHex(config.effect.color, config.palette.accent)} onChange={(v) => setEffect({ color: v })} />
                        <div className="dsn-glabel">{C.density}</div>
                        <RangeField min={4} max={24} value={config.effect.density} onChange={(v) => setEffect({ density: v })} />
                    </>
                )}
            </EditorSheet>

            {/* ---------- Hiasan (Decoration) ---------- */}
            <EditorSheet open={openTab === 'hiasan'} onClose={() => setOpenTab(null)} title={C.tabs.hiasan} subtitle={C.subs.hiasan}>
                <div className="dsn-glabel">{C.decoStyle}</div>
                <CardPicker<DecorationStyle>
                    value={config.decoration.style}
                    onChange={(v) => setDeco({ style: v })}
                    options={(['none', 'cornerFloral', 'roots', 'leaves', 'geometric', 'goldFrame', 'arch', 'lantern', 'artdeco', 'moroccan'] as DecorationStyle[]).map((d) => ({ id: d, label: C.decos[d] }))}
                />
                {config.decoration.style !== 'none' && (
                    <>
                        <div className="dsn-glabel">{C.color}</div>
                        <ColorField label={C.color} value={toHex(config.decoration.color, config.palette.accent)} onChange={(v) => setDeco({ color: v })} />
                    </>
                )}
            </EditorSheet>

            {/* ---------- Bahagian (Sections) ---------- */}
            <EditorSheet open={openTab === 'bahagian'} onClose={() => setOpenTab(null)} title={C.tabs.bahagian} subtitle={C.subs.bahagian}>
                <p className="dsn-hint">{C.secHint}</p>
                {CUSTOM_SECTIONS.map((key) => {
                    const sc = config.sections[key];
                    return (
                        <div className="dsn-secblock" key={key}>
                            <div className="dsn-toggle-row" style={{ borderBottom: 0, padding: '2px 0' }}>
                                <div className="dsn-toggle-label">{C.sections[key]}</div>
                                <Switch on={sc.enabled} label={C.sections[key]} onChange={(v) => setSection(key, { enabled: v })} />
                            </div>
                            {sc.enabled && (
                                <div className="dsn-secbody">
                                    <div className="dsn-sublabel">{C.background}</div>
                                    <Segmented<CustomSectionConfig['bg']['type']>
                                        value={sc.bg.type}
                                        onChange={(v) => setSectionBg(key, { type: v })}
                                        options={(['none', 'color', 'gradient', 'image'] as CustomSectionConfig['bg']['type'][]).map((b) => ({ id: b, label: C.bgTypes[b] }))}
                                    />
                                    {sc.bg.type === 'color' && (
                                        <div style={{ marginTop: 10 }}>
                                            <ColorField label={C.color} value={toHex(sc.bg.color, config.palette.bg)} onChange={(v) => setSectionBg(key, { color: v })} />
                                        </div>
                                    )}
                                    {sc.bg.type === 'gradient' && (
                                        <div className="dsn-grad">
                                            <ColorField label={C.stop1} value={toHex(sc.bg.color, config.palette.bg)} onChange={(v) => setSectionBg(key, { color: v })} />
                                            <ColorField label={C.stop2} value={toHex(sc.bg.color2, config.palette.accent)} onChange={(v) => setSectionBg(key, { color2: v })} />
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <div className="dsn-sublabel">{C.angle} · {sc.bg.angle ?? 135}°</div>
                                                <RangeField min={0} max={360} value={sc.bg.angle ?? 135} onChange={(v) => setSectionBg(key, { angle: v })} />
                                            </div>
                                        </div>
                                    )}
                                    {sc.bg.type === 'image' && (
                                        <div style={{ marginTop: 10, marginBottom: 0 }}>
                                            <div className="field" style={{ marginBottom: 10 }}>
                                                <label>{C.imageUrl}</label>
                                                <input type="url" inputMode="url" placeholder="https://…" value={sc.bg.image ?? ''} onChange={(e) => setSectionBg(key, { image: e.target.value })} />
                                            </div>
                                            <input
                                                ref={(el) => { imgInputs.current[key] = el; }}
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) void handleSectionImage(key, f);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="dsn-seg-btn dsn-upbtn"
                                                disabled={imgUploading.has(key)}
                                                onClick={() => imgInputs.current[key]?.click()}
                                            >
                                                {imgUploading.has(key) ? <Loader2 size={14} className="dsn-spin" /> : <Upload size={14} />} {C.uploadImage}
                                            </button>
                                        </div>
                                    )}
                                    <div className="dsn-sublabel" style={{ marginTop: 14 }}>{C.animation}</div>
                                    <Segmented<CustomSectionConfig['animation']>
                                        value={sc.animation}
                                        onChange={(v) => setSection(key, { animation: v })}
                                        options={(['none', 'fade', 'slideUp', 'slideLeft', 'zoom'] as CustomSectionConfig['animation'][]).map((a) => ({ id: a, label: C.anims[a] }))}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </EditorSheet>

            {/* ---------- Butiran (Details) ---------- */}
            <EditorSheet open={openTab === 'butiran'} onClose={() => setOpenTab(null)} title={C.tabs.butiran} subtitle={C.subs.butiran}>
                <div className="field">
                    <label>{C.name}</label>
                    <input
                        type="text"
                        value={name}
                        maxLength={80}
                        required
                        placeholder={C.namePh}
                        onChange={(e) => { setName(e.target.value); setNameError(false); }}
                        style={nameError ? { borderColor: 'var(--bad)' } : undefined}
                    />
                    {nameError && <p className="form-err" style={{ margin: '4px 0 0' }}>{C.nameRequired}</p>}
                </div>
                <div className="field">
                    <label>{C.category}</label>
                    <input type="text" value={category} maxLength={40} placeholder={C.catPh} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div className="field">
                    <label>{C.description} <span className="muted" style={{ fontWeight: 400 }}>{C.descOptional}</span></label>
                    <textarea rows={2} value={description} maxLength={200} placeholder={C.descPh} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="dsn-glabel">{C.motion}</div>
                <Segmented<CustomTemplateConfig['motion']>
                    value={config.motion}
                    onChange={(v) => setConfig((c) => ({ ...c, motion: v }))}
                    options={(['calm', 'lively'] as CustomTemplateConfig['motion'][]).map((m) => ({ id: m, label: C.motions[m] }))}
                />
                <p className="dsn-hint" style={{ margin: '18px 0 0' }}>{isAdmin ? C.adminNote : C.userNote}</p>
            </EditorSheet>

            {/* ---------- Full-screen preview overlay (animations play) ---------- */}
            {fsOpen && (
                <div className="dsn-fs" role="dialog" aria-modal="true" aria-label={C.preview}>
                    <button className="dsn-fs-close" onClick={() => setFsOpen(false)} aria-label={C.close}><X size={20} /></button>
                    <div className="dsn-fs-scroll pk-scroll">
                        <div className="dsn-fs-card">
                            <FullCard config={config} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ================================================================== */
/* Preview                                                             */
/* ================================================================== */

const STAGE_W = 460;

/** Scaled, scrollable phone-frame render of the live config (preview mode). */
function ConfigPreview({ config }: { config: CustomTemplateConfig }) {
    const frameRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [stageH, setStageH] = useState(0);

    useLayoutEffect(() => {
        const frame = frameRef.current, stage = stageRef.current;
        if (!frame || !stage) return;
        const measure = () => {
            const s = Math.min(1, frame.clientWidth / STAGE_W);
            setScale(s);
            setStageH(stage.offsetHeight * s);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(frame);
        ro.observe(stage);
        return () => ro.disconnect();
    }, []);

    const Tpl = getTemplate('custom');
    const data = useMemo(() => ({ ...SAMPLE_INVITATION, templateConfig: config }), [config]);

    return (
        <div className="dsn-device">
            <span className="dsn-speaker" aria-hidden="true" />
            <div ref={frameRef} className="pk-scroll dsn-screen" style={{ height: 'min(70vh, 760px)' }}>
                <div style={{ height: stageH, overflow: 'hidden' }}>
                    <div ref={stageRef} style={{ width: STAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                        <Tpl data={data} preview />
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Full card (no preview crop) so entrance animations play in the overlay. */
function FullCard({ config }: { config: CustomTemplateConfig }) {
    const Tpl = getTemplate('custom');
    const data = useMemo(() => ({ ...SAMPLE_INVITATION, templateConfig: config }), [config]);
    return <Tpl data={data} />;
}

/* ================================================================== */
/* Reusable controls                                                   */
/* ================================================================== */

function StatusBadge({ status, lang }: { status: DesignStatus; lang: 'bm' | 'en' }) {
    const L = ({
        bm: { draft: 'Draf', pending: 'Menunggu', approved: 'Diterbitkan', rejected: 'Ditolak' },
        en: { draft: 'Draft', pending: 'Pending', approved: 'Published', rejected: 'Rejected' },
    })[lang] as Record<DesignStatus, string>;
    const cls = status === 'approved' ? 'badge badge-ok'
        : status === 'rejected' ? 'badge badge-bad'
            : status === 'pending' ? 'badge badge-gold'
                : 'badge';
    return <span className={cls}>{L[status]}</span>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <label className="dsn-swatch">
            <span className="dsn-swatch-lbl">{label}</span>
            <span className="dsn-swatch-box">
                <input type="color" value={toHex(value, '#4a3bc4')} onChange={(e) => onChange(e.target.value)} aria-label={label} />
                <span className="dsn-swatch-hex">{toHex(value, value)}</span>
            </span>
        </label>
    );
}

function RangeField({ min, max, value, onChange }: { min: number; max: number; value: number; onChange: (v: number) => void }) {
    return (
        <div className="dsn-range">
            <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
            <span className="dsn-range-val">{value}</span>
        </div>
    );
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            className={`dsn-switch${on ? ' on' : ''}`}
            onClick={() => onChange(!on)}
        >
            <span className="dsn-knob" />
        </button>
    );
}

interface Opt<T extends string> { id: T; label: string }

function Segmented<T extends string>({ options, value, onChange }: { options: Opt<T>[]; value: T; onChange: (v: T) => void }) {
    return (
        <div className="dsn-seg" role="group">
            {options.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    className={`dsn-seg-btn${value === o.id ? ' is-on' : ''}`}
                    aria-pressed={value === o.id}
                    onClick={() => onChange(o.id)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function CardPicker<T extends string>({ options, value, onChange }: { options: Opt<T>[]; value: T; onChange: (v: T) => void }) {
    return (
        <div className="dsn-cards">
            {options.map((o) => {
                const active = value === o.id;
                return (
                    <button
                        key={o.id}
                        type="button"
                        className={`dsn-pick${active ? ' is-on' : ''}`}
                        aria-pressed={active}
                        onClick={() => onChange(o.id)}
                    >
                        {active && <span className="dsn-pick-tick"><Check size={12} /></span>}
                        <span className="dsn-pick-lbl">{o.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/* ================================================================== */

const closedIcon: React.CSSProperties = {
    width: 58, height: 58, borderRadius: '50%', background: 'var(--cream)', color: 'var(--plum)',
    display: 'grid', placeItems: 'center', margin: '0 auto 16px',
};

const DSN_CSS = `
.dsn { position: relative; overflow-x: clip; }

/* Header */
.dsn-head {
    display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
    padding-bottom: 16px; margin-bottom: 4px; border-bottom: 1px solid var(--line);
}
.dsn-head-l { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1 1 auto; }
.dsn-title { min-width: 0; }
.dsn-title h1 { font-size: clamp(18px, 3.4vw, 24px); margin: 0; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dsn-title p { margin: 5px 0 0; display: flex; }
.dsn-head-r { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

/* Preview hero */
.dsn-stage {
    display: flex; flex-direction: column; align-items: center; padding: 26px 8px 156px; min-height: 60vh;
    background: radial-gradient(620px 340px at 50% 0%, #efeefb 0%, rgba(239, 238, 251, 0) 72%);
}
.dsn-device {
    width: 100%; max-width: 452px; margin: 0 auto; padding: 12px 12px 16px;
    background: linear-gradient(160deg, #f5f4fb 0%, #e8e6f4 100%);
    border-radius: 46px;
    box-shadow: 0 34px 80px -34px rgba(74, 59, 196, 0.5), 0 0 0 1px rgba(74, 59, 196, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.dsn-speaker { display: block; width: 46px; height: 5px; border-radius: 999px; background: rgba(30, 26, 51, 0.18); margin: 2px auto 10px; }
.dsn-screen {
    width: 100%; overflow-y: auto; overflow-x: hidden;
    border-radius: 34px; border: 1px solid var(--line); background: #fff;
}

/* Bottom dock */
.dsn-dock {
    position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 96;
    display: flex; max-width: min(94vw, 900px); overflow-x: auto; overscroll-behavior-x: contain;
    background: rgba(255, 255, 255, 0.94);
    -webkit-backdrop-filter: blur(12px) saturate(1.2); backdrop-filter: blur(12px) saturate(1.2);
    border: 1px solid var(--line); border-radius: 22px;
    padding: 7px 8px calc(6px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 22px 50px -22px rgba(74, 59, 196, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.7);
    scrollbar-width: thin; scrollbar-color: rgba(74, 59, 196, 0.55) transparent;
    scroll-snap-type: x proximity;
}
.dsn-dock::-webkit-scrollbar { height: 4px; }
.dsn-dock::-webkit-scrollbar-track { background: transparent; margin: 0 14px; }
.dsn-dock::-webkit-scrollbar-thumb { background: rgba(74, 59, 196, 0.5); border-radius: 999px; }
@media (min-width: 861px) { .dsn-dock { left: calc(50% + 122px); } }
.dsn-dock-track { display: flex; gap: 3px; width: max-content; margin: 0 auto; }
.dsn-tab {
    scroll-snap-align: center; position: relative; appearance: none; border: 0; background: transparent; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 0 0 auto;
    min-width: 62px; padding: 8px 9px 7px; border-radius: 14px; color: var(--muted); font-family: inherit;
    transition: background .15s ease, color .15s ease, transform .12s ease;
}
.dsn-tab:hover { background: var(--cream); color: var(--plum); }
.dsn-tab:active { transform: scale(0.94); }
.dsn-tab .lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.2px; line-height: 1; white-space: nowrap; }

/* Group label / hint inside sheets */
.dsn-glabel { font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--plum); margin: 22px 0 12px; display: flex; align-items: center; gap: 10px; }
.dsn-glabel:first-child { margin-top: 4px; }
.dsn-glabel::after { content: ''; flex: 1; height: 1px; background: var(--line); }
.dsn-sublabel { font-size: 12.5px; font-weight: 700; color: var(--ink); margin: 0 0 8px; }
.dsn-hint { color: var(--muted); font-size: 13px; line-height: 1.55; margin: 0 0 16px; }

/* Swatches */
.dsn-swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
.dsn-swatch { display: grid; gap: 6px; min-width: 0; }
.dsn-swatch-lbl { font-size: 12px; font-weight: 600; }
.dsn-swatch-box { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 10px; padding: 5px 8px; background: #fff; min-width: 0; }
.dsn-swatch-box input[type="color"] { width: 32px; height: 32px; min-width: 32px; border: none; background: none; padding: 0; cursor: pointer; border-radius: 6px; }
.dsn-swatch-hex { font-size: 12px; font-family: monospace; color: var(--muted); text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; }

/* Range */
.dsn-range { display: flex; align-items: center; gap: 12px; }
.dsn-range input[type="range"] { flex: 1; accent-color: var(--plum); }
.dsn-range-val { min-width: 34px; text-align: center; font-weight: 700; font-size: 13px; color: var(--plum); background: var(--cream); border-radius: 8px; padding: 3px 6px; }

/* Switch (mirrors CardEditor) */
.dsn-switch { flex: 0 0 auto; position: relative; width: 46px; height: 28px; border-radius: 999px; border: 0; cursor: pointer; background: #d8d5ea; transition: background .18s ease; padding: 0; }
.dsn-switch.on { background: var(--plum); }
.dsn-knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25); transition: transform .18s ease; }
.dsn-switch.on .dsn-knob { transform: translateX(18px); }
.dsn-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.dsn-toggle-label { font-size: 15px; font-weight: 600; color: var(--ink); }

/* Segmented control */
.dsn-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.dsn-seg-btn {
    appearance: none; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600;
    padding: 8px 14px; border-radius: 10px; border: 1px solid var(--line); background: #fff; color: var(--ink);
    transition: background .15s ease, color .15s ease, border-color .15s ease;
}
.dsn-seg-btn:hover { background: var(--cream); }
.dsn-seg-btn.is-on { background: var(--plum); color: #fff; border-color: var(--plum); }
.dsn-upbtn { display: inline-flex; align-items: center; gap: 7px; }
.dsn-upbtn:disabled { opacity: .6; cursor: default; }

/* Custom font upload */
.dsn-fontup { margin-top: 12px; }
.dsn-fontfile { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--line); border-radius: 10px; padding: 7px 8px 7px 14px; background: #fff; }
.dsn-fontfile.is-on { border-color: var(--plum); box-shadow: 0 0 0 3px rgba(74, 59, 196, 0.12); }
.dsn-fontfile-name { font-size: 14px; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dsn-fontfile-x { flex: 0 0 auto; appearance: none; border: 0; cursor: pointer; background: var(--cream); color: var(--plum); width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; transition: background .15s ease; }
.dsn-fontfile-x:hover { background: #e6e3f6; }

/* Card picker */
.dsn-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.dsn-pick {
    position: relative; appearance: none; cursor: pointer; font: inherit;
    display: flex; align-items: center; justify-content: center; text-align: center; min-height: 58px;
    padding: 10px 8px; border-radius: 12px; border: 1px solid var(--line); background: #fff; color: var(--ink);
    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.dsn-pick:hover { background: var(--cream); }
.dsn-pick.is-on { border: 2px solid var(--plum); box-shadow: 0 0 0 3px rgba(74, 59, 196, 0.12); }
.dsn-pick-lbl { font-size: 12.5px; font-weight: 600; }
.dsn-pick.is-on .dsn-pick-lbl { color: var(--plum); }
.dsn-pick-tick { position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; border-radius: 50%; background: var(--plum); color: #fff; display: grid; place-items: center; }

/* Section block */
.dsn-secblock { border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-bottom: 12px; background: #fff; }
.dsn-secbody { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.dsn-grad { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }

/* Gradient/loader spin */
.dsn-spin { animation: dsn-spin .9s linear infinite; }
@keyframes dsn-spin { to { transform: rotate(360deg); } }

/* Full-screen preview overlay */
.dsn-fs { position: fixed; inset: 0; z-index: 200; background: rgba(20, 17, 38, 0.72); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
.dsn-fs-close {
    position: fixed; top: 16px; right: 16px; z-index: 210; width: 42px; height: 42px; border-radius: 50%;
    border: 0; cursor: pointer; display: grid; place-items: center; background: #fff; color: var(--plum);
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
}
.dsn-fs-scroll { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; padding: 24px 12px 48px; }
.dsn-fs-card { width: 100%; max-width: 460px; margin: 0 auto; border-radius: 20px; overflow: hidden; background: #fff; box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 0.6); }

/* ---- Mobile ---- */
@media (max-width: 860px) {
    .dsn-head { gap: 10px; }
    .dsn-head-r { flex: 1 1 100%; }
    .dsn-stage { padding: 16px 4px 150px; }
    .dsn-dock { max-width: calc(100vw - 20px); }
    .dsn-tab { min-width: 58px; padding: 8px 8px 7px; }
    .dsn-grad { grid-template-columns: 1fr; }
}
@media (max-width: 400px) {
    .dsn-tab { min-width: 54px; }
    .dsn-tab .lbl { font-size: 10px; }
}
@media print { .dsn-dock, .dsn-fs { display: none !important; } }
`;
