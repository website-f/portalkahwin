import {
    useEffect, useLayoutEffect, useMemo, useRef, useState,
    type CSSProperties, type ReactNode,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, Check, LogIn, Eye, X, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { getTemplate } from '../templates/registry';
import { SAMPLE_INVITATION } from '../templates/sampleData';
import { CardAtmosphere } from '../components/CardAtmosphere';
import { CardActionBar } from '../components/CardActionBar';
import { MadeByPortalKahwin } from '../components/MadeByPortalKahwin';
import { CardStage } from '../templates/PkSec';
import { artFor } from '../templates/templateArt';
import { readablePalette } from '../lib/contrast';
import { formatHijri, formatProgramTime } from '../lib/datetime';
import { useLang, dict, type Lang } from '../context/LangContext';
import type { Contact, GiftInfo, InvitationData, Palette, ProgramItem } from '../templates/types';
import type { CustomTemplateConfig } from '../templates/customConfig';

/* ============================================================
 * Public "trial editor" — a guest builds a wedding card step-by-step
 * BEFORE logging in. Nothing is created on the server here: the card
 * content lives in React state and is mirrored to localStorage under
 * `pk_trial`, so it survives the login/register redirect. The post-login
 * step (wired elsewhere) turns `pk_trial` into a real trial card.
 * ============================================================ */

/** localStorage key + payload shape the login handoff reads back. */
const STORAGE_KEY = 'pk_trial';

/** Editable card content — snake_case, mirroring the invitation columns. */
interface TrialData {
    groom_name: string;
    bride_name: string;
    groom_short?: string;
    bride_short?: string;
    groom_parents?: string;
    bride_parents?: string;
    opening_line?: string;
    bismillah?: boolean;
    date_label?: string;
    time_label?: string;
    hijri_label?: string;
    akad_at?: string;
    reception_at?: string;
    venue_name?: string;
    venue_address?: string;
    maps_url?: string;
    waze_url?: string;
    program?: ProgramItem[];
    contacts?: Contact[];
    gift?: GiftInfo;
}

interface TrialPayload { template_key: string; data: TrialData; }

interface TemplateRow {
    key: string;
    base_key?: string | null;
    palette?: Palette | null;
    config?: CustomTemplateConfig | null;
}

/** Empty, sensible defaults — empty strings, empty arrays, empty gift. */
function emptyTrial(): TrialData {
    return {
        groom_name: '', bride_name: '', groom_short: '', bride_short: '',
        groom_parents: '', bride_parents: '', opening_line: '', bismillah: false,
        date_label: '', time_label: '', hijri_label: '', akad_at: '', reception_at: '',
        venue_name: '', venue_address: '', maps_url: '', waze_url: '',
        program: [], contacts: [], gift: {},
    };
}

/**
 * A first-visit trial card that arrives pre-filled with friendly demo content —
 * the opening greeting, a short name and the Bismillah on — so a visitor testing
 * a template edits real text (and sees the Bismillah → short name → full name
 * layout) instead of a blank form. They overwrite it with their own details.
 */
function starterTrial(): TrialData {
    const S = SAMPLE_INVITATION;
    return {
        ...emptyTrial(),
        groom_short: 'Adam',
        bride_short: 'Hawa',
        opening_line: S.openingLine ?? '',
        bismillah: true,
    };
}

function isPayload(v: unknown): v is { template_key: string; data: Partial<TrialData> } {
    if (typeof v !== 'object' || v === null) return false;
    const o = v as Record<string, unknown>;
    return typeof o.template_key === 'string' && typeof o.data === 'object' && o.data !== null;
}

/** Hydrate from localStorage, but only if the saved card is for THIS template. */
function loadTrial(templateKey: string): TrialData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (isPayload(parsed) && parsed.template_key === templateKey) {
                const d = parsed.data;
                // A saved card with no REAL content (names/venue/date/programme) is a
                // leftover blank from a previous visit — treat it as fresh so the
                // visitor still gets the friendly starter (opening text, short name,
                // Bismillah on). Only a save with actual edits is restored verbatim.
                const hasContent = !!(d.groom_name || d.bride_name || d.venue_name || d.venue_address
                    || d.date_label || d.akad_at || d.reception_at || (d.program && d.program.length));
                return hasContent ? { ...emptyTrial(), ...d } : starterTrial();
            }
        }
    } catch {
        /* malformed or storage unavailable — fall through to a fresh card */
    }
    // First visit (nothing saved for this template) → pre-filled starter card.
    return starterTrial();
}

