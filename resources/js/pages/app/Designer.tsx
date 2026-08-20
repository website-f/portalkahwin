import {
    useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Eye, Save, Send, Check, X, Loader2, Clock, Upload,
    Palette as PaletteIcon, BookOpen, Sparkles, Flower2, LayoutGrid, FileText,
    Image as ImageIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { mediaUrl } from '../../lib/base';
import { EditorSheet } from '../../components/EditorSheet';
import { NumberInput } from '../../components/NumberInput';
import { ComboBox } from '../../components/ComboBox';
import { useLang, dict, type Lang } from '../../context/LangContext';
import { useAuth, isStaff, can } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { getTemplate } from '../../templates/registry';
import { artFor } from '../../templates/templateArt';
import { readablePalette } from '../../lib/contrast';
import type { Palette } from '../../templates/types';
import { ThumbnailStage, type ThumbJob } from '../../components/ThumbnailStage';
import { SAMPLE_INVITATION, EVENT_SAMPLE } from '../../templates/sampleData';
import { galleryGenre } from '../../lib/previewSong';
import {
    CUSTOM_SECTIONS, DEFAULT_CUSTOM_CONFIG, normalizeConfig,
    type CustomTemplateConfig, type CustomPalette, type CustomSectionConfig,
    type CustomBackground, type CoverReveal, type AmbientEffect, type DecorationStyle, type HeadingFont,
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
    tier?: 'free' | 'premium';
    price_myr?: number | string | null;
    discount_price_myr?: number | string | null;
    is_active?: boolean;
    base_key?: string | null;
    palette?: Record<string, string> | null;
}

interface PublicSettings { allow_user_templates: boolean }


type TabId = 'tema' | 'latar' | 'kulit' | 'kesan' | 'hiasan' | 'bahagian' | 'butiran';

const TAB_ICON: Record<TabId, ReactNode> = {
    tema: <PaletteIcon size={19} />,
    latar: <ImageIcon size={19} />,
    kulit: <BookOpen size={19} />,
    kesan: <Sparkles size={19} />,
    hiasan: <Flower2 size={19} />,
    bahagian: <LayoutGrid size={19} />,
    butiran: <FileText size={19} />,
};
const TAB_ORDER: TabId[] = ['tema', 'latar', 'kulit', 'kesan', 'hiasan', 'bahagian', 'butiran'];

/** Coerce any colour value into a #rrggbb hex an <input type="color"> accepts. */
function toHex(v: string | undefined | null, fallback: string): string {
    if (!v) return fallback;
    const s = v.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) return ('#' + s.slice(1).split('').map((c) => c + c).join('')).toLowerCase();
    return fallback;
}

/** Tailwind-free media-query hook (mirrors the host editor's `useMedia`). */
function useMedia(query: string): boolean {
    const [match, setMatch] = useState<boolean>(
        () => typeof window !== 'undefined' && window.matchMedia(query).matches,
    );
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = () => setMatch(mq.matches);
        on();
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, [query]);
    return match;
}

