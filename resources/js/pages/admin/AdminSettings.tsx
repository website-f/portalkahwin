import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NumberInput } from '../../components/NumberInput';
import {
    Check, Save, Plus, Pencil, Trash2, SlidersHorizontal, Type,
    Package as PackageIcon, Ticket, ToggleRight, Music, ReceiptText, ListChecks, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { type CardFont } from '../../lib/cardFonts';
import { Drawer } from '../../components/Drawer';
import { MusicTrimmer } from '../../components/MusicTrimmer';
import { youtubeId } from '../../components/MusicPlayer';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

/* ----------------------------- types ----------------------------- */

type TabKey = 'umum' | 'pakej' | 'muzik' | 'ciri' | 'medan';

/** One platform deduction line for pay-per-entry (commission, FPX fee, …). */
interface PpeCharge {
    name: string;
    mode: 'percent' | 'flat';
    value: number | string;
}

interface Settings {
    site_name: string;
    support_email: string;
    currency: string;
    premium_price_myr: number | string;
    free_card_limit: number | string;
    free_guest_limit: number | string;
    premium_guest_limit: number | string;
    // feature toggles arrive as 'true' / 'false' strings
    [key: string]: string | number | boolean | undefined;
}

interface Pkg {
    id?: string;
    name: string;
    role_target: 'any' | 'user' | 'vendor' | 'affiliate';
    price_myr: number | string;
    interval: 'monthly' | 'yearly' | 'once';
    features: string[];
    is_active: boolean;
    sort: number;
}

interface Vch {
    id?: string;
    code: string;
    kind: 'full' | 'percent' | 'amount';
    value: number | string;
    max_uses: number | string | null;
    used_count?: number;
    expires_at?: string | null;
    is_active: boolean;
    once_per_user?: boolean;
    /** Roles allowed to redeem. Empty/absent = open to every role. */
    roles?: string[] | null;
    note?: string | null;
}

/** Read a numeric setting out of the mixed settings bag, with a fallback. */
const num = (v: string | number | boolean | undefined, fallback: number): number =>
    (v === undefined || v === null || typeof v === 'boolean' || v === '' ? fallback : Number(v));

const BLANK_PKG: Pkg = { name: '', role_target: 'any', price_myr: 0, interval: 'monthly', features: [], is_active: true, sort: 0 };
/** A background track offered to hosts in the card editor. */
interface Song {
    id?: string;
    title: string;
    artist?: string | null;
    url: string;
    start_sec: number;
    end_sec: number | null;
    duration_sec: number | null;
    sort: number;
    is_active: boolean;
}
const BLANK_SONG: Song = { title: '', artist: '', url: '', start_sec: 0, end_sec: null, duration_sec: null, sort: 0, is_active: true };

const BLANK_VCH: Vch = { code: '', kind: 'percent', value: 10, max_uses: '', expires_at: '', is_active: true, once_per_user: false, roles: [], note: '' };

/**
 * The ONLY features an admin may attach to a package — every one maps to a
 * capability the platform actually ships, so a package can never advertise
 * something that doesn't exist. The picker stores the label in the current UI
 * language; an option counts as "chosen" if either language's label is present.
 */
interface FeatureOption { bm: string; en: string }
const FEATURE_OPTIONS: FeatureOption[] = [
    { bm: 'Kad tanpa had', en: 'Unlimited cards' },
    { bm: 'Susun atur meja (agihan automatik)', en: 'Seating plan (auto-assign)' },
    { bm: 'Daftar masuk QR', en: 'QR check-in' },
    { bm: 'Semua rekaan premium', en: 'All premium designs' },
    { bm: 'Reka rekaan sendiri', en: 'Design your own templates' },
    { bm: 'Logo & profil syarikat', en: 'Company logo & profile' },
    { bm: 'Salam kaut tanpa had', en: 'Unlimited cash gifts' },
    { bm: 'Galeri & muzik latar', en: 'Gallery & background music' },
    { bm: 'RSVP & buku ucapan', en: 'RSVP & guestbook' },
    { bm: 'Senarai hadiah', en: 'Gift registry' },
    { bm: 'Eksport senarai tetamu (Excel)', en: 'Guest list export (Excel)' },
    { bm: 'Tanpa tanda air', en: 'No watermark' },
    { bm: 'Pautan majlis 24 jam', en: '24-hour event link' },
    { bm: 'Kod baucar', en: 'Voucher codes' },
    { bm: 'Storan lanjutan', en: 'Extended storage' },
    { bm: 'Sokongan keutamaan', en: 'Priority support' },
];

/* Role x feature matrix — mirrors Setting::FEATURES / FEATURE_ROLES on the server. */
const FEATURES = ['seating', 'checkin', 'qr_passes', 'company_branding', 'designer'] as const;
const FEATURE_ROLES = ['user', 'vendor', 'affiliate'] as const;
type FeatureName = (typeof FEATURES)[number];
type FeatureRole = (typeof FEATURE_ROLES)[number];
const featureKey = (role: FeatureRole, f: FeatureName) => `feat_${role}_${f}`;

const TOGGLE_KEYS = ['allow_user_templates', 'payment_enabled_user', 'payment_enabled_vendor', 'payment_enabled_affiliate'] as const;
type ToggleKey = (typeof TOGGLE_KEYS)[number];

/* --------------------------- component --------------------------- */

export function AdminSettings() {
    const { lang } = useLang();
    const dialog = useDialog();
    const C = dict({
        bm: {
            title: 'Tetapan', subtitle: 'Urus platform, pakej, baucar dan ciri — semua di satu tempat.',
            tabUmum: 'Umum', tabPakej: 'Pakej & Baucar', tabBaucar: 'Baucar', tabCiri: 'Ciri', tabMedan: 'Medan Profil',
            medanTitle: 'Medan Profil & Resit', medanSub: 'Kawal identiti resit penjual dan bina medan tersuai untuk profil setiap peranan.',
            medanBrandTitle: 'Benarkan vendor & affiliate guna perniagaan sendiri pada resit',
            medanBrandHint: 'Apabila dimatikan, semua resit menggunakan identiti platform tanpa mengira tetapan penjual.',
            medanEditorTitle: 'Editor Medan', medanEditorSub: 'Tambah, susun dan tetapkan medan profil (setiap kumpulan menjadi satu tab). Boleh disasarkan kepada satu atau lebih peranan.', medanOpen: 'Buka Editor Medan',
            tabMuzik: 'Muzik',
            addSong: 'Tambah Lagu', emptySong: 'Belum ada lagu. Tambah lagu untuk ditawarkan kepada pengguna.',
            drawerSongEdit: 'Sunting Lagu', drawerSongAdd: 'Tambah Lagu',
            songTitle: 'Tajuk lagu', songArtist: 'Artis (pilihan)', songUrl: 'Pautan YouTube atau MP3',
            songUrlHint: 'Tampal pautan YouTube atau muat naik fail MP3. Pengguna boleh pilih lagu ini terus dari editor kad.',
            trimLabel: 'Potong lagu (mula & tamat)',
            ytFull: 'Pautan YouTube dimainkan penuh buat masa ini (pemotongan untuk fail MP3 sahaja).',
            uploadMp3: 'Muat Naik MP3', uploading: 'Memuat naik…', uploaded: 'Fail dimuat naik.',
            activeSong: 'Aktif (papar kepada pengguna)',
            confirmDeleteSong: (t: string) => `Padam lagu "${t}"?`,
            // umum
            general: 'Umum', siteName: 'Nama laman', supportEmail: 'E-mel sokongan', currency: 'Mata wang',
            receiptIdentity: 'Identiti Resit', receiptHint: 'Dipaparkan pada setiap resit & invois pembelian.',
            rcCompany: 'Nama syarikat', rcDescription: 'Penerangan perniagaan', rcPhone: 'Telefon', rcWebsite: 'Laman web', rcEmail: 'E-mel',
            flowTitle: 'Aliran Percubaan & Pembelian', flowHint: 'Cara pengguna biasa & affiliate sampai ke kad yang diterbitkan.',
            flowMode: 'Aliran pengguna', flowTrial: 'Cuba dulu (isi kad, log masuk, bayar untuk terbit)', flowBuy: 'Beli dahulu (beli sebelum menyunting)',
            trialViewLimit: 'Had paparan mod percubaan', cardEditLimit: 'Had suntingan setiap kad', zeroUnlimited: '0 = tanpa had',
            limitsTitle: 'Had Akaun Pengguna',
            limitsHint: 'Had ini terpakai untuk akaun pengguna biasa. Harga langganan Vendor & Affiliate ditetapkan pada setiap pakej di bawah — bukan di sini.',
            freeCardLimit: 'Had kad percuma', freeGuestLimit: 'Had tetamu percuma', premiumGuestLimit: 'Had tetamu Premium',
            uploadTitle: 'Muat Naik & Storan',
            uploadHint: 'Had saiz setiap fail dan kuota storan permulaan bagi setiap peranan. Kuota individu masih boleh diubah dari halaman Kelulusan.',
            maxUpload: 'Had saiz setiap fail (MB)',
            quotaVendor: 'Kuota storan Vendor (MB)', quotaAffiliate: 'Kuota storan Affiliate (MB)', quotaUser: 'Kuota storan Pengguna (MB)',
            saved: 'Disimpan', saving: 'Menyimpan…', saveSettings: 'Simpan Tetapan', changesSaved: 'Perubahan telah disimpan.',
            unlimitedHint: '0 = tanpa had',
            // pakej
            addPackage: 'Tambah Pakej', emptyPkg: 'Belum ada pakej. Klik “Tambah Pakej” untuk bermula.',
            drawerPkgEdit: 'Sunting Pakej', drawerPkgAdd: 'Tambah Pakej',
            pkgName: 'Nama pakej', roleTarget: 'Sasaran peranan', price: 'Harga (RM)', interval: 'Kitaran', features: 'Ciri',
            addFeature: 'Pilih ciri…', featureHint: 'Hanya ciri yang benar-benar disokong oleh sistem boleh dipilih.',
            noFeatures: 'Tiada ciri lagi.', sort: 'Susunan', activePkg: 'Aktif (papar kepada pelanggan)',
            roleAny: 'Semua', roleVendor: 'Vendor', roleAffiliate: 'Affiliate',
            intMonthly: 'Bulanan', intYearly: 'Tahunan', intOnce: 'Sekali', perMonth: '/bln', perYear: '/thn', oneOff: 'sekali',
            confirmDeletePkg: (n: string) => `Padam pakej "${n}"?`,
            // baucar
            addVoucher: 'Tambah Baucar', code: 'Kod', kind: 'Jenis', value: 'Nilai', uses: 'Guna', expiry: 'Luput', status: 'Status',
            drawerVchEdit: 'Sunting Baucar', drawerVchAdd: 'Tambah Baucar',
            kindFull: 'Percuma penuh', kindPercent: 'Peratus (%)', kindAmount: 'Amaun (RM)',
            maxUses: 'Had guna', maxUsesHint: 'Kosongkan untuk tanpa had.', expiresAt: 'Tarikh luput', note: 'Nota', activeVch: 'Aktif (boleh ditebus)',
            vchRoles: 'Untuk peranan', vchRolesAll: 'Semua pengguna',
            vchRolesHint: 'Biarkan kosong untuk kod terbuka kepada semua, atau pilih peranan tertentu sahaja.',
            roleUser: 'Pengguna', roleVendorV: 'Vendor', roleAffiliateV: 'Affiliate',
            oncePerUser: 'Sekali setiap pengguna', oncePerUserHint: 'Setiap pengguna hanya boleh guna kod ini sekali sahaja.',
            emptyVch: 'Belum ada baucar.', never: '—', free: 'Percuma',
            confirmDeleteVch: (c: string) => `Padam baucar "${c}"?`,
            deleteSelected: 'Padam Pilihan',
            confirmDeleteMany: (n: number) => `Padam ${n} rekod yang dipilih? Tindakan ini tidak boleh dibatalkan.`,
            // ciri
            featureToggles: 'Ciri Platform', togglesSub: 'Hidupkan atau matikan ciri. Perubahan disimpan serta-merta.',
            t_allow_user_templates: 'Benarkan pengguna sumbang rekaan',
            t_allow_user_templates_d: 'Jika hidup, semua pengguna boleh menghantar rekaan kad untuk disemak.',
            t_payment_enabled_user: 'Aktifkan pembayaran untuk pengguna',
            t_payment_enabled_vendor: 'Aktifkan pembayaran untuk vendor',
            t_payment_enabled_affiliate: 'Aktifkan pembayaran untuk affiliate',
            t_payment_d: 'Membenarkan checkout & langganan berbayar untuk peranan ini.',
            on: 'Hidup', offState: 'Mati',
            matrixTitle: 'Ciri Mengikut Peranan',
            matrixSub: 'Tentukan ciri yang boleh digunakan oleh setiap peranan. Admin sentiasa mempunyai akses penuh. Perubahan disimpan serta-merta dan terus berkuat kuasa.',
            fRole: 'Peranan', fUser: 'Pengguna', fVendor: 'Vendor', fAffiliate: 'Affiliate',
            f_seating: 'Susun Atur Meja', f_seating_d: 'Cipta meja, tetapkan kapasiti dan tempatkan tetamu.',
            f_checkin: 'Daftar Masuk', f_checkin_d: 'Tandakan kehadiran tetamu dan imbas kod QR pada hari majlis.',
            f_qr_passes: 'Pas QR Tetamu', f_qr_passes_d: 'Jana pas QR untuk setiap tetamu.',
            f_company_branding: 'Penjenamaan Syarikat', f_company_branding_d: 'Logo dan nama syarikat pada kad jemputan.',
            f_designer: 'Reka Rekaan Sendiri', f_designer_d: 'Akses kepada alat reka bentuk kad.',
            // shared
            active: 'Aktif', off: 'Tidak aktif', edit: 'Sunting', cancel: 'Batal', save: 'Simpan', del: 'Padam',
            search: 'Cari kod…',
        },
        en: {
            title: 'Settings', subtitle: 'Manage the platform, packages, vouchers & features — all in one place.',
            tabUmum: 'General', tabPakej: 'Packages & Vouchers', tabBaucar: 'Vouchers', tabCiri: 'Features', tabMedan: 'Profile Fields',
            medanTitle: 'Profile & Receipt Fields', medanSub: 'Control the seller receipt identity and build custom fields for each role\'s profile.',
            medanBrandTitle: 'Allow vendors & affiliates to use their own business on receipts',
            medanBrandHint: 'When off, all receipts use the platform identity regardless of a seller\'s own setting.',
            medanEditorTitle: 'Field editor', medanEditorSub: 'Add, order and target profile fields (each group becomes a tab). Fields can apply to one or more roles.', medanOpen: 'Open field editor',
            tabMuzik: 'Music',
            addSong: 'Add track', emptySong: 'No tracks yet. Add one to offer it to hosts.',
            drawerSongEdit: 'Edit track', drawerSongAdd: 'Add track',
            songTitle: 'Track title', songArtist: 'Artist (optional)', songUrl: 'YouTube or MP3 link',
            songUrlHint: 'Paste a YouTube link or upload an MP3. Hosts can pick it straight from the card editor.',
            trimLabel: 'Trim track (start & end)',
            ytFull: 'YouTube links play in full for now (trimming is for uploaded MP3 files).',
            uploadMp3: 'Upload MP3', uploading: 'Uploading…', uploaded: 'File uploaded.',
            activeSong: 'Active (offer to hosts)',
            confirmDeleteSong: (t: string) => `Delete track "${t}"?`,
            general: 'General', siteName: 'Site name', supportEmail: 'Support email', currency: 'Currency',
            receiptIdentity: 'Receipt identity', receiptHint: 'Shown on every purchase receipt & invoice.',
            rcCompany: 'Company name', rcDescription: 'Business description', rcPhone: 'Phone', rcWebsite: 'Website', rcEmail: 'Email',
            flowTitle: 'Trial & purchase flow', flowHint: 'How normal users & affiliates reach a published card.',
            flowMode: 'User flow', flowTrial: 'Trial first (fill the card, log in, pay to publish)', flowBuy: 'Buy first (purchase before editing)',
            trialViewLimit: 'Trial view limit', cardEditLimit: 'Edit limit per card', zeroUnlimited: '0 = unlimited',
            limitsTitle: 'Normal user limits',
            limitsHint: 'These limits apply to normal user accounts. Vendor & affiliate subscription pricing is set per package below — not here.',
            freeCardLimit: 'Free card limit', freeGuestLimit: 'Free guest limit', premiumGuestLimit: 'Premium guest limit',
            uploadTitle: 'Uploads & storage',
            uploadHint: 'Per-file size cap and the starting storage quota for each role. Individual quotas can still be revised from Approvals.',
            maxUpload: 'Max size per file (MB)',
            quotaVendor: 'Vendor storage quota (MB)', quotaAffiliate: 'Affiliate storage quota (MB)', quotaUser: 'Normal user storage quota (MB)',
            saved: 'Saved', saving: 'Saving…', saveSettings: 'Save settings', changesSaved: 'Changes saved.',
            unlimitedHint: '0 = unlimited',
            addPackage: 'Add package', emptyPkg: 'No packages yet. Click “Add package” to get started.',
            drawerPkgEdit: 'Edit package', drawerPkgAdd: 'Add package',
            pkgName: 'Package name', roleTarget: 'Role target', price: 'Price (RM)', interval: 'Interval', features: 'Features',
            addFeature: 'Choose a feature…', featureHint: 'Only features the platform actually supports can be selected.',
            noFeatures: 'No features yet.', sort: 'Sort', activePkg: 'Active (show to customers)',
            roleAny: 'Anyone', roleVendor: 'Vendor', roleAffiliate: 'Affiliate',
            intMonthly: 'Monthly', intYearly: 'Yearly', intOnce: 'One-off', perMonth: '/mo', perYear: '/yr', oneOff: 'once',
            confirmDeletePkg: (n: string) => `Delete package "${n}"?`,
            addVoucher: 'Add voucher', code: 'Code', kind: 'Kind', value: 'Value', uses: 'Uses', expiry: 'Expiry', status: 'Status',
            drawerVchEdit: 'Edit voucher', drawerVchAdd: 'Add voucher',
            kindFull: 'Fully free', kindPercent: 'Percent (%)', kindAmount: 'Amount (RM)',
            maxUses: 'Max uses', maxUsesHint: 'Leave blank for unlimited.', expiresAt: 'Expiry date', note: 'Note', activeVch: 'Active (redeemable)',
            vchRoles: 'Available to', vchRolesAll: 'All users',
            vchRolesHint: 'Leave empty for a code open to everyone, or pick the roles it applies to.',
            roleUser: 'Users', roleVendorV: 'Vendors', roleAffiliateV: 'Affiliates',
            oncePerUser: 'One use per user', oncePerUserHint: 'Each user can redeem this code only once.',
            emptyVch: 'No vouchers yet.', never: '—', free: 'Free',
            confirmDeleteVch: (c: string) => `Delete voucher "${c}"?`,
            deleteSelected: 'Delete selected',
            confirmDeleteMany: (n: number) => `Delete ${n} selected records? This cannot be undone.`,
            featureToggles: 'Platform features', togglesSub: 'Turn features on or off. Changes are saved immediately.',
            t_allow_user_templates: 'Allow users to contribute designs',
            t_allow_user_templates_d: 'If on, any user can submit card designs for review.',
            t_payment_enabled_user: 'Enable payments for users',
            t_payment_enabled_vendor: 'Enable payments for vendors',
            t_payment_enabled_affiliate: 'Enable payments for affiliates',
            t_payment_d: 'Allows paid checkout & subscriptions for this role.',
            on: 'On', offState: 'Off',
            matrixTitle: 'Features by role',
            matrixSub: 'Choose what each role may use. Admins always have full access. Changes save immediately and take effect at once.',
            fRole: 'Role', fUser: 'Normal User', fVendor: 'Vendor', fAffiliate: 'Affiliate',
            f_seating: 'Table management', f_seating_d: 'Create tables, set capacity and seat guests.',
            f_checkin: 'Check-in', f_checkin_d: 'Mark guests as attended and scan QR codes on the day.',
            f_qr_passes: 'Guest QR passes', f_qr_passes_d: 'Generate a QR pass for each guest.',
            f_company_branding: 'Company branding', f_company_branding_d: 'Company logo and name on invitation cards.',
            f_designer: 'Design your own', f_designer_d: 'Access to the card design tool.',
            active: 'Active', off: 'Off', edit: 'Edit', cancel: 'Cancel', save: 'Save', del: 'Delete',
            search: 'Search code…',
        },
        zh: {
            title: '设置', subtitle: '在同一处管理平台、套餐、优惠码与功能开关。',
            tabUmum: '通用', tabPakej: '套餐与优惠码', tabBaucar: '优惠码', tabCiri: '功能', tabMedan: '资料字段',
            medanTitle: '资料与收据字段', medanSub: '控制卖家收据信息，并为每种身份的资料页构建自定义字段。',
            medanBrandTitle: '允许商家与联盟伙伴在收据上使用自己的商号',
            medanBrandHint: '关闭后，无论卖家如何设置，所有收据都使用平台信息。',
            medanEditorTitle: '字段编辑器', medanEditorSub: '添加、排序并指定资料字段（每个分组成为一个标签页）。字段可适用于一个或多个身份。', medanOpen: '打开字段编辑器',
            tabMuzik: '音乐',
            addSong: '添加曲目', emptySong: '暂无曲目。添加后即可提供给用户。',
            drawerSongEdit: '编辑曲目', drawerSongAdd: '添加曲目',
            songTitle: '曲目名称', songArtist: '歌手（可选）', songUrl: 'YouTube 或 MP3 链接',
            songUrlHint: '粘贴 YouTube 链接或上传 MP3 文件。用户可在请柬编辑器中直接选择。',
            trimLabel: '裁剪曲目（开始与结束）',
            ytFull: 'YouTube 链接暂时完整播放（裁剪仅适用于上传的 MP3 文件）。',
            uploadMp3: '上传 MP3', uploading: '上传中…', uploaded: '文件已上传。',
            activeSong: '启用（向用户展示）',
            confirmDeleteSong: (t: string) => `删除曲目“${t}”？`,
            general: '通用设置', siteName: '网站名称', supportEmail: '客服邮箱', currency: '货币',
            receiptIdentity: '收据信息', receiptHint: '显示在每张购买收据和发票上。',
            rcCompany: '公司名称', rcDescription: '业务描述', rcPhone: '电话', rcWebsite: '网站', rcEmail: '电子邮箱',
            flowTitle: '试用与购买流程', flowHint: '普通用户与联盟伙伴如何发布请柬。',
            flowMode: '用户流程', flowTrial: '先试用（填写请柬、登录、付费发布）', flowBuy: '先购买（编辑前先付费）',
            trialViewLimit: '试用浏览上限', cardEditLimit: '每张请柬编辑上限', zeroUnlimited: '0 = 不限',
            limitsTitle: '一般用户限额',
            limitsHint: '这些限额适用于一般用户账户。商家与联盟伙伴的订阅价格在下方各套餐中单独设置，不在此处。',
            freeCardLimit: '免费方案请柬上限', freeGuestLimit: '免费方案宾客上限', premiumGuestLimit: '付费方案宾客上限',
            uploadTitle: '上传与存储',
            uploadHint: '单个文件的大小上限，以及各身份的初始存储配额。个别用户的配额仍可在「审批」页中调整。',
            maxUpload: '单个文件上限（MB）',
            quotaVendor: '商家存储配额（MB）', quotaAffiliate: '联盟伙伴存储配额（MB）', quotaUser: '一般用户存储配额（MB）',
            saved: '已保存', saving: '保存中…', saveSettings: '保存设置', changesSaved: '更改已保存。',
            unlimitedHint: '0 = 不限',
            addPackage: '添加套餐', emptyPkg: '暂无套餐。点击「添加套餐」开始。',
            drawerPkgEdit: '编辑套餐', drawerPkgAdd: '添加套餐',
            pkgName: '套餐名称', roleTarget: '适用身份', price: '价格（RM）', interval: '计费周期', features: '包含功能',
            addFeature: '选择一项功能…', featureHint: '只能选择平台实际支持的功能。',
            noFeatures: '尚未添加功能。', sort: '排序', activePkg: '上架（对客户显示）',
            roleAny: '所有人', roleVendor: '商家', roleAffiliate: '联盟伙伴',
            intMonthly: '按月', intYearly: '按年', intOnce: '一次性', perMonth: '/月', perYear: '/年', oneOff: '一次性',
            confirmDeletePkg: (n: string) => `确定删除套餐「${n}」？`,
            addVoucher: '添加优惠码', code: '代码', kind: '类型', value: '数值', uses: '使用次数', expiry: '有效期', status: '状态',
            drawerVchEdit: '编辑优惠码', drawerVchAdd: '添加优惠码',
            kindFull: '全额免费', kindPercent: '百分比（%）', kindAmount: '固定金额（RM）',
            maxUses: '可用次数上限', maxUsesHint: '留空表示不限次数。', expiresAt: '到期日期', note: '备注', activeVch: '启用（可兑换）',
            vchRoles: '适用对象', vchRolesAll: '所有用户',
            vchRolesHint: '留空表示所有人可用，或选择特定角色。',
            roleUser: '普通用户', roleVendorV: '商家', roleAffiliateV: '推广伙伴',
            oncePerUser: '每位用户限用一次', oncePerUserHint: '每位用户只能兑换此代码一次。',
            emptyVch: '暂无优惠码。', never: '—', free: '免费',
            confirmDeleteVch: (c: string) => `确定删除优惠码「${c}」？`,
            deleteSelected: '删除所选',
            confirmDeleteMany: (n: number) => `删除所选的 ${n} 条记录？此操作无法撤销。`,
            featureToggles: '平台功能', togglesSub: '开启或关闭功能，更改会立即保存。',
            t_allow_user_templates: '允许用户投稿设计',
            t_allow_user_templates_d: '开启后，任何用户都可提交请柬设计供审核。',
            t_payment_enabled_user: '为一般用户启用付款',
            t_payment_enabled_vendor: '为商家启用付款',
            t_payment_enabled_affiliate: '为联盟伙伴启用付款',
            t_payment_d: '允许此身份进行付费结账与订阅。',
            on: '开', offState: '关',
            matrixTitle: '各身份可用功能',
            matrixSub: '设置每种身份可使用的功能。管理员始终拥有全部权限。更改会立即保存并生效。',
            fRole: '身份', fUser: '一般用户', fVendor: '商家', fAffiliate: '联盟伙伴',
            f_seating: '桌位管理', f_seating_d: '创建餐桌、设置容量并安排宾客座位。',
            f_checkin: '签到', f_checkin_d: '标记宾客到场，并在婚礼当天扫描二维码。',
            f_qr_passes: '宾客二维码入场证', f_qr_passes_d: '为每位宾客生成二维码入场证。',
            f_company_branding: '公司品牌', f_company_branding_d: '在请柬上显示公司标志与名称。',
            f_designer: '自主设计', f_designer_d: '使用请柬设计工具的权限。',
            active: '启用', off: '停用', edit: '编辑', cancel: '取消', save: '保存', del: '删除',
            search: '搜索代码…',
        },
    }, lang);

    const [tab, setTab] = useState<TabKey>('umum');
    const [songs, setSongs] = useState<Song[]>([]);
    const [songDraft, setSongDraft] = useState<Song | null>(null);
    const [songUploading, setSongUploading] = useState(false);

    /* ---- data ---- */
    const [s, setS] = useState<Settings | null>(null);
    const [ppeCharges, setPpeCharges] = useState<PpeCharge[]>([]);
    const [cardFonts, setCardFonts] = useState<CardFont[]>([]); // count only — managed on /admin/fonts
    const [pkgs, setPkgs] = useState<Pkg[]>([]);
    const [vchs, setVchs] = useState<Vch[]>([]);

    const loadSettings = () => api.get<Settings & { pay_per_entry_charges?: PpeCharge[]; card_fonts?: CardFont[] }>('/admin/settings').then((r) => {
        setS(r.data);
        setPpeCharges(Array.isArray(r.data.pay_per_entry_charges) ? r.data.pay_per_entry_charges : []);
        setCardFonts(Array.isArray(r.data.card_fonts) ? r.data.card_fonts : []);
    });
    const loadPkgs = () => api.get<Pkg[]>('/admin/packages').then((r) => setPkgs(r.data));
    const loadVchs = () => api.get<Vch[]>('/admin/vouchers').then((r) => setVchs(r.data));

    async function loadSongs() {
        try { setSongs((await api.get<Song[]>('/admin/music-presets')).data); } catch { setSongs([]); }
    }
    // Must sit with the other hooks, ABOVE the `if (!s) return` below: a hook
    // after an early return runs on some renders and not others, which is
    // React error #310.
    useEffect(() => { loadSettings(); loadPkgs(); loadVchs(); void loadSongs(); }, []);

    /* ---- general (umum) ---- */
    const [savingGen, setSavingGen] = useState(false);
    const [savedGen, setSavedGen] = useState(false);
    function setField<K extends keyof Settings>(key: K, val: Settings[K]) {
        setS((prev) => (prev ? { ...prev, [key]: val } : prev));
        setSavedGen(false);
    }
    async function saveGeneral(e: React.FormEvent) {
        e.preventDefault();
        if (!s) return;
        setSavingGen(true);
        try {
            await api.put('/admin/settings', {
                site_name: s.site_name,
                support_email: s.support_email,
                currency: s.currency,
                // premium_price_myr is intentionally not sent: packages own
                // subscription pricing now. The backend still accepts the key so
                // older stored values stay readable, but nothing writes it.
                free_card_limit: Number(s.free_card_limit),
                max_upload_mb: num(s.max_upload_mb, 5),
                storage_quota_vendor_mb: num(s.storage_quota_vendor_mb, 100),
                storage_quota_affiliate_mb: num(s.storage_quota_affiliate_mb, 50),
                storage_quota_user_mb: num(s.storage_quota_user_mb, 50),
                free_guest_limit: Number(s.free_guest_limit),
                premium_guest_limit: Number(s.premium_guest_limit),
                receipt_company_name: String(s.receipt_company_name ?? ''),
                receipt_description: String(s.receipt_description ?? ''),
                receipt_phone: String(s.receipt_phone ?? ''),
                receipt_website: String(s.receipt_website ?? ''),
                receipt_email: String(s.receipt_email ?? ''),
                signup_flow: s.signup_flow === 'buy' ? 'buy' : 'trial',
                trial_view_limit: num(s.trial_view_limit, 5),
                card_edit_limit: num(s.card_edit_limit, 0),
            });
            setSavedGen(true);
            setTimeout(() => setSavedGen(false), 2500);
        } finally { setSavingGen(false); }
    }

    /* ---- toggles (ciri) ---- */
    const [togglingKey, setTogglingKey] = useState<string | null>(null);
    const isOn = (k: ToggleKey) => String(s?.[k] ?? 'false') === 'true';
    /**
     * Persist any boolean setting by key — used by the role x feature matrix,
     * whose keys are generated (feat_vendor_seating…) rather than enumerated.
     */
    async function setFlag(k: string, next: boolean) {
        setS((prev) => (prev ? { ...prev, [k]: next ? 'true' : 'false' } : prev));
        setTogglingKey(k);
        try { await api.put('/admin/settings', { [k]: next ? 'true' : 'false' }); }
        finally { setTogglingKey(null); }
    }

    async function setToggle(k: ToggleKey, next: boolean) {
        setS((prev) => (prev ? { ...prev, [k]: next ? 'true' : 'false' } : prev));
        setTogglingKey(k);
        try { await api.put('/admin/settings', { [k]: next ? 'true' : 'false' }); }
        finally { setTogglingKey(null); }
    }

    /** Persist a non-boolean scalar setting immediately (grace days…). */
    async function putValue(k: string, value: string | number) {
        setS((prev) => (prev ? { ...prev, [k]: value } : prev));
        setTogglingKey(k);
        try { await api.put('/admin/settings', { [k]: value }); }
        finally { setTogglingKey(null); }
    }

    // ---- pay-per-entry charge list editor (kept out of the scalar settings bag) ----
    async function saveCharges(next: PpeCharge[]) {
        setPpeCharges(next);
        setTogglingKey('pay_per_entry_charges');
        try { await api.put('/admin/settings', { pay_per_entry_charges: next }); }
        finally { setTogglingKey(null); }
    }
    /** Replace the whole list (add / remove / mode change) — persists at once. */
    const commitCharges = (next: PpeCharge[]) => void saveCharges(next);
    /** Local-only edit while typing a name/value; persisted on blur. */
    const editCharge = (i: number, patch: Partial<PpeCharge>) =>
        setPpeCharges((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
    const persistCharges = () => void saveCharges(ppeCharges);

    const cf = dict({
        bm: {
            title: 'Fon Kad',
            sub: 'Urus fon yang boleh dipilih hos untuk nama pada kad — fon terbina + fon Google tambahan.',
            count: (n: number) => (n ? `${n} fon tambahan` : 'Belum ada fon tambahan'),
            open: 'Buka Halaman Fon',
        },
        en: {
            title: 'Card Fonts',
            sub: 'Manage the fonts hosts can pick for the names on a card — the built-ins plus Google fonts you add.',
            count: (n: number) => (n ? `${n} custom font${n === 1 ? '' : 's'} added` : 'No custom fonts added yet'),
            open: 'Open Fonts Page',
        },
        zh: {
            title: '请柬字体',
            sub: '管理主持人可为请柬姓名选用的字体——内置字体加上您添加的 Google 字体。',
            count: (n: number) => (n ? `已添加 ${n} 个字体` : '暂无添加字体'),
            open: '打开字体页面',
        },
    }, lang);

    const ppe = dict({
        bm: {
            title: 'Bayaran Setiap Kehadiran (Vendor)',
            sub: 'Benarkan vendor mengecaj tetamu untuk sahkan kehadiran (majlis berbayar). Platform mengutip dahulu, menolak caj di bawah, dan membayar baki kepada vendor secara manual.',
            master: 'Aktifkan ciri untuk vendor', masterHint: 'Jika dimatikan, tiada vendor boleh mengecaj RSVP.',
            chargesTitle: 'Caj platform (ditolak daripada bayaran vendor)',
            chargesHint: 'Tambah seberapa banyak caj (komisen, yuran FPX, SST…). Perubahan hanya terpakai untuk bayaran akan datang.',
            cName: 'Nama caj', cMode: 'Jenis', percent: 'Peratus (%)', flat: 'RM tetap', cValue: 'Nilai',
            addCharge: 'Tambah caj', removeCharge: 'Buang',
            grace: 'Pas sah selepas majlis (hari)', graceHint: 'Kod QR luput selepas tarikh majlis + bilangan hari ini.',
            example: 'Contoh: tetamu bayar RM100 → tolak',
        },
        en: {
            title: 'Pay-Per-Entry RSVP (Vendors)',
            sub: 'Let vendors charge guests to confirm attendance (ticketed events). The platform collects first, deducts the charges below, and pays the balance to the vendor manually.',
            master: 'Enable feature for vendors', masterHint: 'When off, no vendor can charge for RSVP.',
            chargesTitle: 'Platform charges (deducted from the vendor’s payout)',
            chargesHint: 'Add as many charges as you like (commission, FPX fee, SST…). Changes apply to future payments only.',
            cName: 'Charge name', cMode: 'Type', percent: 'Percent (%)', flat: 'Flat RM', cValue: 'Value',
            addCharge: 'Add charge', removeCharge: 'Remove',
            grace: 'Pass valid after event (days)', graceHint: 'The QR pass expires after the event date + these days.',
            example: 'Example: guest pays RM100 → deduct',
        },
        zh: {
            title: '按人收费 RSVP（供应商）',
            sub: '允许供应商向宾客收取出席费用（售票活动）。平台先收款，扣除下方费用，再手动将余额结算给供应商。',
            master: '为供应商启用此功能', masterHint: '关闭后，任何供应商都无法收取 RSVP 费用。',
            chargesTitle: '平台费用（从供应商结算中扣除）',
            chargesHint: '可添加任意数量的费用（佣金、FPX 手续费、SST…）。更改仅适用于之后的付款。',
            cName: '费用名称', cMode: '类型', percent: '百分比（%）', flat: '固定 RM', cValue: '数值',
            addCharge: '添加费用', removeCharge: '移除',
            grace: '活动后凭证有效期（天）', graceHint: '二维码凭证在活动日期 + 此天数后过期。',
            example: '示例：宾客支付 RM100 → 扣除',
        },
    }, lang);

    /* ---- packages (pakej) ---- */
    const [editingPkg, setEditingPkg] = useState<Pkg | null>(null);
    const [savingPkg, setSavingPkg] = useState(false);

    function openPkg(p: Pkg | null) {
        setEditingPkg(p ? { ...p, features: p.features ?? [] } : { ...BLANK_PKG });
    }
    // A feature counts as chosen if either its BM or EN label is already listed.
    function featureChosen(o: FeatureOption): boolean {
        return !!editingPkg && (editingPkg.features.includes(o.bm) || editingPkg.features.includes(o.en));
    }
    function addFeatureLabel(label: string) {
        if (!label || !editingPkg || editingPkg.features.includes(label)) return;
        setEditingPkg({ ...editingPkg, features: [...editingPkg.features, label] });
    }
    function removeFeature(i: number) {
        if (!editingPkg) return;
        setEditingPkg({ ...editingPkg, features: editingPkg.features.filter((_, idx) => idx !== i) });
    }
    async function savePkg(e: React.FormEvent) {
        e.preventDefault();
        if (!editingPkg) return;
        setSavingPkg(true);
        try {
            const payload = { ...editingPkg, price_myr: Number(editingPkg.price_myr), sort: Number(editingPkg.sort) };
            if (editingPkg.id) await api.put(`/admin/packages/${editingPkg.id}`, payload);
            else await api.post('/admin/packages', payload);
            setEditingPkg(null);
            loadPkgs();
        } finally { setSavingPkg(false); }
    }
    async function togglePkgActive(p: Pkg, next: boolean) {
        if (!p.id) return;
        setPkgs((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)));
        await api.put(`/admin/packages/${p.id}`, { ...p, is_active: next, price_myr: Number(p.price_myr), sort: Number(p.sort) });
        loadPkgs();
    }
    async function removePkg(p: Pkg) {
        if (!p.id) return;
        if (!(await dialog.confirm({ message: C.confirmDeletePkg(p.name), danger: true }))) return;
        await api.delete(`/admin/packages/${p.id}`);
        loadPkgs();
    }

    /* ---- vouchers (baucar) ---- */
    const [editingVch, setEditingVch] = useState<Vch | null>(null);
    const [savingVch, setSavingVch] = useState(false);

    function openVch(v: Vch | null) {
        setEditingVch(v
            ? { ...v, max_uses: v.max_uses ?? '', expires_at: v.expires_at ? v.expires_at.slice(0, 16) : '' }
            : { ...BLANK_VCH });
    }
    async function saveVch(e: React.FormEvent) {
        e.preventDefault();
        if (!editingVch) return;
        setSavingVch(true);
        try {
            const payload = {
                code: editingVch.code.trim(),
                kind: editingVch.kind,
                value: editingVch.kind === 'full' ? 0 : Number(editingVch.value),
                max_uses: editingVch.max_uses === '' || editingVch.max_uses === null ? null : Number(editingVch.max_uses),
                expires_at: editingVch.expires_at ? editingVch.expires_at : null,
                is_active: editingVch.is_active,
                once_per_user: !!editingVch.once_per_user,
                note: editingVch.note ?? '',
            };
            if (editingVch.id) await api.put(`/admin/vouchers/${editingVch.id}`, payload);
            else await api.post('/admin/vouchers', payload);
            setEditingVch(null);
            loadVchs();
        } finally { setSavingVch(false); }
    }
    async function removeVch(v: Vch) {
        if (!v.id) return;
        if (!(await dialog.confirm({ message: C.confirmDeleteVch(v.code), danger: true }))) return;
        await api.delete(`/admin/vouchers/${v.id}`);
        setEditingVch(null);
        loadVchs();
    }

    if (!s) return <div className="loading-screen"><div className="spinner" /></div>;

    /* --------------------------- labels --------------------------- */
    const roleLabel = (r: Pkg['role_target']) => (r === 'vendor' ? C.roleVendor : r === 'affiliate' ? C.roleAffiliate : r === 'user' ? C.roleUser : C.roleAny);
    const roleBadge = (r: Pkg['role_target']) => (r === 'vendor' ? 'badge badge-gold' : r === 'affiliate' ? 'badge badge-ok' : 'badge');
    const intervalLabel = (i: Pkg['interval']) => (i === 'yearly' ? C.perYear : i === 'once' ? C.oneOff : C.perMonth);
    const kindLabel = (k: Vch['kind']) => (k === 'full' ? C.kindFull : k === 'percent' ? C.kindPercent : C.kindAmount);
    const valueLabel = (v: Vch) => (v.kind === 'full' ? C.free : v.kind === 'percent' ? `${Number(v.value)}%` : `RM${Number(v.value)}`);
    const fmtDate = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : C.never;

    async function saveSong(e: React.FormEvent) {
        e.preventDefault();
        if (!songDraft) return;
        const body = { ...songDraft, artist: songDraft.artist || null };
        if (songDraft.id) await api.put(`/admin/music-presets/${songDraft.id}`, body);
        else await api.post('/admin/music-presets', body);
        setSongDraft(null);
        await loadSongs();
    }

    async function deleteSong(m: Song) {
        if (!m.id) return;
        if (!(await dialog.confirm({ message: C.confirmDeleteSong(m.title), danger: true }))) return;
        await api.delete(`/admin/music-presets/${m.id}`);
        setSongDraft(null);
        await loadSongs();
    }

    const songCols: Column<Song>[] = [
        { key: 'title', label: C.songTitle, sortable: true, sortValue: (m) => m.title, render: (m) => <strong>{m.title}</strong> },
        { key: 'artist', label: C.songArtist, sortable: true, sortValue: (m) => m.artist ?? '', render: (m) => m.artist || '—' },
        {
            key: 'url', label: C.songUrl,
            render: (m) => (
                <span style={{ display: 'inline-block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
                    {m.url}
                </span>
            ),
        },
        {
            key: 'is_active', label: C.status, align: 'right',
            sortable: true, sortValue: (m) => (m.is_active ? 1 : 0),
            render: (m) => (m.is_active ? <span className="badge badge-ok">{C.on}</span> : <span className="badge">{C.offState}</span>),
        },
    ];

    /** Shared bulk delete for the admin tables — one confirmation, then N calls. */
    async function bulkDelete(ids: string[], base: string, reload: () => Promise<unknown> | void, clear: () => void) {
        if (ids.length === 0) return;
        if (!(await dialog.confirm({ message: C.confirmDeleteMany(ids.length), danger: true }))) return;
        await Promise.all(ids.map((id) => api.delete(`${base}/${id}`)));
        clear();
        await reload();
    }

    const TABS: { key: TabKey; icon: LucideIcon; label: string }[] = [
        { key: 'umum', icon: SlidersHorizontal, label: C.tabUmum },
        { key: 'pakej', icon: PackageIcon, label: C.tabPakej },
        { key: 'muzik', icon: Music, label: C.tabMuzik },
        { key: 'ciri', icon: ToggleRight, label: C.tabCiri },
        { key: 'medan', icon: ListChecks, label: C.tabMedan },
    ];

    const vchCols: Column<Vch>[] = [
        { key: 'code', label: C.code, sortable: true, sortValue: (v) => v.code, render: (v) => <code>{v.code}</code> },
        { key: 'kind', label: C.kind, sortable: true, sortValue: (v) => v.kind, render: (v) => <span className="badge">{kindLabel(v.kind)}</span> },
        { key: 'value', label: C.value, align: 'right', sortable: true, sortValue: (v) => Number(v.value), render: (v) => valueLabel(v) },
        { key: 'uses', label: C.uses, align: 'right', sortValue: (v) => v.used_count ?? 0, render: (v) => `${v.used_count ?? 0} / ${v.max_uses ?? '∞'}` },
        { key: 'expiry', label: C.expiry, sortable: true, sortValue: (v) => v.expires_at ?? '', render: (v) => fmtDate(v.expires_at) },
        {
            key: 'status', label: C.status, sortValue: (v) => (v.is_active ? 1 : 0),
            render: (v) => (v.is_active ? <span className="badge badge-ok">{C.active}</span> : <span className="badge badge-bad">{C.off}</span>),
        },
    ];

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {/* tab bar */}
            <div className="row wrap" style={{ gap: 8, marginBottom: 22 }}>
                {TABS.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button key={t.key} type="button" className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.key)}>
                            <Icon size={15} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ---------------- UMUM ---------------- */}
            {tab === 'umum' && (
                <form onSubmit={saveGeneral}>
                    <div className="panel" style={{ maxWidth: 560, margin: '0 auto' }}>
                        <div className="row" style={{ marginBottom: 14 }}>
                            <div style={sectionIcon}><SlidersHorizontal size={16} /></div>
                            <h3 style={{ margin: 0 }}>{C.general}</h3>
                        </div>
                        <div className="field"><label>{C.siteName}</label><input value={s.site_name} onChange={(e) => setField('site_name', e.target.value)} /></div>
                        <div className="field"><label>{C.supportEmail}</label><input type="email" value={s.support_email} onChange={(e) => setField('support_email', e.target.value)} /></div>
                        <div className="field" style={{ marginBottom: 0 }}><label>{C.currency}</label><input value={s.currency} onChange={(e) => setField('currency', e.target.value)} maxLength={6} /></div>
                    </div>

                    {/* Receipt / business identity — printed on every receipt & invoice. */}
                    <div className="panel" style={{ maxWidth: 560, margin: '18px auto 0' }}>
                        <div className="row" style={{ marginBottom: 6 }}>
                            <div style={sectionIcon}><ReceiptText size={16} /></div>
                            <div>
                                <h3 style={{ margin: 0 }}>{C.receiptIdentity}</h3>
                                <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{C.receiptHint}</p>
                            </div>
                        </div>
                        <div className="field" style={{ marginTop: 12 }}><label>{C.rcCompany}</label><input value={String(s.receipt_company_name ?? '')} onChange={(e) => setField('receipt_company_name', e.target.value)} /></div>
                        <div className="field"><label>{C.rcDescription}</label><input value={String(s.receipt_description ?? '')} onChange={(e) => setField('receipt_description', e.target.value)} /></div>
                        <div className="field"><label>{C.rcPhone}</label><input value={String(s.receipt_phone ?? '')} onChange={(e) => setField('receipt_phone', e.target.value)} /></div>
                        <div className="field"><label>{C.rcWebsite}</label><input value={String(s.receipt_website ?? '')} onChange={(e) => setField('receipt_website', e.target.value)} /></div>
                        <div className="field" style={{ marginBottom: 0 }}><label>{C.rcEmail}</label><input value={String(s.receipt_email ?? '')} onChange={(e) => setField('receipt_email', e.target.value)} /></div>
                    </div>

                    {/* Trial & purchase flow — how normal users get to a live card. */}
                    <div className="panel" style={{ maxWidth: 560, margin: '18px auto 0' }}>
                        <div className="row" style={{ marginBottom: 6 }}>
                            <div style={sectionIcon}><SlidersHorizontal size={16} /></div>
                            <div>
                                <h3 style={{ margin: 0 }}>{C.flowTitle}</h3>
                                <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{C.flowHint}</p>
                            </div>
                        </div>
                        <div className="field" style={{ marginTop: 12 }}>
                            <label>{C.flowMode}</label>
                            <select value={s.signup_flow === 'buy' ? 'buy' : 'trial'} onChange={(e) => setField('signup_flow', e.target.value)}>
                                <option value="trial">{C.flowTrial}</option>
                                <option value="buy">{C.flowBuy}</option>
                            </select>
                        </div>
                        <div className="field"><label>{C.trialViewLimit}</label><NumberInput min={0} value={String(s.trial_view_limit ?? 5)} onChange={(t) => setField('trial_view_limit', t)} /><small className="muted">{C.zeroUnlimited}</small></div>
                        <div className="field" style={{ marginBottom: 0 }}><label>{C.cardEditLimit}</label><NumberInput min={0} value={String(s.card_edit_limit ?? 0)} onChange={(t) => setField('card_edit_limit', t)} /><small className="muted">{C.zeroUnlimited}</small></div>
                    </div>

                    <div className="row" style={{ marginTop: 20 }}>
                        <button className="btn btn-primary" disabled={savingGen}>
                            {savedGen ? <><Check size={16} /> {C.saved}</> : <><Save size={16} /> {savingGen ? C.saving : C.saveSettings}</>}
                        </button>
                        {savedGen && <span className="muted" style={{ fontSize: 13 }}>{C.changesSaved}</span>}
                    </div>
                </form>
            )}

            {/* ---------------- PAKEJ ---------------- */}
            {tab === 'pakej' && (
                <div>
                    {/* Account limits only. Subscription PRICING lives in the package
                        list below — one price per package, per role. The old
                        platform-wide "premium price" field was removed: it predates
                        packages and having both invited the question of which one wins.
                        (Answer: packages. Nothing reads the old setting any more.) */}
                    <form onSubmit={saveGeneral} className="panel" style={{ maxWidth: 560, margin: '0 auto 22px' }}>
                        <div className="row" style={{ marginBottom: 6 }}>
                            <div style={sectionIcon}><PackageIcon size={16} /></div>
                            <h3 style={{ margin: 0 }}>{C.limitsTitle}</h3>
                        </div>
                        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '0 0 14px' }}>
                            {C.limitsHint}
                        </p>
                        <div className="field"><label>{C.freeCardLimit}</label><NumberInput min={0} value={String(s.free_card_limit ?? '')} onChange={(t) => setField('free_card_limit', t)} /></div>
                        <div className="field"><label>{C.freeGuestLimit}</label><NumberInput min={0} value={String(s.free_guest_limit ?? '')} onChange={(t) => setField('free_guest_limit', t)} /></div>
                        <div className="field"><label>{C.premiumGuestLimit}</label><NumberInput min={0} value={String(s.premium_guest_limit ?? '')} onChange={(t) => setField('premium_guest_limit', t)} /><small className="muted">{C.unlimitedHint}</small></div>

                        <h4 style={{ margin: '18px 0 2px', fontSize: 15 }}>{C.uploadTitle}</h4>
                        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '0 0 12px' }}>{C.uploadHint}</p>
                        <div className="field"><label>{C.maxUpload}</label><NumberInput min={1} max={100} value={String(s.max_upload_mb ?? 5)} onChange={(t) => setField('max_upload_mb', t)} /></div>
                        <div className="field"><label>{C.quotaVendor}</label><NumberInput min={1} value={String(s.storage_quota_vendor_mb ?? 100)} onChange={(t) => setField('storage_quota_vendor_mb', t)} /></div>
                        <div className="field"><label>{C.quotaAffiliate}</label><NumberInput min={1} value={String(s.storage_quota_affiliate_mb ?? 50)} onChange={(t) => setField('storage_quota_affiliate_mb', t)} /></div>
                        <div className="field"><label>{C.quotaUser}</label><NumberInput min={1} value={String(s.storage_quota_user_mb ?? 50)} onChange={(t) => setField('storage_quota_user_mb', t)} /></div>
                        <div className="row" style={{ marginTop: 4 }}>
                            <button className="btn btn-primary btn-sm" disabled={savingGen}>
                                {savedGen ? <><Check size={15} /> {C.saved}</> : <><Save size={15} /> {savingGen ? C.saving : C.saveSettings}</>}
                            </button>
                        </div>
                    </form>

                    <div className="spread" style={{ marginBottom: 18 }}>
                        <p className="muted" style={{ margin: 0 }}>{pkgs.length} {C.tabPakej.toLowerCase()}</p>
                        <button className="btn btn-primary" onClick={() => openPkg(null)}><Plus size={16} /> {C.addPackage}</button>
                    </div>

                    {pkgs.length === 0 ? (
                        <div className="panel center muted" style={{ padding: 40 }}>{C.emptyPkg}</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', maxWidth: 1100, margin: '0 auto' }}>
                            {pkgs.map((p) => (
                                <div className="panel" key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="spread" style={{ alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 6px', fontSize: 20 }}>{p.name}</h3>
                                            <span className={roleBadge(p.role_target)}>{roleLabel(p.role_target)}</span>
                                        </div>
                                        <Switch on={p.is_active} onChange={(v) => togglePkgActive(p, v)} />
                                    </div>

                                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--plum)' }}>
                                        RM{Number(p.price_myr)}<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}> {intervalLabel(p.interval)}</span>
                                    </div>

                                    {(p.features ?? []).length > 0 && (
                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {(p.features ?? []).map((f, i) => (
                                                <li key={i} className="row" style={{ gap: 8, fontSize: 13.5, alignItems: 'flex-start' }}>
                                                    <Check size={15} style={{ color: 'var(--ok)', flexShrink: 0, marginTop: 2 }} /> <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className="row" style={{ marginTop: 'auto' }}>
                                        <button className="btn btn-ghost btn-sm grow" onClick={() => openPkg(p)}><Pencil size={14} /> {C.edit}</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => removePkg(p)} style={{ color: 'var(--bad)' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Vouchers share this tab — all monetisation (plans + discounts) in one place. */}
                    <div className="row" style={{ gap: 10, margin: '34px 0 16px', maxWidth: 1100, marginInline: 'auto' }}>
                        <div style={sectionIcon}><Ticket size={16} /></div>
                        <h3 style={{ margin: 0 }}>{C.tabBaucar}</h3>
                    </div>
                    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                        <DataTable
                            columns={vchCols}
                            rows={vchs}
                            searchKeys={['code', 'note']}
                            pageSize={10}
                            exportName="baucar"
                            onRowClick={(v) => openVch(v)}
                            empty={C.emptyVch}
                            rowId={(v) => v.id!}
                            bulkActions={(sel, clear) => (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: 'var(--bad)' }}
                                    onClick={() => void bulkDelete(sel.map((v) => v.id!), '/admin/vouchers', loadVchs, clear)}
                                >
                                    <Trash2 size={14} /> {C.deleteSelected}
                                </button>
                            )}
                            toolbar={<button className="btn btn-primary btn-sm" onClick={() => openVch(null)}><Plus size={15} /> {C.addVoucher}</button>}
                        />
                    </div>
                </div>
            )}

            {/* ---------------- MUZIK ---------------- */}
            {tab === 'muzik' && (
                <DataTable
                    columns={songCols}
                    rows={songs}
                    searchKeys={['title', 'artist']}
                    pageSize={10}
                    exportName="muzik"
                    onRowClick={(m) => setSongDraft({ ...m })}
                    empty={C.emptySong}
                    rowId={(m) => m.id!}
                    bulkActions={(sel, clear) => (
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--bad)' }}
                            onClick={() => void bulkDelete(sel.map((m) => m.id!), '/admin/music-presets', loadSongs, clear)}
                        >
                            <Trash2 size={14} /> {C.deleteSelected}
                        </button>
                    )}
                    toolbar={<button className="btn btn-primary btn-sm" onClick={() => setSongDraft({ ...BLANK_SONG })}><Plus size={15} /> {C.addSong}</button>}
                />
            )}

            <Drawer
                open={!!songDraft}
                onClose={() => setSongDraft(null)}
                title={songDraft?.id ? C.drawerSongEdit : C.drawerSongAdd}
                width={480}
                footer={songDraft ? (
                    <>
                        {songDraft.id && (
                            <button type="button" className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => void deleteSong(songDraft)}>
                                <Trash2 size={15} />
                            </button>
                        )}
                        <button type="button" className="btn btn-ghost grow" onClick={() => setSongDraft(null)}>{C.cancel}</button>
                        <button type="submit" form="song-form" className="btn btn-primary grow">{C.save}</button>
                    </>
                ) : undefined}
            >
                {songDraft && (
                    <form id="song-form" onSubmit={saveSong}>
                        <div className="field">
                            <label>{C.songTitle}</label>
                            <input value={songDraft.title} onChange={(e) => setSongDraft({ ...songDraft, title: e.target.value })} required autoFocus />
                        </div>
                        <div className="field">
                            <label>{C.songArtist}</label>
                            <input value={songDraft.artist ?? ''} onChange={(e) => setSongDraft({ ...songDraft, artist: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>{C.songUrl}</label>
                            <input value={songDraft.url} onChange={(e) => setSongDraft({ ...songDraft, url: e.target.value })} required placeholder="https://youtube.com/watch?v=..." />
                            <label className="btn btn-ghost btn-sm" style={{ marginTop: 8, cursor: songUploading ? 'default' : 'pointer' }}>
                                <Music size={15} /> {songUploading ? C.uploading : C.uploadMp3}
                                <input
                                    type="file"
                                    accept="audio/*"
                                    hidden
                                    disabled={songUploading}
                                    onChange={async (e) => {
                                        const f = e.target.files?.[0];
                                        e.target.value = '';
                                        if (!f) return;
                                        setSongUploading(true);
                                        try {
                                            const fd = new FormData();
                                            fd.append('file', f);
                                            const r = await api.post<{ url: string }>('/admin/music-presets/upload', fd);
                                            // Name the track from the filename when the admin has not typed one yet.
                                            setSongDraft((d) => d && ({ ...d, url: r.data.url, title: d.title || f.name.replace(/\.[^.]+$/, '') }));
                                        } finally {
                                            setSongUploading(false);
                                        }
                                    }}
                                />
                            </label>
                            <small className="muted" style={{ display: 'block', marginTop: 6 }}>{C.songUrlHint}</small>
                        </div>
                        {songDraft.url && !youtubeId(songDraft.url) && (
                            <div className="field">
                                <label>{C.trimLabel}</label>
                                <MusicTrimmer
                                    key={songDraft.url}
                                    url={songDraft.url}
                                    start={songDraft.start_sec}
                                    end={songDraft.end_sec}
                                    onChange={(v) => setSongDraft((d) => d && ({ ...d, start_sec: v.start, end_sec: v.end, duration_sec: Math.max(0, v.end - v.start) }))}
                                />
                            </div>
                        )}
                        {songDraft.url && youtubeId(songDraft.url) && (
                            <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 14px', lineHeight: 1.5 }}>{C.ytFull}</p>
                        )}
                        <div className="field">
                            <label>{C.sort}</label>
                            <NumberInput min={0} value={songDraft.sort} onChange={(t) => setSongDraft({ ...songDraft, sort: t === '' ? 0 : Number(t) })} />
                        </div>
                        <label className="row" style={{ fontSize: 14 }}>
                            <input type="checkbox" checked={songDraft.is_active} onChange={(e) => setSongDraft({ ...songDraft, is_active: e.target.checked })} />
                            {C.activeSong}
                        </label>
                    </form>
                )}
            </Drawer>

            {/* ---------------- CIRI ---------------- */}
            {tab === 'ciri' && (
                <div className="panel" style={{ maxWidth: 900, margin: '0 auto 20px', overflowX: 'auto' }}>
                    <div className="row" style={{ marginBottom: 6 }}>
                        <div style={sectionIcon}><ToggleRight size={16} /></div>
                        <h3 style={{ margin: 0 }}>{C.matrixTitle}</h3>
                    </div>
                    <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '0 0 14px' }}>{C.matrixSub}</p>

                    <table className="table" style={{ minWidth: 520 }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>{C.fRole}</th>
                                <th style={{ textAlign: 'center' }}>{C.fUser}</th>
                                <th style={{ textAlign: 'center' }}>{C.fVendor}</th>
                                <th style={{ textAlign: 'center' }}>{C.fAffiliate}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {FEATURES.map((f) => (
                                <tr key={f}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{C[`f_${f}` as keyof typeof C] as string}</div>
                                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                                            {C[`f_${f}_d` as keyof typeof C] as string}
                                        </div>
                                    </td>
                                    {FEATURE_ROLES.map((role) => {
                                        const key = featureKey(role, f);
                                        const on = String(s?.[key] ?? 'false') === 'true';
                                        return (
                                            <td key={role} style={{ textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={on}
                                                    onChange={() => void setFlag(key, !on)}
                                                    aria-label={`${C[`f_${f}` as keyof typeof C] as string} — ${role}`}
                                                    style={{ width: 17, height: 17, cursor: 'pointer' }}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'ciri' && (
                <div className="panel" style={{ maxWidth: 900, margin: '0 auto' }}>
                    <div className="row" style={{ marginBottom: 4 }}>
                        <div style={sectionIcon}><ToggleRight size={16} /></div>
                        <div>
                            <h3 style={{ margin: 0 }}>{C.featureToggles}</h3>
                            <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{C.togglesSub}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
                        <ToggleRow
                            title={C.t_allow_user_templates} desc={C.t_allow_user_templates_d}
                            on={isOn('allow_user_templates')} busy={togglingKey === 'allow_user_templates'}
                            onChange={(v) => setToggle('allow_user_templates', v)} onLabel={C.on} offLabel={C.offState}
                        />
                        <ToggleRow
                            title={C.t_payment_enabled_user} desc={C.t_payment_d}
                            on={isOn('payment_enabled_user')} busy={togglingKey === 'payment_enabled_user'}
                            onChange={(v) => setToggle('payment_enabled_user', v)} onLabel={C.on} offLabel={C.offState}
                        />
                        <ToggleRow
                            title={C.t_payment_enabled_vendor} desc={C.t_payment_d}
                            on={isOn('payment_enabled_vendor')} busy={togglingKey === 'payment_enabled_vendor'}
                            onChange={(v) => setToggle('payment_enabled_vendor', v)} onLabel={C.on} offLabel={C.offState}
                        />
                        <ToggleRow
                            title={C.t_payment_enabled_affiliate} desc={C.t_payment_d}
                            on={isOn('payment_enabled_affiliate')} busy={togglingKey === 'payment_enabled_affiliate'}
                            onChange={(v) => setToggle('payment_enabled_affiliate', v)} onLabel={C.on} offLabel={C.offState} last
                        />
                    </div>
                </div>
            )}

            {/* ---------------- PAY-PER-ENTRY (vendor ticketed events) ---------------- */}
            {tab === 'ciri' && (
                <div className="panel" style={{ maxWidth: 900, margin: '18px auto 0' }}>
                    <div className="row" style={{ marginBottom: 4 }}>
                        <div style={sectionIcon}><ReceiptText size={16} /></div>
                        <div>
                            <h3 style={{ margin: 0 }}>{ppe.title}</h3>
                            <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{ppe.sub}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
                        <ToggleRow
                            title={ppe.master} desc={ppe.masterHint}
                            on={String(s?.pay_per_entry_enabled ?? 'false') === 'true'} busy={togglingKey === 'pay_per_entry_enabled'}
                            onChange={(v) => setFlag('pay_per_entry_enabled', v)} onLabel={C.on} offLabel={C.offState} last
                        />
                    </div>

                    {String(s?.pay_per_entry_enabled ?? 'false') === 'true' && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--plum)' }}>{ppe.chargesTitle}</div>
                            <p className="muted" style={{ margin: '4px 0 12px', fontSize: 12.5, lineHeight: 1.5 }}>{ppe.chargesHint}</p>

                            <div style={{ display: 'grid', gap: 8 }}>
                                {ppeCharges.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input
                                            style={{ ...ppeInp, flex: '2 1 160px' }} placeholder={ppe.cName} value={String(c.name ?? '')}
                                            onChange={(e) => editCharge(i, { name: e.target.value })} onBlur={persistCharges}
                                        />
                                        <select
                                            style={{ ...ppeInp, flex: '1 1 130px' }} value={c.mode === 'flat' ? 'flat' : 'percent'}
                                            onChange={(e) => commitCharges(ppeCharges.map((x, j) => (j === i ? { ...x, mode: e.target.value as 'percent' | 'flat' } : x)))}
                                        >
                                            <option value="percent">{ppe.percent}</option>
                                            <option value="flat">{ppe.flat}</option>
                                        </select>
                                        <NumberInput
                                            decimals min={0} step="0.01" style={{ ...ppeInp, width: 100 }} value={c.value ?? ''}
                                            onChange={(t) => editCharge(i, { value: t })} onBlur={persistCharges}
                                        />
                                        <button
                                            type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }}
                                            onClick={() => commitCharges(ppeCharges.filter((_, j) => j !== i))} aria-label={ppe.removeCharge}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
                                onClick={() => commitCharges([...ppeCharges, { name: '', mode: 'percent', value: 0 }])}
                            >
                                <Plus size={14} /> {ppe.addCharge}
                            </button>

                            <div className="field" style={{ margin: '18px 0 0', maxWidth: 280 }}>
                                <label>{ppe.grace}</label>
                                <NumberInput
                                    min={0} max={365} value={String(s?.pay_per_entry_grace_days ?? 3)}
                                    onChange={(t) => setField('pay_per_entry_grace_days', t)}
                                    onBlur={(e) => void putValue('pay_per_entry_grace_days', Number(e.target.value))}
                                />
                                <small className="muted">{ppe.graceHint}</small>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ---------------- CARD FONTS (managed on its own page) ---------------- */}
            {tab === 'ciri' && (
                <div className="panel" style={{ maxWidth: 900, margin: '18px auto 0' }}>
                    <div className="spread" style={{ alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div className="row" style={{ alignItems: 'flex-start' }}>
                            <div style={sectionIcon}><Type size={16} /></div>
                            <div>
                                <h3 style={{ margin: 0 }}>{cf.title}</h3>
                                <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{cf.sub}</p>
                                <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5 }}>{cf.count(cardFonts.length)}</p>
                            </div>
                        </div>
                        <Link to="/admin/fonts" className="btn btn-primary btn-sm">
                            <Type size={15} /> {cf.open}
                        </Link>
                    </div>
                </div>
            )}

            {/* ---------------- MEDAN PROFIL (profile & receipt fields) ---------------- */}
            {tab === 'medan' && (
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <div className="panel" style={{ marginBottom: 18 }}>
                        <div className="row" style={{ marginBottom: 6 }}>
                            <div style={sectionIcon}><ReceiptText size={16} /></div>
                            <h3 style={{ margin: 0 }}>{C.medanTitle}</h3>
                        </div>
                        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '0 0 2px' }}>{C.medanSub}</p>
                        <ToggleRow
                            title={C.medanBrandTitle} desc={C.medanBrandHint}
                            on={String(s?.allow_seller_receipt_branding ?? 'true') === 'true'} busy={togglingKey === 'allow_seller_receipt_branding'}
                            onChange={(v) => setFlag('allow_seller_receipt_branding', v)} onLabel={C.on} offLabel={C.offState} last
                        />
                    </div>

                    <Link to="/admin/profile-fields" className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit' }}>
                        <div style={sectionIcon}><ListChecks size={16} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{C.medanEditorTitle}</div>
                            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 2 }}>{C.medanEditorSub}</div>
                        </div>
                        <span className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>{C.medanOpen} <ArrowRight size={15} /></span>
                    </Link>
                </div>
            )}

            {/* ---------------- PACKAGE DRAWER ---------------- */}
            <Drawer
                open={!!editingPkg}
                onClose={() => setEditingPkg(null)}
                title={editingPkg?.id ? C.drawerPkgEdit : C.drawerPkgAdd}
                width={520}
                footer={editingPkg ? (
                    <>
                        <button type="button" className="btn btn-ghost" onClick={() => setEditingPkg(null)}>{C.cancel}</button>
                        <button type="submit" form="pkg-form" className="btn btn-primary" disabled={savingPkg}>{savingPkg ? C.saving : C.save}</button>
                    </>
                ) : undefined}
            >
                {editingPkg && (
                    <form id="pkg-form" onSubmit={savePkg} className="stack" style={{ gap: 0 }}>
                        <div className="field"><label>{C.pkgName}</label><input value={editingPkg.name} onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })} required /></div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 150 }}>
                                <label>{C.roleTarget}</label>
                                <select value={editingPkg.role_target} onChange={(e) => setEditingPkg({ ...editingPkg, role_target: e.target.value as Pkg['role_target'] })}>
                                    <option value="any">{C.roleAny}</option>
                                    <option value="user">{C.roleUser}</option>
                                    <option value="vendor">{C.roleVendor}</option>
                                    <option value="affiliate">{C.roleAffiliate}</option>
                                </select>
                            </div>
                            <div className="field" style={{ width: 120 }}>
                                <label>{C.sort}</label>
                                <NumberInput value={editingPkg.sort} onChange={(t) => setEditingPkg({ ...editingPkg, sort: t === '' ? 0 : Number(t) })} />
                            </div>
                        </div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 130 }}>
                                <label>{C.price}</label>
                                <NumberInput decimals min={0} step="0.01" value={editingPkg.price_myr} onChange={(t) => setEditingPkg({ ...editingPkg, price_myr: t })} />
                            </div>
                            <div className="field grow" style={{ minWidth: 130 }}>
                                <label>{C.interval}</label>
                                <select value={editingPkg.interval} onChange={(e) => setEditingPkg({ ...editingPkg, interval: e.target.value as Pkg['interval'] })}>
                                    <option value="monthly">{C.intMonthly}</option>
                                    <option value="yearly">{C.intYearly}</option>
                                    <option value="once">{C.intOnce}</option>
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label>{C.features}</label>
                            <select
                                value=""
                                onChange={(e) => { addFeatureLabel(e.target.value); e.currentTarget.value = ''; }}
                            >
                                <option value="" disabled>{C.addFeature}</option>
                                {FEATURE_OPTIONS.map((o) => {
                                    const label = lang === 'bm' ? o.bm : o.en;
                                    const chosen = featureChosen(o);
                                    return <option key={o.en} value={label} disabled={chosen}>{chosen ? '✓ ' : ''}{label}</option>;
                                })}
                            </select>
                            <small className="muted" style={{ marginTop: 6, display: 'block' }}>{C.featureHint}</small>
                            {editingPkg.features.length === 0 ? (
                                <small className="muted" style={{ marginTop: 6 }}>{C.noFeatures}</small>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                    {editingPkg.features.map((f, i) => (
                                        <div key={i} className="spread" style={{ background: 'var(--cream)', borderRadius: 9, padding: '7px 10px 7px 12px', fontSize: 13.5 }}>
                                            <span className="row" style={{ gap: 8 }}><Check size={14} style={{ color: 'var(--ok)' }} /> {f}</span>
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeFeature(i)} style={{ color: 'var(--bad)', padding: 4 }} aria-label={C.del}><Trash2 size={13} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <label className="row" style={{ fontSize: 14, marginTop: 4, cursor: 'pointer', gap: 10 }}>
                            <Switch on={editingPkg.is_active} onChange={(v) => setEditingPkg({ ...editingPkg, is_active: v })} />
                            {C.activePkg}
                        </label>
                    </form>
                )}
            </Drawer>

            {/* ---------------- VOUCHER DRAWER ---------------- */}
            <Drawer
                open={!!editingVch}
                onClose={() => setEditingVch(null)}
                title={editingVch?.id ? C.drawerVchEdit : C.drawerVchAdd}
                width={480}
                footer={editingVch ? (
                    <>
                        {editingVch.id && <button type="button" className="btn btn-ghost" onClick={() => removeVch(editingVch)} style={{ color: 'var(--bad)', marginRight: 'auto' }}><Trash2 size={15} /> {C.del}</button>}
                        <button type="button" className="btn btn-ghost" onClick={() => setEditingVch(null)}>{C.cancel}</button>
                        <button type="submit" form="vch-form" className="btn btn-primary" disabled={savingVch}>{savingVch ? C.saving : C.save}</button>
                    </>
                ) : undefined}
            >
                {editingVch && (
                    <form id="vch-form" onSubmit={saveVch} className="stack" style={{ gap: 0 }}>
                        <div className="field">
                            <label>{C.code}</label>
                            <input value={editingVch.code} onChange={(e) => setEditingVch({ ...editingVch, code: e.target.value.toUpperCase() })} required style={{ textTransform: 'uppercase' }} />
                        </div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 150 }}>
                                <label>{C.kind}</label>
                                <select value={editingVch.kind} onChange={(e) => setEditingVch({ ...editingVch, kind: e.target.value as Vch['kind'] })}>
                                    <option value="full">{C.kindFull}</option>
                                    <option value="percent">{C.kindPercent}</option>
                                    <option value="amount">{C.kindAmount}</option>
                                </select>
                            </div>
                            {editingVch.kind !== 'full' && (
                                <div className="field grow" style={{ minWidth: 120 }}>
                                    <label>{editingVch.kind === 'percent' ? '%' : 'RM'}</label>
                                    <NumberInput decimals min={0} step="0.01" value={editingVch.value} onChange={(t) => setEditingVch({ ...editingVch, value: t })} />
                                </div>
                            )}
                        </div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 130 }}>
                                <label>{C.maxUses}</label>
                                <NumberInput min={1} value={editingVch.max_uses ?? ''} onChange={(t) => setEditingVch({ ...editingVch, max_uses: t })} />
                                <small className="muted">{C.maxUsesHint}</small>
                            </div>
                            <div className="field grow" style={{ minWidth: 150 }}>
                                <label>{C.expiresAt}</label>
                                <input type="datetime-local" value={editingVch.expires_at ?? ''} onChange={(e) => setEditingVch({ ...editingVch, expires_at: e.target.value })} />
                            </div>
                        </div>

                        <div className="field">
                            <label>{C.note}</label>
                            <input value={editingVch.note ?? ''} onChange={(e) => setEditingVch({ ...editingVch, note: e.target.value })} maxLength={200} />
                        </div>

                        <label className="row" style={{ fontSize: 14, marginTop: 4, cursor: 'pointer', gap: 10 }}>
                            <Switch on={editingVch.is_active} onChange={(v) => setEditingVch({ ...editingVch, is_active: v })} />
                            {C.activeVch}
                        </label>

                        <div className="field">
                            <label>{C.vchRoles}</label>
                            {/* An empty list means "everyone" — the same thing every
                                voucher meant before roles existed. */}
                            <div className="row wrap" style={{ gap: 8 }}>
                                {([['user', C.roleUser], ['vendor', C.roleVendorV], ['affiliate', C.roleAffiliateV]] as const).map(([r, label]) => {
                                    const picked = (editingVch.roles ?? []).includes(r);
                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            aria-pressed={picked}
                                            className={`btn btn-sm ${picked ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => {
                                                const cur = editingVch.roles ?? [];
                                                setEditingVch({ ...editingVch, roles: picked ? cur.filter((x: string) => x !== r) : [...cur, r] });
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <small className="muted" style={{ display: 'block', marginTop: 8 }}>
                                {(editingVch.roles ?? []).length === 0 ? `${C.vchRolesAll} · ${C.vchRolesHint}` : C.vchRolesHint}
                            </small>
                        </div>

                        <label className="spread" style={{ fontSize: 14, marginTop: 14, cursor: 'pointer', gap: 12, alignItems: 'flex-start' }}>
                            <span>
                                <span style={{ fontWeight: 600, display: 'block' }}>{C.oncePerUser}</span>
                                <span className="muted" style={{ fontSize: 12.5 }}>{C.oncePerUserHint}</span>
                            </span>
                            <Switch on={!!editingVch.once_per_user} onChange={(v) => setEditingVch({ ...editingVch, once_per_user: v })} />
                        </label>
                    </form>
                )}
            </Drawer>
        </div>
    );
}

/* --------------------------- helpers --------------------------- */

const sectionIcon: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};

/** Compact input used in the pay-per-entry charge-list rows. */
const ppeInp: React.CSSProperties = {
    padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9,
    font: 'inherit', background: '#fff', color: 'var(--ink)', minWidth: 0,
};

/** iOS-style on/off switch built from theme tokens (no app.css edits). */
function Switch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button" role="switch" aria-checked={on} disabled={disabled}
            onClick={() => onChange(!on)}
            style={{
                width: 46, height: 26, borderRadius: 999, padding: 0, flexShrink: 0,
                border: '1px solid ' + (on ? 'var(--plum)' : 'var(--line)'),
                background: on ? 'var(--plum)' : '#e7e4f3',
                position: 'relative', cursor: disabled ? 'default' : 'pointer',
                transition: 'background .18s', opacity: disabled ? 0.6 : 1,
            }}
        >
            <span style={{
                position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20,
                borderRadius: '50%', background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.25)',
            }} />
        </button>
    );
}

/** A single labelled toggle row for the Ciri tab. */
function ToggleRow({ title, desc, on, busy, onChange, onLabel, offLabel, last }: {
    title: string; desc: string; on: boolean; busy: boolean;
    onChange: (v: boolean) => void; onLabel: string; offLabel: string; last?: boolean;
}) {
    return (
        <div className="spread" style={{ gap: 16, padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--line)', alignItems: 'flex-start' }}>
            <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{title}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{desc}</div>
            </div>
            <div className="row" style={{ gap: 10, flexShrink: 0 }}>
                <span className="muted" style={{ fontSize: 12, minWidth: 26, textAlign: 'right' }}>{on ? onLabel : offLabel}</span>
                <Switch on={on} onChange={onChange} disabled={busy} />
            </div>
        </div>
    );
}