function writeTrial(templateKey: string, data: TrialData): void {
    try {
        const payload: TrialPayload = { template_key: templateKey, data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        /* private mode / quota — the in-memory card still works */
    }
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

/* --- snake_case TrialData → camelCase InvitationData, sample-filled --------- */

// Trim + fall back. Two overloads so a required field keeps a `string` type.
function pickText(value: string | undefined, fallback: string): string;
function pickText(value: string | undefined, fallback?: string): string | undefined;
function pickText(value: string | undefined, fallback?: string): string | undefined {
    const t = (value ?? '').trim();
    return t !== '' ? t : fallback;
}

/**
 * Blanks are filled from SAMPLE_INVITATION so an empty card still looks
 * complete in the preview. Mirrors LivePreview's mapping + palette derivation.
 */
function toInvitationData(d: TrialData, tpl: TemplateRow | null, templateKey: string, lang: Lang): InvitationData {
    const S = SAMPLE_INVITATION;
    const baseKey = tpl?.base_key || templateKey;

    const akad = pickText(d.akad_at, S.akadAt ?? '');
    const reception = pickText(d.reception_at, S.receptionAt ?? '');

    // Program / contacts / gift: use the host's rows when they have any,
    // otherwise the sample so the block is never an empty stub.
    const rawProgram = (d.program ?? []).filter((p) => (p.time ?? '').trim() !== '' || (p.title ?? '').trim() !== '');
    const program = rawProgram.length ? rawProgram : (S.program ?? []);
    const rawContacts = (d.contacts ?? []).filter((c) => (c.name ?? '').trim() !== '' || (c.phone ?? '').trim() !== '');
    const contacts = rawContacts.length ? rawContacts : S.contacts;
    const g = d.gift ?? {};
    const giftFilled = !!((g.bankName ?? '').trim() || (g.accountName ?? '').trim() || (g.accountNo ?? '').trim() || (g.note ?? '').trim());
    const gift = giftFilled ? g : S.gift;

    // Hijri: the host's own label wins, else compute from their akad/reception,
    // else fall back to the sample so an untouched card reads complete.
    const hijri = (() => {
        const own = (d.hijri_label ?? '').trim();
        if (own) return own;
        const fromDate = formatHijri(pickText(d.akad_at) ?? pickText(d.reception_at), lang);
        return fromDate || (S.hijriLabel ?? '');
    })();

    // Design art direction first, the template row's own palette on top.
    const palette = readablePalette({
        ...(artFor(baseKey)?.palette ?? {}),
        ...(tpl?.palette ?? {}),
    }) as Palette;

    return {
        groomName: pickText(d.groom_name, S.groomName),
        brideName: pickText(d.bride_name, S.brideName),
        groomShort: pickText(d.groom_short, S.groomShort),
        brideShort: pickText(d.bride_short, S.brideShort),
        groomParents: pickText(d.groom_parents, S.groomParents),
        brideParents: pickText(d.bride_parents, S.brideParents),
        openingLine: pickText(d.opening_line, S.openingLine),
        bismillah: d.bismillah ?? S.bismillah,
        akadAt: akad,
        receptionAt: reception,
        dateLabel: pickText(d.date_label, S.dateLabel),
        timeLabel: pickText(d.time_label, S.timeLabel),
        hijriLabel: hijri,
        venueName: pickText(d.venue_name, S.venueName),
        venueAddress: pickText(d.venue_address, S.venueAddress),
        mapsUrl: pickText(d.maps_url, S.mapsUrl),
        wazeUrl: pickText(d.waze_url, S.wazeUrl),
        program: program.map((p) => ({ ...p, time: formatProgramTime(p.time, lang) })),
        contacts,
        gift,
        galleryImages: [],
        palette,
        templateConfig: tpl?.config ?? undefined,
    };
}

/* --------------------------- steps ---------------------------------------- */

type SectionId = 'couple' | 'venue' | 'programme' | 'contacts' | 'gift';
type StepId = SectionId | 'finish';
const STEPS: StepId[] = ['couple', 'venue', 'programme', 'contacts', 'gift', 'finish'];
const SECTIONS: SectionId[] = ['couple', 'venue', 'programme', 'contacts', 'gift'];

/** Natural card width before it is scaled to fit the phone frame. */
const STAGE_W = 460;

const inpS: CSSProperties = {
    padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9,
    font: 'inherit', flex: 1, minWidth: 0, background: '#fff', color: 'var(--ink)',
};

export function TrialEditor() {
    const { key = 'floral' } = useParams();
    const navigate = useNavigate();
    const { lang } = useLang();
    const isWide = useMedia('(min-width: 1080px)');

    const [tpl, setTpl] = useState<TemplateRow | null>(null);
    const [data, setData] = useState<TrialData>(() => loadTrial(key));
    const [step, setStep] = useState(0);
    // Full-card watermarked preview, openable BEFORE login. Closing it returns to
    // the wizard with the form intact (state is never cleared, and pk_trial holds it).
    const [showPreview, setShowPreview] = useState(false);

    // Re-hydrate + reset when the URL template key changes (React Router keeps
    // this component mounted across a `/try/:key` param change).
    const keyRef = useRef(key);
    useEffect(() => {
        if (keyRef.current !== key) {
            keyRef.current = key;
            setData(loadTrial(key));
            setStep(0);
        }
    }, [key]);

    // Pull the template's base_key / palette / config for the live preview.
    useEffect(() => {
        let alive = true;
        api.get<TemplateRow>(`/templates/${key}`)
            .then((r) => { if (alive) setTpl(r.data); })
            .catch(() => { if (alive) setTpl(null); });
        return () => { alive = false; };
    }, [key]);

    // Persist on every change, so the card survives the login/register redirect.
    useEffect(() => { writeTrial(key, data); }, [key, data]);

    // Lock body scroll while the full-card preview overlay is open.
    useEffect(() => {
        if (!showPreview) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPreview(false); };
        document.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
    }, [showPreview]);

    const C = dict({
        bm: {
            gallery: 'Galeri',
            trialNote: 'Mod Percubaan · data anda disimpan di pelayar',
            stepShort: { couple: 'Pasangan', venue: 'Tarikh & Lokasi', programme: 'Atur Cara', contacts: 'Hubungi', gift: 'Salam Kasih', finish: 'Selesai' } as Record<StepId, string>,
            stepTitle: { couple: 'Pasangan', venue: 'Tarikh & Lokasi', programme: 'Atur Cara', contacts: 'Hubungi', gift: 'Salam Kasih', finish: 'Semak & Selesai' } as Record<StepId, string>,
            stepSub: {
                couple: 'Nama, keluarga & kata aluan',
                venue: 'Tarikh, masa & lokasi majlis',
                programme: 'Perjalanan majlis mengikut waktu',
                contacts: 'Nombor untuk dihubungi',
                gift: 'Maklumat akaun untuk salam kasih',
                finish: 'Semak butiran anda, kemudian teruskan',
            } as Record<StepId, string>,
            stepOf: (n: number, t: number) => `Langkah ${n} daripada ${t}`,
            back: 'Kembali', next: 'Seterusnya', finish: 'Selesai & Daftar',
            gCouple: 'Pengantin', gFamily: 'Keluarga', gOpening: 'Kata Aluan',
            gWhen: 'Tarikh & Masa', gWhere: 'Lokasi',
            groomName: 'Nama penuh pengantin lelaki', brideName: 'Nama penuh pengantin perempuan',
            groomShort: 'Nama panggilan pengantin lelaki', brideShort: 'Nama panggilan pengantin perempuan',
            groomParents: 'Nama keluarga pengantin lelaki', brideParents: 'Nama keluarga pengantin perempuan',
            opening: 'Kata pembuka', showBismillah: 'Paparkan Bismillah',
            dateLabel: 'Paparan tarikh', dateSample: 'Sabtu, 12 Disember 2026',
            timeLabel: 'Paparan masa', timeSample: '12:00 tengah hari – 4:00 petang',
            hijri: 'Tarikh Hijrah', akadDT: 'Akad Nikah (tarikh & masa)', receptionDT: 'Majlis / Resepsi (untuk kira detik)',
            venueName: 'Nama lokasi', address: 'Alamat penuh',
            mapsLink: 'Pautan Google Maps', wazeLink: 'Pautan Waze',
            programHint: 'Susun perjalanan majlis mengikut waktu. Waktu dipaparkan mengikut bahasa tetamu.',
            time: 'Waktu', event: 'Acara', addRow: 'Tambah baris',
            name: 'Nama', role: 'Hubungan / peranan', addContact: 'Tambah nombor',
            contactHint: 'Nombor yang tetamu boleh hubungi untuk pertanyaan.',
            bankName: 'Nama bank', accountName: 'Nama pemilik akaun', accountNo: 'No. akaun', note: 'Nota ringkas',
            giftHint: 'Pilihan — untuk tetamu yang ingin menghulurkan salam kasih.',
            remove: 'Buang',
            rCouple: 'Pengantin', rDate: 'Tarikh', rVenue: 'Lokasi',
            rProgramme: 'Atur cara', rContacts: 'Hubungi', rItems: 'butiran', rEmpty: 'Belum diisi',
            reviewHint: 'Butiran yang dibiarkan kosong akan menggunakan contoh pada pratonton. Anda boleh sunting semula selepas mendaftar.',
            finishCta: 'Selesai & Daftar untuk simpan',
            haveAccount: 'Sudah ada akaun? Log masuk',
        },
        en: {
            gallery: 'Templates',
            trialNote: 'Trial mode · your data is saved in your browser',
            stepShort: { couple: 'Couple', venue: 'Date & Venue', programme: 'Programme', contacts: 'Contacts', gift: 'Gift', finish: 'Finish' } as Record<StepId, string>,
            stepTitle: { couple: 'The Couple', venue: 'Date & Venue', programme: 'Programme', contacts: 'Contacts', gift: 'Cash Gift', finish: 'Review & Finish' } as Record<StepId, string>,
            stepSub: {
                couple: 'Names, family & opening words',
                venue: 'Date, time & venue',
                programme: 'Run of show by time',
                contacts: 'People to contact',
                gift: 'Bank details for cash gifts',
                finish: 'Check your details, then continue',
            } as Record<StepId, string>,
            stepOf: (n: number, t: number) => `Step ${n} of ${t}`,
            back: 'Back', next: 'Next', finish: 'Finish & Sign up',
            gCouple: 'The Couple', gFamily: 'Family', gOpening: 'Opening',
            gWhen: 'Date & Time', gWhere: 'Venue',
            groomName: "Groom's full name", brideName: "Bride's full name",
            groomShort: "Groom's short name", brideShort: "Bride's short name",
            groomParents: "Groom's parents", brideParents: "Bride's parents",
            opening: 'Opening words', showBismillah: 'Show Bismillah',
            dateLabel: 'Date label', dateSample: 'Saturday, 12 December 2026',
            timeLabel: 'Time label', timeSample: '12:00 noon – 4:00 pm',
            hijri: 'Hijri date', akadDT: 'Akad Nikah (date & time)', receptionDT: 'Reception (used for countdown)',
            venueName: 'Venue name', address: 'Address',
            mapsLink: 'Google Maps link', wazeLink: 'Waze link',
            programHint: 'Arrange the run of show by time. Times display in each guest’s language.',
            time: 'Time', event: 'Event', addRow: 'Add row',
            name: 'Name', role: 'Role', addContact: 'Add contact',
            contactHint: 'Numbers a guest can call with questions.',
            bankName: 'Bank name', accountName: 'Account holder name', accountNo: 'Account number', note: 'Note',
            giftHint: 'Optional — for guests who wish to send a cash gift.',
            remove: 'Remove',
            rCouple: 'Couple', rDate: 'Date', rVenue: 'Venue',
            rProgramme: 'Programme', rContacts: 'Contacts', rItems: 'items', rEmpty: 'Not set',
            reviewHint: 'Anything left blank uses the sample content in the preview. You can edit it all again after signing up.',
            finishCta: 'Finish & sign up to save',
            haveAccount: 'Already have an account? Log in',
        },
        zh: {
            gallery: '请柬设计',
            trialNote: '试用模式 · 您的资料已保存在浏览器中',
            stepShort: { couple: '新人', venue: '日期与地点', programme: '婚礼流程', contacts: '联络人', gift: '礼金', finish: '完成' } as Record<StepId, string>,
            stepTitle: { couple: '新人', venue: '日期与地点', programme: '婚礼流程', contacts: '联络人', gift: '礼金', finish: '检查并完成' } as Record<StepId, string>,
            stepSub: {
                couple: '姓名、家庭与开场语',
                venue: '日期、时间与场地',
                programme: '按时间安排流程',
                contacts: '可联络的人',
                gift: '收取礼金的银行资料',
                finish: '检查您的资料，然后继续',
            } as Record<StepId, string>,
            stepOf: (n: number, t: number) => `第 ${n} / ${t} 步`,
            back: '上一步', next: '下一步', finish: '完成并注册',
            gCouple: '新人', gFamily: '家庭', gOpening: '开场语',
            gWhen: '日期与时间', gWhere: '场地',
            groomName: '男方全名', brideName: '女方全名',
            groomShort: '男方昵称', brideShort: '女方昵称',
            groomParents: '男方父母', brideParents: '女方父母',
            opening: '开场语', showBismillah: '显示 Bismillah',
            dateLabel: '日期显示文字', dateSample: '2026年12月12日 星期六',
            timeLabel: '时间显示文字', timeSample: '中午 12:00 – 下午 4:00',
            hijri: '回历日期', akadDT: '证婚仪式（日期与时间）', receptionDT: '婚宴（用于倒计时）',
            venueName: '场地名称', address: '详细地址',
            mapsLink: 'Google 地图链接', wazeLink: 'Waze 链接',
            programHint: '按时间顺序安排婚礼流程。时间会按宾客的语言显示。',
            time: '时间', event: '环节', addRow: '添加一行',
            name: '姓名', role: '身份', addContact: '添加联络人',
            contactHint: '宾客可致电咨询的号码。',
            bankName: '银行名称', accountName: '账户名称', accountNo: '账号', note: '备注',
            giftHint: '可选 — 供想送礼金的宾客使用。',
            remove: '删除',
            rCouple: '新人', rDate: '日期', rVenue: '场地',
            rProgramme: '婚礼流程', rContacts: '联络人', rItems: '项', rEmpty: '未填写',
            reviewHint: '留空的资料会在预览中使用示例内容。注册后仍可再次编辑全部内容。',
            finishCta: '完成并注册以保存',
            haveAccount: '已有账户？登录',
        },
    }, lang);

    const P = dict({
        bm: {
            previewBtn: 'Pratonton', watermark: 'PRATONTON', close: 'Tutup',
            ctaTitle: 'Suka rekaan ini?', ctaBody: 'Daftar atau log masuk untuk menyimpannya sebagai kad anda. Butiran yang anda isi tadi akan kekal.',
            signUp: 'Daftar & Simpan', login: 'Log Masuk',
            leaveTitle: 'Tinggalkan halaman ini?', leaveBody: 'Anda sedang mereka kad. Jika keluar sekarang, kemajuan yang belum disimpan mungkin hilang.',
            stay: 'Kekal di sini', leave: 'Keluar',
        },
        en: {
            previewBtn: 'Preview', watermark: 'PREVIEW', close: 'Close',
            ctaTitle: 'Like this design?', ctaBody: 'Create an account or log in to save it as your card. Everything you filled in will be kept.',
            signUp: 'Sign up & save', login: 'Log in',
            leaveTitle: 'Leave this page?', leaveBody: 'You are in the middle of designing your card. If you leave now, your unsaved progress may be lost.',
            stay: 'Stay here', leave: 'Leave',
        },
        zh: {
            previewBtn: '预览', watermark: '预览', close: '关闭',
            ctaTitle: '喜欢这个设计吗？', ctaBody: '注册或登录即可将其保存为您的请柬。您填写的内容都会保留。',
            signUp: '注册并保存', login: '登录',
            leaveTitle: '离开此页面？', leaveBody: '您正在设计请柬。若现在离开，未保存的进度可能会丢失。',
            stay: '留在此页', leave: '离开',
        },
    }, lang);

    const set = (patch: Partial<TrialData>) => setData((d) => ({ ...d, ...patch }));

    // ---- Leave guard ---------------------------------------------------------
    // Has the guest actually started designing? (don't nag on an empty form)
    const dirty = step > 0 || !!(
        data.groom_name || data.bride_name || data.date_label || data.venue_name ||
        (data.program && data.program.length) || (data.contacts && data.contacts.length)
    );
    // A custom "your data will be lost" modal; `leaveTo` is where to go on confirm
    // ('' = a browser Back that we trapped).
    const [leaveTo, setLeaveTo] = useState<string | null>(null);
    const allowLeave = useRef(false);

    // Trap the browser BACK button while dirty, and surface our own modal instead
    // of the native one. We push a sentinel entry; popstate re-pushes it and opens
    // the modal, so the page never actually navigates until the guest confirms.
    useEffect(() => {
        if (!dirty) return;
        window.history.pushState(null, '', window.location.href);
        const onPop = () => {
            if (allowLeave.current) return;
            window.history.pushState(null, '', window.location.href);
            setLeaveTo('');
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [dirty]);

    // Open the full preview in a NEW TAB (reads pk_trial, so the wizard here is
    // never disturbed and Back can't wipe progress). Falls back to the in-page
    // overlay if the browser blocks the popup.
    const openPreview = () => {
        const url = window.location.pathname.replace(/\/+$/, '') + '/preview' + window.location.search;
        // No 'noopener' here: it forces a null return, so we couldn't tell a real
        // open from a blocked popup. Same-origin preview, so opener access is fine.
        const win = window.open(url, '_blank');
        if (!win) setShowPreview(true); // popup blocked → in-page overlay fallback
    };

    // Confirm/deny the leave modal.
    const confirmLeave = () => {
        allowLeave.current = true;
        const to = leaveTo;
        setLeaveTo(null);
        if (to) navigate(to);
        else navigate('/'); // trapped Back → go to the gallery
    };

    const liveData = useMemo<InvitationData>(
        () => toInvitationData(data, tpl, key, lang),
        [data, tpl, key, lang],
    );

    function finish(): void {
        writeTrial(key, data);          // guarantee the latest card is on disk
        navigate('/register-new-user?trial=1');  // the post-login step turns pk_trial into a real card
    }

    const isLast = step === STEPS.length - 1;
    const goNext = () => (isLast ? finish() : setStep((s) => Math.min(s + 1, STEPS.length - 1)));
    const goBack = () => setStep((s) => Math.max(s - 1, 0));

    /* ---- Section bodies. Reused one-at-a-time on desktop, stacked on mobile ---- */
    const program = data.program ?? [];
    const contacts = data.contacts ?? [];
    const gift = data.gift ?? {};

    const BODY: Record<SectionId, ReactNode> = {
        couple: (
            <>
                <div className="te-glabel">{C.gCouple}</div>
                <Field label={C.groomName} value={data.groom_name} onChange={(v) => set({ groom_name: v })} />
                <Field label={C.brideName} value={data.bride_name} onChange={(v) => set({ bride_name: v })} />
                <Field label={C.groomShort} value={data.groom_short} onChange={(v) => set({ groom_short: v })} />
                <Field label={C.brideShort} value={data.bride_short} onChange={(v) => set({ bride_short: v })} />

                <div className="te-glabel">{C.gFamily}</div>
                <Field label={C.groomParents} value={data.groom_parents} onChange={(v) => set({ groom_parents: v })} />
                <Field label={C.brideParents} value={data.bride_parents} onChange={(v) => set({ bride_parents: v })} />

                <div className="te-glabel">{C.gOpening}</div>
                <div className="field">
                    <label>{C.opening}</label>
                    <textarea rows={2} value={data.opening_line ?? ''} onChange={(e) => set({ opening_line: e.target.value })} />
                </div>
                <label className="te-check">
                    <input type="checkbox" checked={!!data.bismillah} onChange={(e) => set({ bismillah: e.target.checked })} />
                    {C.showBismillah}
                </label>
            </>
        ),

        venue: (
            <>
                <div className="te-glabel">{C.gWhen}</div>
                <Field label={C.dateLabel} value={data.date_label} onChange={(v) => set({ date_label: v })} placeholder={C.dateSample} />
                <Field label={C.timeLabel} value={data.time_label} onChange={(v) => set({ time_label: v })} placeholder={C.timeSample} />
                <Field label={C.hijri} value={data.hijri_label} onChange={(v) => set({ hijri_label: v })} />
                <div className="field">
                    <label>{C.akadDT}</label>
                    <input type="datetime-local" value={(data.akad_at ?? '').slice(0, 16)} onChange={(e) => set({ akad_at: e.target.value })} />
                </div>
                <div className="field">
                    <label>{C.receptionDT}</label>
                    <input type="datetime-local" value={(data.reception_at ?? '').slice(0, 16)} onChange={(e) => set({ reception_at: e.target.value })} />
                </div>

                <div className="te-glabel">{C.gWhere}</div>
                <Field label={C.venueName} value={data.venue_name} onChange={(v) => set({ venue_name: v })} />
                <div className="field">
                    <label>{C.address}</label>
                    <textarea rows={2} value={data.venue_address ?? ''} onChange={(e) => set({ venue_address: e.target.value })} />
                </div>
                <Field label={C.mapsLink} value={data.maps_url} onChange={(v) => set({ maps_url: v })} placeholder="https://maps.google.com/…" />
                <Field label={C.wazeLink} value={data.waze_url} onChange={(v) => set({ waze_url: v })} placeholder="https://waze.com/ul/…" />
            </>
        ),

        programme: (
            <>
                <p className="te-hint">{C.programHint}</p>
                {program.map((p, i) => (
                    <div className="te-row" key={i}>
                        <input
                            type="time" style={inpS} aria-label={C.time} value={p.time}
                            onChange={(e) => { const n = [...program]; n[i] = { ...p, time: e.target.value }; set({ program: n }); }}
                        />
                        <input
                            style={{ ...inpS, flex: 2 }} placeholder={C.event} value={p.title}
                            onChange={(e) => { const n = [...program]; n[i] = { ...p, title: e.target.value }; set({ program: n }); }}
                        />
                        <button className="btn btn-ghost btn-sm" aria-label={C.remove} onClick={() => set({ program: program.filter((_, x) => x !== i) })}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => set({ program: [...program, { time: '', title: '' }] })}>
                    <Plus size={14} /> {C.addRow}
                </button>
            </>
        ),

        contacts: (
            <>
                <p className="te-hint">{C.contactHint}</p>
                {contacts.map((c, i) => (
                    <div key={i} className="te-contact">
                        <div className="te-row" style={{ marginBottom: 6 }}>
                            <input
                                style={inpS} placeholder={C.name} value={c.name}
                                onChange={(e) => { const n = [...contacts]; n[i] = { ...c, name: e.target.value }; set({ contacts: n }); }}
                            />
                            <button className="btn btn-ghost btn-sm" aria-label={C.remove} onClick={() => set({ contacts: contacts.filter((_, x) => x !== i) })}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <div className="te-row">
                            <input
                                style={inpS} placeholder={C.role} value={c.role ?? ''}
                                onChange={(e) => { const n = [...contacts]; n[i] = { ...c, role: e.target.value }; set({ contacts: n }); }}
                            />
                            <input
                                style={inpS} inputMode="tel" placeholder="+60…" value={c.phone}
                                onChange={(e) => { const n = [...contacts]; n[i] = { ...c, phone: e.target.value }; set({ contacts: n }); }}
                            />
                        </div>
                    </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => set({ contacts: [...contacts, { name: '', role: '', phone: '' }] })}>
                    <Plus size={14} /> {C.addContact}
                </button>
            </>
        ),

        gift: (
            <>
                <p className="te-hint">{C.giftHint}</p>
                <Field label={C.bankName} value={gift.bankName} onChange={(v) => set({ gift: { ...gift, bankName: v } })} />
                <Field label={C.accountName} value={gift.accountName} onChange={(v) => set({ gift: { ...gift, accountName: v } })} />
                <Field label={C.accountNo} value={gift.accountNo} onChange={(v) => set({ gift: { ...gift, accountNo: v } })} />
                <Field label={C.note} value={gift.note} onChange={(v) => set({ gift: { ...gift, note: v } })} />
            </>
        ),
    };

    const filledProgram = program.filter((p) => (p.time ?? '').trim() || (p.title ?? '').trim()).length;
    const filledContacts = contacts.filter((c) => (c.name ?? '').trim() || (c.phone ?? '').trim()).length;

    const review: ReactNode = (
        <>
            <dl className="te-review">
                <ReviewRow label={C.rCouple} value={coupleLine(data, C.rEmpty)} />
                <ReviewRow label={C.rDate} value={pickText(data.date_label) ?? C.rEmpty} />
                <ReviewRow label={C.rVenue} value={pickText(data.venue_name) ?? C.rEmpty} />
                <ReviewRow label={C.rProgramme} value={`${filledProgram} ${C.rItems}`} />
                <ReviewRow label={C.rContacts} value={`${filledContacts} ${C.rItems}`} />
            </dl>
            <p className="te-hint" style={{ margin: '16px 0 0' }}>{C.reviewHint}</p>
        </>
    );

    const preview = (
        <TrialPreview data={liveData} baseKey={tpl?.base_key ?? undefined} templateKey={key} compact={!isWide} />
    );

    const loginLink = (
        <Link to="/login?trial=1" className="te-login">
            <LogIn size={14} /> {C.haveAccount}
        </Link>
    );

    return (
        <div className="te">
            <style>{TE_CSS}</style>

            {/* Always-visible header: back to gallery (guarded when dirty) + a
                reassuring trial-mode line. The Preview button now lives beside
                Finish & Sign up and opens in a new tab. */}
            <header className="te-head">
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => (dirty ? setLeaveTo('/') : navigate('/'))}
                >
                    <ArrowLeft size={15} /> {C.gallery}
                </button>
                <span className="te-head-note">{C.trialNote}</span>
            </header>

            {isWide ? (
                /* ---------- Desktop: step-by-step wizard | live preview ---------- */
                <div className="te-wizard">
                    <div className="te-form-col">
                        <ol className="te-steps" aria-label={C.stepTitle[STEPS[step]]}>
                            {STEPS.map((s, i) => {
                                const state = i === step ? ' is-active' : i < step ? ' is-done' : '';
                                return (
                                    <li key={s} className="te-steps-item">
                                        <button className={`te-chip${state}`} onClick={() => setStep(i)} aria-current={i === step}>
                                            <span className="te-chip-no">{i < step ? <Check size={13} /> : i + 1}</span>
                                            <span className="te-chip-lbl">{C.stepShort[s]}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                        <p className="te-progress">{C.stepOf(step + 1, STEPS.length)}</p>

                        <section className="panel te-panel" aria-label={C.stepTitle[STEPS[step]]}>
                            <header className="te-panel-head">
                                <h2>{C.stepTitle[STEPS[step]]}</h2>
                                <p>{C.stepSub[STEPS[step]]}</p>
                            </header>
                            <div className="te-panel-body pk-scroll">
                                {isLast ? review : BODY[STEPS[step] as SectionId]}
                                {isLast && <div className="te-finish-login">{loginLink}</div>}
                            </div>
                        </section>

                        <div className="te-nav">
                            <button className="btn btn-ghost" onClick={goBack} disabled={step === 0}>
                                <ArrowLeft size={16} /> {C.back}
                            </button>
                            <div className="row" style={{ gap: 10 }}>
                                <button className="btn btn-ghost" onClick={openPreview}>
                                    <Eye size={16} /> {P.previewBtn}
                                </button>
                                <button className="btn btn-primary" onClick={goNext}>
                                    {isLast ? <><Check size={16} /> {C.finish}</> : <>{C.next} <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </div>
                    </div>

                    <aside className="te-preview-col">{preview}</aside>
                </div>
            ) : (
                /* ---------- Mobile: preview on top + one scrollable form ---------- */
                <div className="te-mobile">
                    <div className="te-preview-mobile">{preview}</div>

                    <div className="te-sections">
                        {SECTIONS.map((s) => (
                            <section className="te-group" key={s} aria-label={C.stepTitle[s]}>
                                <h3 className="te-group-title">{C.stepTitle[s]}</h3>
                                {BODY[s]}
                            </section>
                        ))}
                    </div>

                    <div className="te-mobile-cta">
                        <div className="row" style={{ gap: 10 }}>
                            <button className="btn btn-ghost" onClick={openPreview} style={{ flex: 1, justifyContent: 'center' }}>
                                <Eye size={16} /> {P.previewBtn}
                            </button>
                            <button className="btn btn-primary" onClick={finish} style={{ flex: 2, justifyContent: 'center' }}>
                                <Check size={16} /> {C.finishCta}
                            </button>
                        </div>
                        {loginLink}
                    </div>
                </div>
            )}

            {/* Full-card watermarked preview — no login needed. Closing keeps the
                form (state is untouched); the CTA is create-account / log-in, and the
                post-login handoff turns this same pk_trial card into the user's card. */}
            {showPreview && (
                <TrialFullPreview
                    data={liveData}
                    baseKey={tpl?.base_key ?? undefined}
                    templateKey={key}
                    labels={{ watermark: P.watermark, close: P.close, ctaTitle: P.ctaTitle, ctaBody: P.ctaBody, signUp: P.signUp, login: P.login }}
                    onClose={() => setShowPreview(false)}
                    onSignUp={finish}
                />
            )}

            {/* Custom leave-guard modal (replaces the browser's native confirm). */}
            {leaveTo !== null && (
                <div className="te-leave" role="dialog" aria-modal="true" aria-labelledby="te-leave-title">
                    <div className="te-leave-card">
                        <h3 id="te-leave-title">{P.leaveTitle}</h3>
                        <p>{P.leaveBody}</p>
                        <div className="te-leave-actions">
                            <button className="btn btn-ghost" onClick={() => setLeaveTo(null)}>{P.stay}</button>
                            <button className="btn btn-primary" onClick={confirmLeave}>{P.leave}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * The trial card rendered full-size with the PREVIEW watermark and a
 * create-account / log-in call to action — shown before the guest has any
 * account. It never mutates the form, so dismissing it returns to the wizard
 * exactly as it was.
 */
function TrialFullPreview({ data, baseKey, templateKey, labels, onClose, onSignUp }: {
    data: InvitationData;
    baseKey?: string;
    templateKey: string;
    labels: { watermark: string; close: string; ctaTitle: string; ctaBody: string; signUp: string; login: string };
    onClose: () => void;
    onSignUp: () => void;
}) {
    const Tpl = getTemplate(baseKey || templateKey);
    return (
        <div className="tp-fs" role="dialog" aria-modal="true" aria-label={labels.watermark}>
            <button className="tp-fs-close" onClick={onClose} aria-label={labels.close}><X size={20} /></button>

            <div className="tp-fs-scroll pk-scroll">
                <CardAtmosphere templateKey={baseKey || templateKey} palette={data.palette}>
                    <CardStage>
                        <Tpl data={data} />
                    </CardStage>
                </CardAtmosphere>
            </div>

            {/* Watermark band across the middle, matching a real trial card. */}
            <div className="tp-fs-wm" aria-hidden="true"><div className="tp-fs-wm-band">{labels.watermark}</div></div>

            {/* Create-account / log-in bar. */}
            <div className="tp-fs-cta">
                <div className="tp-fs-cta-txt">
                    <strong>{labels.ctaTitle}</strong>
                    <span>{labels.ctaBody}</span>
                </div>
                <div className="tp-fs-cta-btns">
                    <Link to="/login?trial=1" className="btn btn-ghost"><LogIn size={16} /> {labels.login}</Link>
                    <button className="btn btn-primary" onClick={onSignUp}><UserPlus size={16} /> {labels.signUp}</button>
                </div>
            </div>
        </div>
    );
}

/* --------------------------- small building blocks ------------------------- */

function Field({ label, value, onChange, placeholder }: {
    label: string; value?: string; onChange: (v: string) => void; placeholder?: string;
}) {
    return (
        <div className="field">
            <label>{label}</label>
            <input value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="te-review-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function coupleLine(d: TrialData, empty: string): string {
    const bride = pickText(d.bride_name);
    const groom = pickText(d.groom_name);
    if (!bride && !groom) return empty;
    return `${bride ?? '—'} & ${groom ?? '—'}`;
}

/**
 * Scaled phone-frame live preview. Renders the chosen template settled
 * (`preview`) inside a fixed-width stage that is transform-scaled to fit its
 * column — the ResizeObserver approach mirrors LivePreview so a full-height
 * hero fills exactly the visible frame rather than the whole window.
 */
function TrialPreview({ data, baseKey, templateKey, compact }: {
    data: InvitationData; baseKey?: string; templateKey: string; compact: boolean;
}) {
    const frameRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [stageH, setStageH] = useState(0);
    const [frameVh, setFrameVh] = useState<number | null>(null);

    useLayoutEffect(() => {
        const frame = frameRef.current;
        const stage = stageRef.current;
        if (!frame || !stage) return;

        const measure = () => {
            const s = Math.min(1, frame.clientWidth / STAGE_W);
            setScale(s);
            setStageH(stage.offsetHeight * s);
            // Undo the scale so `--pk-vh` fills exactly the visible frame; guard
            // against nonsense values that would drop the cover's min-height.
            const vh = frame.clientHeight / s;
            setFrameVh(Number.isFinite(vh) && vh > 200 ? vh : null);
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(frame);
        ro.observe(stage);
        return () => ro.disconnect();
    }, []);

    const Tpl = getTemplate(baseKey || templateKey);

    return (
        <div className={`te-device${compact ? ' is-compact' : ''}`}>
            <span className="te-speaker" aria-hidden="true" />
            <div ref={frameRef} className="pk-scroll te-screen">
                <div style={{ height: stageH, overflow: 'hidden' }}>
                    <div
                        ref={stageRef}
                        style={{
                            width: STAGE_W,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            pointerEvents: 'none',
                            ...(frameVh ? ({ '--pk-vh': `${frameVh}px` } as CSSProperties) : null),
                        }}
                    >
                        <CardAtmosphere templateKey={baseKey || templateKey} palette={data.palette}>
                            <CardStage>
                                <Tpl data={data} preview />
                            </CardStage>
                        </CardAtmosphere>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Full-card trial preview rendered in its OWN TAB (opened from the wizard's
 * Preview button). It reads the same pk_trial the wizard writes, so previewing
 * never disturbs — nor lets a Back press wipe — the guest's in-progress form.
 * Read-only; closing the tab returns to the still-intact wizard.
 */
export function TrialPreviewPage() {
    const { key = 'floral' } = useParams();
    const { lang } = useLang();
    const [tpl, setTpl] = useState<TemplateRow | null>(null);
    const data = useMemo(() => loadTrial(key), [key]);
    useEffect(() => {
        let alive = true;
        api.get<TemplateRow>(`/templates/${key}`).then((r) => { if (alive) setTpl(r.data); }).catch(() => undefined);
        return () => { alive = false; };
    }, [key]);
    const liveData = useMemo(() => toInvitationData(data, tpl, key, lang), [data, tpl, key, lang]);
    const Tpl = getTemplate(tpl?.base_key || key);
    const label = lang === 'zh' ? '预览' : lang === 'en' ? 'Preview' : 'Pratonton';
    const closeLbl = lang === 'zh' ? '关闭' : lang === 'en' ? 'Close' : 'Tutup';
    return (
        <div className="tp-fs" role="dialog" aria-label={label}>
            <style>{TE_CSS}</style>
            <button className="tp-fs-close" onClick={() => window.close()} aria-label={closeLbl}><X size={20} /></button>
            <div className="tp-fs-scroll pk-scroll">
                <CardAtmosphere templateKey={tpl?.base_key || key} palette={liveData.palette}>
                    <CardStage>
                        <Tpl data={liveData} />
                    </CardStage>
                </CardAtmosphere>
                {/* Same structure as the live card: credit below the artwork. */}
                <MadeByPortalKahwin />
            </div>
            {/* The real bottom navbar (in preview mode) so test mode mirrors the live
                card exactly — RSVP shows a "preview only" note instead of submitting. */}
            <CardActionBar data={liveData} slug="__preview__" rsvpEnabled preview />
            <div className="tp-fs-wm" aria-hidden="true"><div className="tp-fs-wm-band">{label.toUpperCase()}</div></div>
        </div>
    );
}

const TE_CSS = `
.te { position: relative; overflow-x: clip; padding: 0 0 40px; }

/* Custom leave-guard modal */
.te-leave { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(20,16,40,0.5); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
.te-leave-card { width: 100%; max-width: 380px; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.28); text-align: left; }
.te-leave-card h3 { margin: 0 0 8px; font-size: 18px; color: var(--ink); }
.te-leave-card p { margin: 0 0 20px; font-size: 14px; line-height: 1.55; color: var(--muted); }
.te-leave-actions { display: flex; gap: 10px; justify-content: flex-end; }

/* Header */
.te-head {
    position: sticky; top: 0; z-index: 40;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 12px 18px; background: rgba(255,255,255,0.92);
    -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line);
}
.te-head-note {
    font-size: 12.5px; color: var(--muted); min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ---------- Desktop wizard ---------- */
.te-wizard {
    display: grid; gap: 22px; align-items: start;
    grid-template-columns: minmax(0, 1fr) clamp(360px, 34vw, 460px);
    width: min(1180px, 94vw); margin: 22px auto 0;
}
.te-form-col { min-width: 0; }

/* Step chips */
.te-steps { list-style: none; display: flex; gap: 6px; padding: 6px; margin: 0 0 8px;
    background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow-x: auto;
    scrollbar-width: thin; scrollbar-color: rgba(74,59,196,0.45) transparent; }
.te-steps::-webkit-scrollbar { height: 4px; }
.te-steps::-webkit-scrollbar-thumb { background: rgba(74,59,196,0.45); border-radius: 999px; }
.te-steps-item { flex: 0 0 auto; }
.te-chip {
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px;
    border: 0; background: transparent; border-radius: 11px; cursor: pointer; font: inherit;
    font-size: 13px; font-weight: 600; color: var(--muted); white-space: nowrap;
    transition: background .15s ease, color .15s ease;
}
.te-chip:hover { background: var(--cream); color: var(--plum); }
.te-chip.is-active { background: var(--plum); color: #fff; }
.te-chip.is-done { color: var(--plum); }
.te-chip-no {
    display: grid; place-items: center; width: 22px; height: 22px; flex: none;
    border-radius: 50%; background: var(--cream); color: var(--plum);
    font-size: 12px; font-weight: 800;
}
.te-chip.is-active .te-chip-no { background: rgba(255,255,255,0.22); color: #fff; }
.te-chip.is-done .te-chip-no { background: var(--gold-soft); color: var(--plum); }
.te-progress { margin: 0 0 14px; font-size: 12.5px; font-weight: 700; color: var(--gold); letter-spacing: .02em; }

/* Panel */
.te-panel { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.te-panel-head { flex: none; padding: 18px 20px 14px; border-bottom: 1px solid var(--line); }
.te-panel-head h2 { margin: 0; font-size: 20px; color: var(--plum); line-height: 1.2; }
.te-panel-head p { margin: 4px 0 0; font-size: 13px; color: var(--muted); line-height: 1.45; }
.te-panel-body { padding: 18px 20px 24px; overflow-y: auto; max-height: calc(100vh - 320px); }

/* Nav buttons */
.te-nav { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
.te-nav .btn { min-width: 130px; }

/* Live-preview column */
.te-preview-col { position: sticky; top: 78px; }

/* ---------- Mobile ---------- */
.te-mobile { width: min(680px, 94vw); margin: 18px auto 0; }
.te-preview-mobile { display: flex; justify-content: center; padding: 4px 0 22px; }
.te-sections { display: flex; flex-direction: column; gap: 8px; }
.te-group { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; }
.te-group-title { margin: 0 0 12px; font-size: 16px; color: var(--plum); }
.te-mobile-cta {
    position: sticky; bottom: 0; z-index: 30; margin-top: 18px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 14px 4px calc(14px + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(180deg, rgba(255,255,255,0) 0%, var(--ivory) 34%);
}

/* Shared bits */
.te-glabel {
    font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--plum); margin: 22px 0 12px; display: flex; align-items: center; gap: 10px;
}
.te-glabel:first-child { margin-top: 2px; }
.te-glabel::after { content: ''; flex: 1; height: 1px; background: var(--line); }
.te-hint { color: var(--muted); font-size: 13px; line-height: 1.55; margin: 0 0 14px; }
.te-row { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.te-contact { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
.te-check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; margin-top: 4px; cursor: pointer; }
.te-check input { width: 16px; height: 16px; }

/* Review list */
.te-review { margin: 0; display: flex; flex-direction: column; }
.te-review-row { display: flex; align-items: baseline; gap: 12px; padding: 11px 2px; border-bottom: 1px solid var(--line); }
.te-review-row:last-child { border-bottom: 0; }
.te-review-row dt { flex: 0 0 34%; margin: 0; font-size: 12.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
.te-review-row dd { flex: 1; margin: 0; min-width: 0; font-size: 15px; font-weight: 600; color: var(--ink); overflow-wrap: anywhere; }
.te-finish-login { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }

.te-login { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: var(--plum); }
.te-login:hover { color: var(--plum-deep); text-decoration: underline; }

/* Device frame (adapted from LivePreview) */
.te-device {
    width: 100%; max-width: 452px; margin: 0 auto; padding: 12px 12px 16px;
    background: linear-gradient(160deg, #f5f4fb 0%, #e8e6f4 100%);
    border-radius: 46px;
    box-shadow: 0 34px 80px -34px rgba(74,59,196,0.5), 0 0 0 1px rgba(74,59,196,0.07), inset 0 1px 0 rgba(255,255,255,0.8);
}
.te-device.is-compact { max-width: 300px; }
.te-speaker { display: block; width: 46px; height: 5px; border-radius: 999px; background: rgba(30,26,51,0.18); margin: 2px auto 10px; }
.te-screen {
    width: 100%; height: min(72vh, 780px); overflow-y: auto; overflow-x: hidden;
    border-radius: 34px; border: 1px solid var(--line); background: #fff;
}
.te-device.is-compact .te-screen { height: min(56vh, 560px); }

/* ---------- Full-card preview overlay ---------- */
.tp-fs { position: fixed; inset: 0; z-index: 200; background: #fff; display: flex; flex-direction: column; }
.tp-fs-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; padding-bottom: 96px; }
.tp-fs-close {
    position: fixed; top: 14px; right: 14px; z-index: 220; width: 42px; height: 42px; border-radius: 50%;
    border: 0; cursor: pointer; display: grid; place-items: center; background: rgba(255,255,255,0.92);
    color: var(--plum); box-shadow: 0 8px 24px -8px rgba(0,0,0,0.5); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
}
.tp-fs-wm { position: fixed; inset: 0; z-index: 205; pointer-events: none; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.tp-fs-wm-band {
    width: 150%; text-align: center; padding: 12px 0;
    background: rgba(30, 26, 51, 0.5); color: rgba(255, 255, 255, 0.92);
    font-weight: 900; letter-spacing: 0.4em; text-transform: uppercase;
    font-size: clamp(22px, 7vw, 56px); white-space: nowrap;
    border-top: 2px solid rgba(255,255,255,0.55); border-bottom: 2px solid rgba(255,255,255,0.55);
    transform: rotate(-8deg); box-shadow: 0 10px 40px rgba(0,0,0,0.25);
}
.tp-fs-cta {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 230;
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0px));
    background: rgba(255,255,255,0.96); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    border-top: 1px solid var(--line); box-shadow: 0 -10px 30px -18px rgba(30,26,51,0.5);
}
.tp-fs-cta-txt { display: flex; flex-direction: column; min-width: 0; }
.tp-fs-cta-txt strong { font-size: 15px; color: var(--plum); }
.tp-fs-cta-txt span { font-size: 12.5px; color: var(--muted); line-height: 1.45; }
.tp-fs-cta-btns { display: flex; gap: 10px; flex: none; }
@media (max-width: 560px) {
    .tp-fs-cta { flex-direction: column; align-items: stretch; }
    .tp-fs-cta-btns { justify-content: stretch; }
    .tp-fs-cta-btns .btn { flex: 1; justify-content: center; }
}

/* ---------- Narrow tweaks ---------- */
@media (max-width: 520px) {
    .te-head-note { font-size: 11.5px; }
    .te-group { padding: 16px 14px; }
    .te-row { gap: 8px; }
}
`;