export function Designer() {
    const { id } = useParams();
    const { lang } = useLang();
    const { user } = useAuth();
    const dialog = useDialog();
    const nav = useNavigate();
    const { pathname } = useLocation();
    const isAdmin = isStaff(user);
    // The designer is mounted under BOTH panels — /admin/designer for staff and
    // /panel/designer for user contributions. Keep every navigation inside the
    // panel we were opened from so an admin never gets bounced into the user shell.
    const base = pathname.startsWith('/admin') ? '/admin' : '/panel';
    // Where "back" / after-publish should land: admins manage designs in the
    // template catalogue, users have their own drafts page.
    const designsHome = isAdmin ? '/admin/templates' : '/panel/designs';

    const C = dict({
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
            tabs: { tema: 'Tema', latar: 'Latar', kulit: 'Kulit', kesan: 'Kesan', hiasan: 'Hiasan', bahagian: 'Bahagian', butiran: 'Butiran' } as Record<TabId, string>,
            subs: {
                tema: 'Warna & fon tajuk', latar: 'Imej / gradien latar kad', kulit: 'Animasi buka kad', kesan: 'Kesan halus latar',
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
            reveals: { plain: 'Biasa', curtain: 'Tirai', door: 'Pintu', envelope: 'Sampul', box: 'Kotak Hadiah', zoom: 'Zum', blinds: 'Bidai', split: 'Belah Dua' } as Record<CoverReveal, string>,
            gate: 'Skrin selamat datang (ketik untuk buka)', openLabel: 'Teks butang buka',
            gateHint: 'Papar skrin dengan nama & butang untuk tetamu ketik sebelum kad terbuka. Untuk Tirai, Pintu, Kotak, Bidai & Belah Dua.',
            playOpening: 'Main animasi buka',
            effectType: 'Jenis kesan', color: 'Warna', density: 'Ketumpatan',
            effects: {
                none: 'Tiada', petals: 'Kelopak', sakura: 'Sakura', hearts: 'Hati', stars: 'Bintang',
                sparkles: 'Kilauan', snow: 'Salji', leaves: 'Daun', bubbles: 'Buih', confetti: 'Konfeti',
                fireflies: 'Kelip-kelip', butterflies: 'Rama-rama', bokeh: 'Bokeh', dust: 'Serbuk Emas', rain: 'Hujan',
                embers: 'Bara Api', feathers: 'Bulu Pelepah', notes: 'Not Muzik', meteors: 'Meteor',
            } as Record<AmbientEffect, string>,
            decoStyle: 'Gaya hiasan',
            decos: {
                none: 'Tiada', cornerFloral: 'Bunga Sudut', roots: 'Akar', leaves: 'Dedaun',
                geometric: 'Geometri', goldFrame: 'Bingkai Emas', arch: 'Gerbang',
                lantern: 'Tanglung', artdeco: 'Art Deco', moroccan: 'Maghribi',
                doubleHappiness: 'Shuang Xi 囍', ovalFrame: 'Bingkai Bujur', floralCorners: 'Bunga Penuh',
                tropical: 'Tropika', celestial: 'Cakerawala', lace: 'Renda', heartVine: 'Hati & Daun',
            } as Record<DecorationStyle, string>,
            uploadImage: 'Muat naik imej', overlay: 'Kelegapan lapisan', blur: 'Kabur',
            bgHint: 'Imej latar penuh untuk kulit kad. Naikkan kelegapan supaya nama pengantin mudah dibaca.',
            sections: {
                opening: 'Kata Aluan', couple: 'Pengantin', prayer: 'Doa', date: 'Tarikh', program: 'Atur Cara',
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
            pricing: 'Harga & Penyenaraian', tier: 'Pelan', free: 'Percuma', premium: 'Premium',
            price: 'Harga asal (RM)', discount: 'Harga diskaun (RM)',
            discountHint: 'Pilihan. Jika lebih rendah daripada harga asal, tag “−N%” dipaparkan dan harga ini yang dicaj.',
            activeGallery: 'Aktif — papar di galeri',
            builtinNote: 'Ini rekaan siap sedia. Di sini anda boleh tukar warna & tetapan penyenaraian. Untuk ubah suai penuh (latar, kulit, kesan, bahagian), tekan “Salin” pada halaman Rekaan.',
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
            tabs: { tema: 'Theme', latar: 'Background', kulit: 'Cover', kesan: 'Effect', hiasan: 'Decoration', bahagian: 'Sections', butiran: 'Details' } as Record<TabId, string>,
            subs: {
                tema: 'Colours & heading font', latar: 'Card background image / gradient', kulit: 'Card reveal animation', kesan: 'Ambient background effect',
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
            reveals: { plain: 'Plain', curtain: 'Curtain', door: 'Door', envelope: 'Envelope', box: 'Gift box', zoom: 'Zoom', blinds: 'Blinds', split: 'Split Open' } as Record<CoverReveal, string>,
            gate: 'Welcome gate (tap to open)', openLabel: 'Open button text',
            gateHint: 'Show a screen with the name + a button the guest taps before the card opens. Applies to Curtain, Door, Gift box, Blinds & Split.',
            playOpening: 'Play opening',
            effectType: 'Effect type', color: 'Colour', density: 'Density',
            effects: {
                none: 'None', petals: 'Petals', sakura: 'Sakura', hearts: 'Hearts', stars: 'Stars',
                sparkles: 'Sparkles', snow: 'Snow', leaves: 'Leaves', bubbles: 'Bubbles', confetti: 'Confetti',
                fireflies: 'Fireflies', butterflies: 'Butterflies', bokeh: 'Bokeh', dust: 'Golden Dust', rain: 'Rain',
                embers: 'Embers', feathers: 'Feathers', notes: 'Music Notes', meteors: 'Meteors',
            } as Record<AmbientEffect, string>,
            decoStyle: 'Decoration style',
            decos: {
                none: 'None', cornerFloral: 'Corner Floral', roots: 'Roots', leaves: 'Leaves',
                geometric: 'Geometric', goldFrame: 'Gold Frame', arch: 'Arch',
                lantern: 'Lanterns', artdeco: 'Art Deco', moroccan: 'Moroccan',
                doubleHappiness: 'Double Happiness 囍', ovalFrame: 'Oval Frame', floralCorners: 'Full Florals',
                tropical: 'Tropical Leaves', celestial: 'Celestial', lace: 'Lace Corners', heartVine: 'Heart Vine',
            } as Record<DecorationStyle, string>,
            uploadImage: 'Upload image', overlay: 'Scrim opacity', blur: 'Blur',
            bgHint: 'A full-bleed cover background. Raise the scrim so the couple’s names stay easy to read.',
            sections: {
                opening: 'Opening', couple: 'The Couple', prayer: 'Prayer (Doa)', date: 'Date', program: 'Run of Show',
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
            pricing: 'Price & listing', tier: 'Tier', free: 'Free', premium: 'Premium',
            price: 'Original price (RM)', discount: 'Discount price (RM)',
            discountHint: 'Optional. When set below the original, a “−N%” tag shows and this price is charged.',
            activeGallery: 'Active — show in gallery',
            builtinNote: 'This is a ready-made design. Here you can recolour it and set its listing. To fully customise it (background, cover, effects, sections), use “Copy” on the Templates page.',
            adminNote: 'As an admin, “Publish” makes this design instantly available to everyone.',
            userNote: 'Submitted designs are reviewed by an admin before going live.',
        },
        zh: {
            back: '返回', newTitle: '新建设计',
            preview: '预览', saveDraft: '保存草稿', saved: '已保存', saving: '保存中…',
            publish: '发布', submitReview: '提交审核', submitting: '提交中…',
            close: '关闭',
            closedTitle: '此功能尚未开放',
            closedBody: '社区设计投稿目前尚未开放，请稍后再来 — 我们很快就会开放。',
            nameRequired: '请先为您的设计命名。',
            publishedTitle: '设计已发布！', publishedBody: '您的设计现已向所有人开放。',
            submittedTitle: '设计已提交！', submittedBody: '感谢您的投稿，设计正在等待管理员审核。',
            tabs: { tema: '主题', latar: '背景', kulit: '封面', kesan: '动效', hiasan: '装饰', bahagian: '版块', butiran: '详情' } as Record<TabId, string>,
            subs: {
                tema: '配色与标题字体', latar: '请柬背景图 / 渐变', kulit: '请柬揭开动画', kesan: '背景氛围动效',
                hiasan: '边角装饰图案', bahagian: '逐个版块的开关、背景与动画',
                butiran: '名称、分类与动效强度',
            } as Record<TabId, string>,
            colors: { primary: '主色', secondary: '辅色', accent: '强调色', bg: '背景色', text: '文字色' } as Record<keyof CustomPalette, string>,
            headingFont: '标题字体',
            fonts: {
                serif: '衬线体', sans: '无衬线体', script: '手写体',
                elegant: '优雅', modern: '现代', custom: '自定义',
            } as Record<HeadingFont, string>,
            uploadFont: '上传自定义字体', removeFont: '移除字体',
            reveal: '揭开方式', accentColor: '强调色',
            reveals: { plain: '直接显示', curtain: '拉幕', door: '开门', envelope: '信封', box: '礼盒', zoom: '缩放', blinds: '百叶帘', split: '对半开' } as Record<CoverReveal, string>,
            gate: '欢迎封面（点击打开）', openLabel: '打开按钮文字',
            gateHint: '显示带姓名和按钮的封面，宾客点击后才打开请柬。适用于拉幕、开门、礼盒、百叶帘、对半开。',
            playOpening: '播放开场动画',
            effectType: '动效类型', color: '颜色', density: '密度',
            effects: {
                none: '无', petals: '花瓣', sakura: '樱花', hearts: '爱心', stars: '星光',
                sparkles: '闪粉', snow: '飘雪', leaves: '落叶', bubbles: '气泡', confetti: '彩纸',
                fireflies: '萤火虫', butterflies: '蝴蝶', bokeh: '光斑', dust: '金粉', rain: '雨滴',
                embers: '火星', feathers: '羽毛', notes: '音符', meteors: '流星',
            } as Record<AmbientEffect, string>,
            decoStyle: '装饰风格',
            decos: {
                none: '无', cornerFloral: '边角花卉', roots: '枝蔓', leaves: '叶饰',
                geometric: '几何', goldFrame: '金框', arch: '拱门',
                lantern: '灯笼', artdeco: '装饰艺术', moroccan: '摩洛哥风',
                doubleHappiness: '双喜 囍', ovalFrame: '椭圆金框', floralCorners: '满花边角',
                tropical: '热带叶', celestial: '星空', lace: '蕾丝边角', heartVine: '心藤',
            } as Record<DecorationStyle, string>,
            uploadImage: '上传图片', overlay: '遮罩不透明度', blur: '模糊',
            bgHint: '整幅封面背景图。适当提高遮罩，让新人姓名更清晰易读。',
            sections: {
                opening: '开场语', couple: '新人', prayer: '祈祷文', date: '日期', program: '婚礼流程',
                location: '地点', wishes: '祝福留言', wishlist: '礼物清单', contacts: '联络人',
                gift: '礼金', gallery: '相册',
            } as Record<string, string>,
            background: '背景', animation: '滚动入场动画',
            bgTypes: { none: '无', color: '纯色', gradient: '渐变', image: '图片' } as Record<CustomSectionConfig['bg']['type'], string>,
            stop1: '颜色 1', stop2: '颜色 2', angle: '角度', imageUrl: '图片链接',
            anims: { none: '无', fade: '淡入', slideUp: '上滑', slideLeft: '左滑', zoom: '缩放' } as Record<CustomSectionConfig['animation'], string>,
            secHint: '关闭的版块不会显示在请柬上。',
            name: '设计名称', namePh: '例如 Lavender Dream',
            category: '分类', catPh: '例如 floral', description: '描述', descOptional: '（可选）',
            descPh: '简单介绍一下您的设计…',
            motion: '动效强度', motions: { calm: '柔和', lively: '活泼' } as Record<CustomTemplateConfig['motion'], string>,
            pricing: '价格与上架', tier: '类型', free: '免费', premium: '付费',
            price: '原价（RM）', discount: '折扣价（RM）',
            discountHint: '可选。若低于原价，将显示「−N%」标签并按此价格收费。',
            activeGallery: '上架 — 在作品集中显示',
            builtinNote: '这是现成设计。您可以在此调整颜色和上架设置。如需完全自定义（背景、封面、特效、版块），请在设计列表页点击「复制」。',
            adminNote: '作为管理员，点击「发布」会让此设计立即向所有人开放。',
            userNote: '投稿的设计需经管理员审核后才会上线。',
        },
    }, lang);

    // ------------------------------------------------------------------
    const [allow, setAllow] = useState<boolean | null>(null);
    const [loading, setLoading] = useState<boolean>(!!id);
    const [config, setConfig] = useState<CustomTemplateConfig>(() => normalizeConfig(DEFAULT_CUSTOM_CONFIG));
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    // Superadmin-managed category suggestions for the picker.
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    // Admin sample gallery photos, so the preview's Gallery section isn't empty.
    // Kept per-genre with the old flat list as a shared fallback.
    const [galleryByGenre, setGalleryByGenre] = useState<Record<string, string[]>>({});
    const [galleryLegacy, setGalleryLegacy] = useState<string[]>([]);
    useEffect(() => {
        api.get<{ template_categories?: string[]; preview_gallery_images?: string[]; preview_gallery_by_genre?: Record<string, string[]> }>('/settings').then((r) => {
            setCategoryOptions(Array.isArray(r.data?.template_categories) ? r.data!.template_categories! : []);
            setGalleryLegacy(Array.isArray(r.data?.preview_gallery_images) ? r.data!.preview_gallery_images! : []);
            const byGenre = r.data?.preview_gallery_by_genre;
            setGalleryByGenre(byGenre && typeof byGenre === 'object' && !Array.isArray(byGenre) ? byGenre : {});
        }).catch(() => undefined);
    }, []);
    // Sample photos for the genre / event type of the design being built, falling
    // back to the generic 'event' set (for events) then the shared legacy set.
    const previewGallery = useMemo(() => {
        const gg = galleryGenre({ category, eventType: config.eventType });
        const isEvent = (category ?? '').toLowerCase() === 'event' || !!config.eventType;
        const raw = (galleryByGenre[gg]?.length ? galleryByGenre[gg]
            : isEvent && galleryByGenre['event']?.length ? galleryByGenre['event']
            : galleryLegacy) ?? [];
        return raw.map((u) => mediaUrl(u) ?? u);
    }, [category, config.eventType, galleryByGenre, galleryLegacy]);
    const [description, setDescription] = useState('');
    const [designId, setDesignId] = useState('');
    const [status, setStatus] = useState<DesignStatus>('draft');
    // Catalogue pricing/visibility — admin only. Edited in the Details tab.
    const [tier, setTier] = useState<'free' | 'premium'>('free');
    const [priceMyr, setPriceMyr] = useState<string>('0');
    const [discountPrice, setDiscountPrice] = useState<string>('');
    const [isActive, setIsActive] = useState(false);
    // A built-in template (React-coded) opened by an admin: only its colours +
    // listing are editable, so the Designer shows just Theme + Details and the
    // preview renders the real component. A new/custom design is fully no-code.
    const [isCustomDesign, setIsCustomDesign] = useState(true);
    const [renderKey, setRenderKey] = useState('custom');
    // Bumped by the Cover tab's "Play opening" button to replay the reveal live.
    const [playSeq, setPlaySeq] = useState(0);

    // On mobile a tab is a bottom sheet (null = none open). On desktop the same
    // tabs live in a left rail and one is always selected — so `deskTab` falls
    // back to the first tab. Both share one `openTab` so switching layout mid-edit
    // keeps the current tab.
    const isWide = useMedia('(min-width: 1080px)');
    const [openTab, setOpenTab] = useState<TabId | null>(null);
    // A built-in template only exposes Theme (colours) + Details (listing); a
    // no-code design gets every tab.
    const visibleTabs: TabId[] = isCustomDesign ? TAB_ORDER : ['tema', 'butiran'];
    const deskTab: TabId = openTab && visibleTabs.includes(openTab) ? openTab : visibleTabs[0];
    const [fsOpen, setFsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [nameError, setNameError] = useState(false);

    // Upload progress state
    const [fontUploading, setFontUploading] = useState(false);
    const [imgUploading, setImgUploading] = useState<Set<string>>(() => new Set());
    const [bgUploading, setBgUploading] = useState(false);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const imgInputs = useRef<Record<string, HTMLInputElement | null>>({});

    // A contributed design's cover is captured from the design itself right
    // after a save, so its card never falls back to generic artwork.
    const [thumbJob, setThumbJob] = useState<ThumbJob | null>(null);

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
            setTier(d.tier === 'premium' ? 'premium' : 'free');
            setPriceMyr(String(d.price_myr ?? 0));
            setDiscountPrice(d.discount_price_myr === null || d.discount_price_myr === undefined ? '' : String(d.discount_price_myr));
            setIsActive(!!d.is_active);
            // A built-in template has a base_key that isn't 'custom' (or none) and
            // no config engine — recolour it via its palette column instead.
            const custom = (d as { base_key?: string | null }).base_key === 'custom';
            const rkey = custom ? 'custom' : ((d as { base_key?: string | null }).base_key || d.key);
            setIsCustomDesign(custom);
            setRenderKey(rkey);
            const cfg = normalizeConfig(d.config);
            if (!custom && d.palette) {
                // Seed the Theme swatches from the built-in's current palette.
                cfg.palette = { ...cfg.palette, ...(d.palette as Partial<typeof cfg.palette>) };
            }
            setConfig(cfg);
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
    const setBackground = (p: Partial<CustomBackground>) =>
        setConfig((c) => ({ ...c, background: { type: 'none', ...(c.background ?? {}), ...p } }));
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

    async function handleBgImage(file: File) {
        setBgUploading(true);
        try {
            const url = await uploadFile(file);
            if (url) setBackground({ type: 'image', image: url });
        } finally {
            setBgUploading(false);
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
            // Pricing/visibility is admin-only (the backend ignores it otherwise).
            ...(isAdmin ? {
                tier,
                price_myr: Number(priceMyr) || 0,
                discount_price_myr: discountPrice === '' ? null : Number(discountPrice),
                is_active: isActive,
                // A built-in is recoloured via its palette column; a custom design
                // carries colours in `config`, so only send palette for built-ins.
                ...(isCustomDesign ? {} : { palette: config.palette }),
            } : {}),
        };
        try {
            if (designId) {
                const r = await api.put<Design>(`/me/designs/${designId}`, payload);
                setStatus(r.data.status ?? status);
                flashSaved();
                setThumbJob({ id: designId, key: r.data.key ?? 'custom', baseKey: 'custom', config });
                return designId;
            }
            const r = await api.post<Design>('/me/designs', payload);
            setDesignId(r.data.id);
            setStatus(r.data.status ?? 'draft');
            loadedId.current = r.data.id; // avoid a redundant GET when the URL updates
            nav(`${base}/designer/${r.data.id}`, { replace: true });
            flashSaved();
            setThumbJob({ id: r.data.id, key: r.data.key ?? 'custom', baseKey: 'custom', config });
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
            nav(designsHome);
        } finally {
            setSubmitting(false);
        }
    }

    /** Upload the captured cover, then clear the job either way — a failed
        capture must never block saving or submitting the design itself. */
    async function onThumbCaptured(job: ThumbJob, image: string) {
        setThumbJob(null);
        try {
            await api.post(`/me/designs/${job.id}/thumbnail`, { image });
        } catch {
            /* the design is saved; the cover just falls back to the palette artwork */
        }
    }

    // ------------------------------------------------------------------
    if (allow === null || loading) {
        return <div className="loading-screen"><div className="spinner" /></div>;
    }

    // Non-admin, feature gated off.
    // Non-admins need both the global switch AND the per-role `designer` capability
    // (matches the server gate), so a plan that doesn't include the designer hides it.
    if (!isAdmin && (!allow || !can(user, 'designer'))) {
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

    // Each tab's controls, defined once and rendered in BOTH layouts: as a bottom
    // sheet on mobile, and inside the left-rail pane on desktop. One source means
    // the two layouts can never drift apart — every function is identical, only
    // the surrounding chrome differs.
    const BODY: Record<TabId, ReactNode> = {
        tema: (
            <>
                <div className="dsn-swatches">
                    {(['primary', 'secondary', 'accent', 'bg', 'text'] as (keyof CustomPalette)[]).map((k) => (
                        <ColorField key={k} label={C.colors[k]} value={config.palette[k]} onChange={(v) => setPal(k, v)} />
                    ))}
                </div>
                {!isCustomDesign && <p className="dsn-hint" style={{ margin: '4px 0 0' }}>{C.builtinNote}</p>}
                {isCustomDesign && <>
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
                </>}
            </>
        ),

        latar: (
            <>
                <div className="dsn-glabel">{C.background}</div>
                <Segmented<CustomBackground['type']>
                    value={config.background?.type ?? 'none'}
                    onChange={(v) => setBackground({ type: v })}
                    options={(['none', 'color', 'gradient', 'image'] as CustomBackground['type'][]).map((b) => ({ id: b, label: C.bgTypes[b] }))}
                />
                {config.background?.type === 'color' && (
                    <div style={{ marginTop: 12 }}>
                        <ColorField label={C.color} value={toHex(config.background?.color, config.palette.bg)} onChange={(v) => setBackground({ color: v })} />
                    </div>
                )}
                {config.background?.type === 'gradient' && (
                    <div className="dsn-grad">
                        <ColorField label={C.stop1} value={toHex(config.background?.color, config.palette.bg)} onChange={(v) => setBackground({ color: v })} />
                        <ColorField label={C.stop2} value={toHex(config.background?.color2, config.palette.accent)} onChange={(v) => setBackground({ color2: v })} />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div className="dsn-sublabel">{C.angle} · {config.background?.angle ?? 135}°</div>
                            <RangeField min={0} max={360} value={config.background?.angle ?? 135} onChange={(v) => setBackground({ angle: v })} />
                        </div>
                    </div>
                )}
                {config.background?.type === 'image' && (
                    <div style={{ marginTop: 12 }}>
                        <p className="dsn-hint">{C.bgHint}</p>
                        <div className="field" style={{ marginBottom: 10 }}>
                            <label>{C.imageUrl}</label>
                            <input type="url" inputMode="url" placeholder="https://…" value={config.background?.image ?? ''} onChange={(e) => setBackground({ image: e.target.value })} />
                        </div>
                        <input
                            ref={bgInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void handleBgImage(f);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            className="dsn-seg-btn dsn-upbtn"
                            disabled={bgUploading}
                            onClick={() => bgInputRef.current?.click()}
                        >
                            {bgUploading ? <Loader2 size={14} className="dsn-spin" /> : <Upload size={14} />} {C.uploadImage}
                        </button>
                        <div className="dsn-sublabel" style={{ marginTop: 16 }}>{C.overlay} · {Math.round((config.background?.overlay ?? 0.34) * 100)}%</div>
                        <RangeField min={0} max={90} value={Math.round((config.background?.overlay ?? 0.34) * 100)} onChange={(v) => setBackground({ overlay: v / 100 })} />
                        <div className="dsn-sublabel" style={{ marginTop: 14 }}>{C.blur} · {config.background?.blur ?? 0}px</div>
                        <RangeField min={0} max={10} value={config.background?.blur ?? 0} onChange={(v) => setBackground({ blur: v })} />
                    </div>
                )}
            </>
        ),

        kulit: (
            <>
                <div className="dsn-glabel">{C.reveal}</div>
                <CardPicker<CoverReveal>
                    value={config.cover.reveal}
                    onChange={(v) => setCover({ reveal: v })}
                    options={(['plain', 'curtain', 'door', 'envelope', 'box', 'zoom', 'blinds', 'split'] as CoverReveal[]).map((r) => ({ id: r, label: C.reveals[r] }))}
                />
                <div className="dsn-glabel">{C.accentColor}</div>
                <ColorField label={C.accentColor} value={toHex(config.cover.accentColor, config.palette.primary)} onChange={(v) => setCover({ accentColor: v })} />

                {/* Replay the reveal in the live preview so it's seen, not guessed. */}
                <button type="button" className="dsn-seg-btn dsn-upbtn" style={{ marginTop: 16 }} onClick={() => setPlaySeq((n) => n + 1)}>
                    <Eye size={15} /> {C.playOpening}
                </button>

                {/* Welcome gate — a "tap to open" cover, for the overlay reveals. */}
                {(['curtain', 'door', 'box'] as CoverReveal[]).includes(config.cover.reveal) && (
                    <>
                        <label className="dsn-toggle-row" style={{ marginTop: 18, cursor: 'pointer' }}>
                            <span className="dsn-toggle-label">{C.gate}</span>
                            <Switch on={config.cover.gate !== false} label={C.gate} onChange={(v) => setCover({ gate: v })} />
                        </label>
                        <p className="dsn-hint" style={{ margin: '8px 0 0' }}>{C.gateHint}</p>
                        {config.cover.gate !== false && (
                            <div className="field" style={{ marginTop: 12 }}>
                                <label>{C.openLabel}</label>
                                <input type="text" maxLength={20} value={config.cover.openLabel ?? ''} placeholder="Buka" onChange={(e) => setCover({ openLabel: e.target.value })} />
                            </div>
                        )}
                    </>
                )}
            </>
        ),

        kesan: (
            <>
                <div className="dsn-glabel">{C.effectType}</div>
                <CardPicker<AmbientEffect>
                    value={config.effect.type}
                    onChange={(v) => setEffect({ type: v })}
                    options={(['none', 'petals', 'sakura', 'hearts', 'stars', 'sparkles', 'snow', 'leaves', 'bubbles', 'confetti', 'fireflies', 'butterflies', 'bokeh', 'dust', 'rain', 'embers', 'feathers', 'notes', 'meteors'] as AmbientEffect[]).map((e) => ({ id: e, label: C.effects[e] }))}
                />
                {config.effect.type !== 'none' && (
                    <>
                        <div className="dsn-glabel">{C.color}</div>
                        <ColorField label={C.color} value={toHex(config.effect.color, config.palette.accent)} onChange={(v) => setEffect({ color: v })} />
                        <div className="dsn-glabel">{C.density}</div>
                        <RangeField min={4} max={24} value={config.effect.density} onChange={(v) => setEffect({ density: v })} />
                    </>
                )}
            </>
        ),

        hiasan: (
            <>
                <div className="dsn-glabel">{C.decoStyle}</div>
                <CardPicker<DecorationStyle>
                    value={config.decoration.style}
                    onChange={(v) => setDeco({ style: v })}
                    options={(['none', 'cornerFloral', 'roots', 'leaves', 'geometric', 'goldFrame', 'arch', 'lantern', 'artdeco', 'moroccan', 'doubleHappiness', 'ovalFrame', 'floralCorners', 'tropical', 'celestial', 'lace', 'heartVine'] as DecorationStyle[]).map((d) => ({ id: d, label: C.decos[d] }))}
                />
                {config.decoration.style !== 'none' && (
                    <>
                        <div className="dsn-glabel">{C.color}</div>
                        <ColorField label={C.color} value={toHex(config.decoration.color, config.palette.accent)} onChange={(v) => setDeco({ color: v })} />
                    </>
                )}
            </>
        ),

        bahagian: (
            <>
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
            </>
        ),

        butiran: (
            <>
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
                    <ComboBox value={category} onChange={setCategory} options={categoryOptions} placeholder={C.catPh} ariaLabel={C.category} />
                </div>
                <div className="field">
                    <label>{C.description} <span className="muted" style={{ fontWeight: 400 }}>{C.descOptional}</span></label>
                    <textarea rows={2} value={description} maxLength={200} placeholder={C.descPh} onChange={(e) => setDescription(e.target.value)} />
                </div>
                {isCustomDesign && <>
                    <div className="dsn-glabel">{C.motion}</div>
                    <Segmented<CustomTemplateConfig['motion']>
                        value={config.motion}
                        onChange={(v) => setConfig((c) => ({ ...c, motion: v }))}
                        options={(['calm', 'lively'] as CustomTemplateConfig['motion'][]).map((m) => ({ id: m, label: C.motions[m] }))}
                    />
                </>}

                {/* Pricing & gallery visibility — admin only. A contributing user
                    never prices a design (it defaults to free/inactive until review). */}
                {isAdmin && (
                    <>
                        <div className="dsn-glabel">{C.pricing}</div>
                        <div className="dsn-sublabel">{C.tier}</div>
                        <Segmented<'free' | 'premium'>
                            value={tier}
                            onChange={(v) => setTier(v)}
                            options={[{ id: 'free', label: C.free }, { id: 'premium', label: C.premium }]}
                        />
                        {tier === 'premium' && (
                            <div className="dsn-grad" style={{ marginTop: 12 }}>
                                <div className="field" style={{ margin: 0 }}>
                                    <label>{C.price}</label>
                                    <NumberInput decimals min={0} step="0.01" value={priceMyr} onChange={(x) => setPriceMyr(x)} />
                                </div>
                                <div className="field" style={{ margin: 0 }}>
                                    <label>{C.discount}</label>
                                    <NumberInput decimals min={0} step="0.01" value={discountPrice} onChange={(x) => setDiscountPrice(x)} />
                                </div>
                                <p className="dsn-hint" style={{ gridColumn: '1 / -1', margin: '2px 0 0' }}>{C.discountHint}</p>
                            </div>
                        )}
                        <label className="dsn-toggle-row" style={{ marginTop: 16, cursor: 'pointer' }}>
                            <span className="dsn-toggle-label">{C.activeGallery}</span>
                            <Switch on={isActive} label={C.activeGallery} onChange={(v) => setIsActive(v)} />
                        </label>
                    </>
                )}

                <p className="dsn-hint" style={{ margin: '18px 0 0' }}>{isAdmin ? C.adminNote : C.userNote}</p>
            </>
        ),
    };

    return (
        <div className="dsn">
            <style>{DSN_CSS}</style>

            <ThumbnailStage job={thumbJob} onCaptured={onThumbCaptured} onFailed={() => setThumbJob(null)} />

            {/* ---------- Header ---------- */}
            <div className="dsn-head">
                <div className="dsn-head-l">
                    <button className="btn btn-ghost btn-sm" onClick={() => nav(designsHome)} aria-label={C.back}><ArrowLeft size={15} /></button>
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

            {isWide ? (
                /* ---------- Desktop: top tab bar + form pane (left) + sticky
                   preview (right) — the SAME shape as the host card editor, with
                   every design control living in the pane. ---------- */
                <div className="dsn-desk">
                    <nav className="dsn-tabbar" role="tablist" aria-label={lang === 'bm' ? 'Alat reka' : 'Design tools'}>
                        {visibleTabs.map((t) => {
                            const active = deskTab === t;
                            return (
                                <button
                                    key={t}
                                    role="tab"
                                    aria-selected={active}
                                    className={`dsn-toptab${active ? ' is-active' : ''}`}
                                    onClick={() => setOpenTab(t)}
                                    title={C.tabs[t]}
                                >
                                    {TAB_ICON[t]}
                                    <span className="lbl">{C.tabs[t]}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="dsn-cols">
                        <section className="panel dsn-pane" aria-label={C.tabs[deskTab]}>
                            <header className="dsn-pane-head">
                                <h2>{C.tabs[deskTab]}</h2>
                                <p>{C.subs[deskTab]}</p>
                            </header>
                            <div className="dsn-pane-body pk-scroll">{BODY[deskTab]}</div>
                        </section>

                        <aside className="dsn-side">
                            <ConfigPreview config={config} renderKey={renderKey} isCustom={isCustomDesign} play={playSeq} gallery={previewGallery} />
                        </aside>
                    </div>
                </div>
            ) : (
                /* ---------- Mobile: preview hero + bottom dock + one sheet per
                   tab. Unchanged — this is the phone-first UI. ---------- */
                <>
                    <div className="dsn-stage">
                        <ConfigPreview config={config} renderKey={renderKey} isCustom={isCustomDesign} play={playSeq} gallery={previewGallery} />
                    </div>

                    <nav className="dsn-dock" aria-label={lang === 'bm' ? 'Alat reka' : 'Design tools'}>
                        <div className="dsn-dock-track">
                            {visibleTabs.map((t) => (
                                <button key={t} className="dsn-tab" onClick={() => setOpenTab(t)} aria-haspopup="dialog" title={C.tabs[t]}>
                                    {TAB_ICON[t]}
                                    <span className="lbl">{C.tabs[t]}</span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    {visibleTabs.map((t) => (
                        <EditorSheet key={t} open={openTab === t} onClose={() => setOpenTab(null)} title={C.tabs[t]} subtitle={C.subs[t]}>
                            {BODY[t]}
                        </EditorSheet>
                    ))}
                </>
            )}

            {/* ---------- Full-screen preview overlay (animations play) ---------- */}
            {fsOpen && (
                <div className="dsn-fs" role="dialog" aria-modal="true" aria-label={C.preview}>
                    <button className="dsn-fs-close" onClick={() => setFsOpen(false)} aria-label={C.close}><X size={20} /></button>
                    <div className="dsn-fs-scroll pk-scroll">
                        <div className="dsn-fs-card">
                            <FullCard config={config} renderKey={renderKey} isCustom={isCustomDesign} gallery={previewGallery} />
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

/**
 * Build the preview data: a no-code design drives colours through `config`; a
 * built-in template renders its real component with its art palette + the edited
 * palette override (exactly as the live card does).
 */
function usePreviewData(config: CustomTemplateConfig, renderKey: string, isCustom: boolean, gallery: string[] = []) {
    return useMemo(() => {
        // Admin sample photos so the Gallery section previews with content.
        const g = gallery.length ? { galleryImages: gallery } : {};
        // Event designs render the EventPoster with event sample content + the
        // theme carried in config (so an event copy/edit previews the EVENT, not
        // a wedding card).
        if (renderKey === 'eventposter') {
            return { ...EVENT_SAMPLE, palette: config.palette, templateConfig: config };
        }
        return isCustom
            ? { ...SAMPLE_INVITATION, ...g, templateConfig: config }
            : { ...SAMPLE_INVITATION, ...g, palette: readablePalette({ ...(artFor(renderKey)?.palette ?? {}), ...config.palette } as Palette) };
    }, [config, renderKey, isCustom, gallery]);
}

/** Scaled, scrollable phone-frame render of the live design (preview mode). */
function ConfigPreview({ config, renderKey, isCustom, play = 0, gallery = [] }: { config: CustomTemplateConfig; renderKey: string; isCustom: boolean; play?: number; gallery?: string[] }) {
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

    const Tpl = getTemplate(isCustom ? 'custom' : renderKey);
    const data = usePreviewData(config, renderKey, isCustom, gallery);
    // "Play opening": remount live (no `preview` → animations run) with the gate
    // auto-opened (the scaled preview can't be tapped), so the reveal plays.
    const playing = play > 0 && isCustom;
    const playData = useMemo(
        () => ({ ...SAMPLE_INVITATION, ...(gallery.length ? { galleryImages: gallery } : {}), templateConfig: { ...config, cover: { ...config.cover, gate: false } } }),
        [config, gallery],
    );

    return (
        <div className="dsn-device">
            <span className="dsn-speaker" aria-hidden="true" />
            <div ref={frameRef} className="pk-scroll dsn-screen" style={{ height: 'min(70vh, 760px)' }}>
                <div style={{ height: stageH, overflow: 'hidden' }}>
                    <div ref={stageRef} style={{ width: STAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                        {playing ? <Tpl key={play} data={playData} /> : <Tpl data={{ ...data, previewFx: true }} preview />}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Full card (no preview crop) so entrance animations play in the overlay. */
function FullCard({ config, renderKey, isCustom, gallery = [] }: { config: CustomTemplateConfig; renderKey: string; isCustom: boolean; gallery?: string[] }) {
    const Tpl = getTemplate(isCustom ? 'custom' : renderKey);
    const data = usePreviewData(config, renderKey, isCustom, gallery);
    return <Tpl data={data} />;
}

/* ================================================================== */
/* Reusable controls                                                   */
/* ================================================================== */

function StatusBadge({ status, lang }: { status: DesignStatus; lang: Lang }) {
    const L = dict({
        bm: { draft: 'Draf', pending: 'Menunggu', approved: 'Diterbitkan', rejected: 'Ditolak' },
        en: { draft: 'Draft', pending: 'Pending', approved: 'Published', rejected: 'Rejected' },
    }, lang) as Record<DesignStatus, string>;
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

/* ---- Desktop 3-pane (mirrors the host card editor) ---- */
.dsn-desk { margin-top: 18px; }
.dsn-cols {
    display: grid; gap: 18px; align-items: start;
    grid-template-columns: minmax(0, 1fr) clamp(324px, 26vw, 400px);
}
.dsn-tabbar {
    display: flex; gap: 4px; margin-bottom: 14px; padding: 6px;
    background: #fff; border: 1px solid var(--line); border-radius: 16px;
    overflow-x: auto; overscroll-behavior-x: contain;
    scrollbar-width: thin; scrollbar-color: rgba(74, 59, 196, 0.45) transparent;
}
.dsn-tabbar::-webkit-scrollbar { height: 4px; }
.dsn-tabbar::-webkit-scrollbar-thumb { background: rgba(74, 59, 196, 0.45); border-radius: 999px; }
.dsn-toptab {
    position: relative; display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto;
    padding: 9px 14px; border: 0; background: transparent; border-radius: 11px; cursor: pointer;
    font: inherit; font-size: 13.5px; font-weight: 600; color: var(--muted); white-space: nowrap;
    transition: background .15s ease, color .15s ease;
}
.dsn-toptab > svg { flex: none; }
.dsn-toptab:hover { background: var(--cream); color: var(--plum); }
.dsn-toptab.is-active { background: var(--plum); color: #fff; }
.dsn-pane { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.dsn-pane-head {
    flex: none; padding: 18px 20px 14px; border-bottom: 1px solid var(--line);
}
.dsn-pane-head h2 { margin: 0; font-size: 19px; color: var(--plum); line-height: 1.2; }
.dsn-pane-head p { margin: 3px 0 0; font-size: 13px; color: var(--muted); line-height: 1.45; }
.dsn-pane-body { padding: 18px 20px 24px; overflow-y: auto; max-height: calc(100vh - 268px); }
.dsn-side { position: sticky; top: 16px; }

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
