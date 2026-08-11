// ============================================================
//  PortalKahwin — landing page.
//  Fully bilingual (BM / EN via LangContext), scroll-animated with
//  framer-motion, mobile-first responsive. All visuals are original
//  inline SVG / CSS — no external images, fonts or CDNs.
// ============================================================

import type { ComponentType } from 'react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion, MotionConfig } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
    CalendarHeart,
    Armchair,
    MapPin,
    Gift,
    BookHeart,
    Music,
    QrCode,
    Sparkles,
    HandHeart,
    Users,
    ShieldCheck,
    Palette,
    PenLine,
    Share2,
    ArrowRight,
    Check,
    Heart,
} from 'lucide-react';

import { SiteNav } from '../components/SiteNav';
import { CardShowcase } from '../components/CardShowcase';
import { useLang } from '../context/LangContext';

// ---------------------------------------------------------------------------
//  Types + copy (every visible string, in both languages)
// ---------------------------------------------------------------------------

type IconType = ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

interface Pair {
    title: string;
    desc: string;
}
interface Plan {
    badge: string;
    name: string;
    price: string;
    per?: string;
    tag?: string;
    blurb: string;
    features: string[];
    cta: string;
}
interface Copy {
    hero: { eyebrow: string; title: [string, string]; lead: string; ctaPrimary: string; ctaSecondary: string; note: string };
    card: { eyebrow: string; save: string; date: string; venue: string };
    emotion: { eyebrow: string; title: string; sub: string; points: Pair[] };
    features: { eyebrow: string; title: string; sub: string; items: Pair[] };
    how: { eyebrow: string; title: string; sub: string; steps: Pair[] };
    templates: { eyebrow: string; title: string; sub: string; cta: string; tags: [string, string, string] };
    pricing: { eyebrow: string; title: string; sub: string; free: Plan; premium: Plan; secure: string };
    footer: { tagline: string; nav: { templates: string; features: string; pricing: string }; madeWith: string; rights: string };
}

const YEAR = new Date().getFullYear();

const COPY: Record<'bm' | 'en', Copy> = {
    bm: {
        hero: {
            eyebrow: 'Kad Kahwin Digital · Malaysia',
            title: ['Jemputan Digital,', 'Disulam Dengan Rasa'],
            lead: 'Hasilkan kad jemputan yang halus dan bermakna dalam beberapa minit — lengkap dengan RSVP, atur cara majlis, lokasi Waze, salam kasih, buku doa dan susunan meja.',
            ctaPrimary: 'Cipta Kad Percuma',
            ctaSecondary: 'Teroka Rekaan',
            note: 'Tanpa kad kredit · Sedia dikongsi dalam beberapa minit',
        },
        card: { eyebrow: 'Walimatulurus', save: 'Simpan Tarikh', date: 'Sabtu, 12 Disember 2026', venue: 'Dewan Seri Melati' },
        emotion: {
            eyebrow: 'Lebih Daripada Sekadar Kad',
            title: 'Setiap jemputan membawa rasa yang ingin disampaikan',
            sub: 'Di sebalik sebuah majlis, ada niat yang tulus dan doa yang panjang. Kami bantu undangan itu sampai dengan bahasa yang lembut, rapi dan dekat di hati.',
            points: [
                { title: 'Undangan yang bersopan', desc: 'Susunan kata dan rekaan yang santun, sesuai untuk keluarga, sahabat dan tetamu yang dimuliakan.' },
                { title: 'Tetamu terasa diraikan', desc: 'Animasi lembut, lagu latar dan sentuhan peribadi membuat jemputan terasa mesra sejak mula dibuka.' },
                { title: 'Hati lebih lapang', desc: 'RSVP, senarai tetamu dan susunan meja terletak di satu ruang — kurang gelisah, lebih banyak ruang untuk menikmati hari bahagia.' },
            ],
        },
        features: {
            eyebrow: 'Segalanya Di Satu Tempat',
            title: 'Ciri Pilihan Untuk Majlis Anda',
            sub: 'Urus jemputan moden dengan tenang — daripada RSVP hingga susunan meja, tanpa perlu bertukar-tukar aplikasi.',
            items: [
                { title: 'RSVP Mudah', desc: 'Tetamu mengesahkan kehadiran dengan satu sentuhan sahaja.' },
                { title: 'Susunan Meja', desc: 'Agihkan tempat duduk secara automatik dan ubah semula bila-bila masa.' },
                { title: 'Lokasi Waze & Maps', desc: 'Bawa tetamu terus ke lokasi majlis melalui Waze atau Google Maps.' },
                { title: 'Salam Kasih', desc: 'Terima sumbangan terus ke akaun atau melalui DuitNow QR dengan tertib.' },
                { title: 'Buku Doa', desc: 'Ucapan dan doa tetamu tersusun indah sebagai kenangan.' },
                { title: 'Lagu Latar', desc: 'Iringi jemputan dengan melodi lembut yang menyentuh suasana.' },
                { title: 'Daftar Masuk QR', desc: 'Urus kehadiran tetamu pada hari majlis melalui imbasan QR.' },
                { title: 'Rekaan Bernyawa', desc: 'Gerak halus dan suasana visual membuat jemputan terasa hidup.' },
            ],
        },
        how: {
            eyebrow: 'Mudah & Tersusun',
            title: 'Dari Niat Ke Jemputan',
            sub: 'Tiga langkah ringkas untuk menukar idea majlis menjadi kad yang sedia dikongsi.',
            steps: [
                { title: 'Pilih rekaan', desc: 'Pilih templat yang kena dengan jiwa majlis, kemudian sesuaikan warnanya mengikut tema.' },
                { title: 'Lengkapkan butiran', desc: 'Masukkan nama, tarikh, lokasi dan atur cara — semuanya kemas dalam beberapa minit.' },
                { title: 'Kongsi dan pantau', desc: 'Hantar pautan kepada tetamu, terima RSVP dan lihat kehadiran dikemas kini secara langsung.' },
            ],
        },
        templates: {
            eyebrow: 'Koleksi Rekaan',
            title: 'Kad yang bergerak lembut, bukan sekadar paparan statik',
            sub: 'Floral, tirai sinematik, khat bernafaskan Islam dan songket Melayu — setiap satu boleh diwarnakan semula mengikut cita rasa anda.',
            cta: 'Teroka Rekaan',
            tags: ['Floral', 'Tirai Sinematik', 'Songket'],
        },
        pricing: {
            eyebrow: 'Harga Yang Jelas',
            title: 'Pilih Pelan Yang Secocok',
            sub: 'Mulakan secara percuma. Naik taraf hanya apabila majlis anda perlukan ruang dan ciri yang lebih lengkap.',
            free: {
                badge: 'Percuma',
                name: 'Pelan Percuma',
                price: 'RM0',
                blurb: 'Sesuai untuk memulakan kad pertama dengan ringkas dan cantik.',
                features: ['1 kad kahwin', 'Rekaan Floral percuma', 'RSVP & buku doa', 'Kira detik menuju hari bahagia'],
                cta: 'Mula Sekarang',
            },
            premium: {
                badge: 'Premium',
                name: 'Pelan Premium',
                price: 'RM59',
                per: '/ kad',
                tag: 'Paling Popular',
                blurb: 'Untuk majlis yang mahukan pengalaman jemputan yang lengkap dan berkesan.',
                features: ['Semua rekaan premium', 'Susunan meja + agihan automatik', 'Daftar masuk QR & Salam Kasih', 'Lagu latar & galeri penuh', 'Tanpa tanda air'],
                cta: 'Naik Taraf',
            },
            secure: 'Pembayaran selamat melalui ToyyibPay (FPX & e-Wallet)',
        },
        footer: {
            tagline: 'Kad kahwin digital Malaysia, disiapkan dengan rasa.',
            nav: { templates: 'Rekaan', features: 'Keistimewaan', pricing: 'Harga' },
            madeWith: 'Dibina dengan sepenuh hati di Malaysia',
            rights: `© ${YEAR} PortalKahwin. Hak cipta terpelihara.`,
        },
    },
    en: {
        hero: {
            eyebrow: 'Digital Wedding Cards · Malaysia',
            title: ['Wedding invitations,', 'made with heart'],
            lead: 'Craft an elegant digital wedding card in minutes — with RSVP, run-of-show, Waze location, cash gifts, a guestbook and smart seating.',
            ctaPrimary: 'Create your free card',
            ctaSecondary: 'Browse templates',
            note: 'No credit card · Ready in minutes',
        },
        card: { eyebrow: 'The Wedding Of', save: 'Save the date', date: 'Saturday, 12 December 2026', venue: 'Dewan Seri Melati' },
        emotion: {
            eyebrow: 'More than just a card',
            title: 'Every invitation carries a feeling',
            sub: 'Behind every celebration is a heartfelt intention. We help you send that invitation in the way that touches people most.',
            points: [
                { title: 'Invite with grace', desc: 'Refined wording and design that feels right for family and honoured guests.' },
                { title: 'Make guests feel close', desc: 'Soft animation, background music and personal touches that make everyone feel welcome.' },
                { title: 'Peace of mind before the big day', desc: 'RSVPs, guest lists and seating all in one place — less worry, more presence.' },
            ],
        },
        features: {
            eyebrow: 'Everything in one portal',
            title: 'Key Features',
            sub: 'Everything you need to host a modern wedding — without ever switching apps.',
            items: [
                { title: 'Smart RSVP', desc: 'Guests confirm their attendance in a single tap.' },
                { title: 'Seating Planner', desc: 'Auto-assign seats and rearrange them anytime.' },
                { title: 'Waze & Maps', desc: 'One tap straight to Waze or Google Maps.' },
                { title: 'Cash Gifts', desc: 'Receive gifts straight to your account or DuitNow QR.' },
                { title: 'Guestbook', desc: "Guests' wishes and prayers, beautifully displayed." },
                { title: 'Background Music', desc: 'A gentle melody to accompany every moment.' },
                { title: 'QR Check-in', desc: 'Fast guest check-in with a quick QR scan.' },
                { title: 'Animated Templates', desc: 'Living designs with captivating animation.' },
            ],
        },
        how: {
            eyebrow: 'Simple & fast',
            title: 'How It Works',
            sub: 'Just three steps from idea to a card that is ready to share.',
            steps: [
                { title: 'Choose a template', desc: 'Pick a design you love and recolour it to match your theme.' },
                { title: 'Fill in your details', desc: 'Add names, date, location and the run-of-show — done in minutes.' },
                { title: 'Share & collect RSVPs', desc: 'Send the link to guests and track attendance in real time.' },
            ],
        },
        templates: {
            eyebrow: 'Template collection',
            title: 'Designs that feel alive, not static',
            sub: 'Floral, cinematic curtains, Islamic calligraphy and traditional songket — every one fully recolourable to your taste.',
            cta: 'Browse templates',
            tags: ['Floral', 'Cinematic Curtains', 'Songket'],
        },
        pricing: {
            eyebrow: 'Transparent pricing',
            title: 'Simple pricing',
            sub: 'Start free. Upgrade only when you need more.',
            free: {
                badge: 'Free',
                name: 'Free plan',
                price: 'RM0',
                blurb: 'Perfect for building your very first card.',
                features: ['1 wedding card', 'Free Floral template', 'RSVP & guestbook', 'Countdown to the big day'],
                cta: 'Get started',
            },
            premium: {
                badge: 'Premium',
                name: 'Premium plan',
                price: 'RM59',
                per: '/ card',
                tag: 'Most popular',
                blurb: 'For celebrations that want the full experience.',
                features: ['All premium templates', 'Seating planner + auto-assign', 'QR check-in & cash gifts', 'Background music & full gallery', 'No watermark'],
                cta: 'Upgrade',
            },
            secure: 'Secure payment via ToyyibPay (FPX & e-Wallet)',
        },
        footer: {
            tagline: 'Malaysian digital wedding cards, made with heart.',
            nav: { templates: 'Templates', features: 'Features', pricing: 'Pricing' },
            madeWith: 'Made with heart in Malaysia',
            rights: `© ${YEAR} PortalKahwin. All rights reserved.`,
        },
    },
};

// icons kept out of the copy (language-independent)
const FEATURE_ICONS: IconType[] = [CalendarHeart, Armchair, MapPin, Gift, BookHeart, Music, QrCode, Sparkles];
const EMOTION_ICONS: IconType[] = [HandHeart, Users, ShieldCheck];
const STEP_ICONS: IconType[] = [Palette, PenLine, Share2];

// ---------------------------------------------------------------------------
//  Motion helpers
// ---------------------------------------------------------------------------

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } } };
const rise: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };
const VIEWPORT = { once: true, amount: 0.25 } as const;

// ---------------------------------------------------------------------------
//  Small original ornaments
// ---------------------------------------------------------------------------

const LEAF_PATH = 'M0 0 C 7 -10 7 -26 0 -38 C -7 -26 -7 -10 0 0 Z';

/** Centred line-leaf-diamond divider used under section headings. */
function Ornament({ width = 172 }: { width?: number }) {
    return (
        <svg viewBox="0 0 180 20" width={width} height={20} aria-hidden="true" style={{ display: 'block', margin: '16px auto 0', maxWidth: '70%' }}>
            <line x1="20" y1="10" x2="78" y2="10" stroke="var(--gold)" strokeWidth={1.2} />
            <line x1="102" y1="10" x2="160" y2="10" stroke="var(--gold)" strokeWidth={1.2} />
            <g transform="translate(83 10) rotate(-24) scale(0.5)">
                <path d={LEAF_PATH} fill="#7f8f5f" />
            </g>
            <g transform="translate(97 10) rotate(24) scale(0.5)">
                <path d={LEAF_PATH} fill="#7f8f5f" />
            </g>
            <rect x="86" y="5" width="9" height="9" transform="rotate(45 90.5 9.5)" fill="var(--gold)" />
        </svg>
    );
}

/** Corner leafy sprig used as a soft section accent. */
function Sprig({ size = 130, opacity = 0.5 }: { size?: number; opacity?: number }) {
    const leaves = [
        { x: 20, y: 118, r: -40, s: 0.8 },
        { x: 30, y: 96, r: -28, s: 0.9 },
        { x: 40, y: 72, r: -14, s: 1 },
        { x: 48, y: 44, r: 0, s: 0.9 },
        { x: 26, y: 106, r: -118, s: 0.55 },
        { x: 44, y: 60, r: -100, s: 0.55 },
    ];
    return (
        <svg viewBox="0 0 130 130" width={size} height={size} aria-hidden="true" style={{ display: 'block', opacity, overflow: 'visible' }}>
            <path d="M8 126 C 30 100 44 70 50 26" fill="none" stroke="var(--gold)" strokeWidth={1.6} strokeLinecap="round" />
            {leaves.map((l, i) => (
                <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}>
                    <path d={LEAF_PATH} fill={i % 2 ? '#8a9b6a' : '#647249'} />
                </g>
            ))}
            <g transform="translate(50 20)">
                {[0, 60, 120, 180, 240, 300].map((a) => (
                    <g key={a} transform={`rotate(${a})`}>
                        <ellipse cx={0} cy={-7} rx={4.6} ry={8} fill="#b56576" />
                    </g>
                ))}
                <circle r={4.4} fill="var(--gold)" />
            </g>
        </svg>
    );
}

// ---------------------------------------------------------------------------
//  Section heading
// ---------------------------------------------------------------------------

function SectionHead({ eyebrow, title, sub, invert = false }: { eyebrow: string; title: string; sub: string; invert?: boolean }) {
    return (
        <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
            style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto clamp(38px, 5vw, 58px)' }}
        >
            <motion.div
                variants={rise}
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                }}
            >
                {eyebrow}
            </motion.div>
            <motion.h2
                variants={rise}
                style={{ fontSize: 'clamp(30px, 4.6vw, 46px)', lineHeight: 1.1, margin: '12px 0 0', color: invert ? '#fff' : 'var(--ink)' }}
            >
                {title}
            </motion.h2>
            <motion.div variants={rise}>
                <Ornament />
            </motion.div>
            <motion.p
                variants={rise}
                style={{ margin: '18px auto 0', maxWidth: 560, fontSize: 'clamp(15px, 2vw, 17px)', lineHeight: 1.7, color: invert ? 'rgba(255,255,255,0.72)' : 'var(--muted)' }}
            >
                {sub}
            </motion.p>
        </motion.div>
    );
}

// ---------------------------------------------------------------------------
//  Mini template teaser cards
// ---------------------------------------------------------------------------

function MiniTemplate({ motif, label }: { motif: 'floral' | 'curtain' | 'songket'; label: string }) {
    return (
        <div
            style={{
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid rgba(230,211,163,0.35)',
                aspectRatio: '3 / 4',
                boxShadow: '0 24px 50px -26px rgba(0,0,0,0.55)',
                background: motif === 'floral' ? 'linear-gradient(160deg, #f6efe3, #efe3cf)' : 'linear-gradient(160deg, #5b2a45, #3d1a30)',
            }}
        >
            <svg viewBox="0 0 120 160" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', position: 'absolute', inset: 0 }}>
                {/* frame */}
                <rect x="8" y="8" width="104" height="144" rx="8" fill="none" stroke="#c9a24b" strokeWidth="1" opacity={0.7} />

                {motif === 'floral' && (
                    <g>
                        {[0, 60, 120, 180, 240, 300].map((a) => (
                            <g key={a} transform={`translate(60 46) rotate(${a})`}>
                                <ellipse cx={0} cy={-11} rx={7} ry={12} fill={a % 120 === 0 ? '#b56576' : '#c9a24b'} opacity={0.9} />
                            </g>
                        ))}
                        <circle cx="60" cy="46" r="7" fill="#8f4a5b" />
                        <line x1="34" y1="96" x2="86" y2="96" stroke="#c9a24b" strokeWidth="1.4" />
                        <line x1="42" y1="112" x2="78" y2="112" stroke="#5b2a45" strokeWidth="2" opacity={0.5} />
                        <rect x="56" y="126" width="8" height="8" transform="rotate(45 60 130)" fill="#c9a24b" />
                    </g>
                )}

                {motif === 'curtain' && (
                    <g>
                        <rect x="8" y="8" width="52" height="144" fill="rgba(0,0,0,0.16)" />
                        <line x1="60" y1="8" x2="60" y2="152" stroke="#c9a24b" strokeWidth="1.4" opacity={0.8} />
                        <line x1="34" y1="8" x2="34" y2="152" stroke="#c9a24b" strokeWidth="0.7" opacity={0.4} />
                        <line x1="86" y1="8" x2="86" y2="152" stroke="#c9a24b" strokeWidth="0.7" opacity={0.4} />
                        <circle cx="60" cy="80" r="16" fill="#c9a24b" />
                        <text x="60" y="90" textAnchor="middle" fontFamily="var(--serif)" fontStyle="italic" fontSize="20" fill="#3d1a30">
                            &amp;
                        </text>
                    </g>
                )}

                {motif === 'songket' && (
                    <g stroke="#c9a24b" strokeWidth="0.8" opacity={0.75} fill="none">
                        {[36, 60, 84, 108, 132].map((cy) =>
                            [24, 48, 72, 96].map((cx) => (
                                <rect key={`${cx}-${cy}`} x={cx - 6} y={cy - 6} width="12" height="12" transform={`rotate(45 ${cx} ${cy})`} />
                            )),
                        )}
                        <line x1="8" y1="24" x2="112" y2="24" />
                        <line x1="8" y1="136" x2="112" y2="136" />
                    </g>
                )}
            </svg>

            <span
                style={{
                    position: 'absolute',
                    left: 12,
                    bottom: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    padding: '5px 11px',
                    borderRadius: 999,
                    background: 'rgba(251,247,241,0.92)',
                    color: 'var(--plum)',
                }}
            >
                {label}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
//  Page
// ---------------------------------------------------------------------------

export function Landing() {
    const { lang } = useLang();
    const C = COPY[lang];
    const reduce = useReducedMotion() ?? false;

    const rootRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll();
    const driftUpMv = useTransform(scrollYProgress, [0, 1], [50, -50]);
    const driftDownMv = useTransform(scrollYProgress, [0, 1], [-40, 40]);
    const driftUp = reduce ? 0 : driftUpMv;
    const driftDown = reduce ? 0 : driftDownMv;

    const btnIcon = <ArrowRight size={16} />;

    return (
        <MotionConfig reducedMotion="user">
            <div ref={rootRef} style={{ overflowX: 'hidden' }}>
                <SiteNav />

                {/* ============================ HERO ============================ */}
                <header
                    style={{
                        position: 'relative',
                        overflow: 'hidden',
                        padding: 'clamp(44px, 6vw, 88px) 0 clamp(56px, 8vw, 104px)',
                        background: 'radial-gradient(1200px 520px at 50% -12%, #fff5e8 0%, var(--ivory) 58%)',
                    }}
                >
                    {/* soft parallax accents */}
                    <motion.div aria-hidden="true" style={{ position: 'absolute', top: -10, left: -30, y: driftUp, pointerEvents: 'none' }}>
                        <Sprig size={190} opacity={0.28} />
                    </motion.div>
                    <motion.div
                        aria-hidden="true"
                        style={{ position: 'absolute', bottom: -20, right: -30, scaleX: -1, scaleY: -1, y: driftDown, pointerEvents: 'none' }}
                    >
                        <Sprig size={210} opacity={0.24} />
                    </motion.div>

                    <div
                        className="container"
                        style={{
                            position: 'relative',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(288px, 1fr))',
                            gap: 'clamp(34px, 5vw, 64px)',
                            alignItems: 'center',
                        }}
                    >
                        {/* copy */}
                        <motion.div variants={stagger} initial="hidden" animate="show">
                            <motion.div
                                variants={rise}
                                className="badge badge-gold"
                                style={{ fontSize: 12, letterSpacing: '0.06em' }}
                            >
                                <Sparkles size={13} /> {C.hero.eyebrow}
                            </motion.div>

                            <motion.h1
                                variants={rise}
                                style={{ fontSize: 'clamp(38px, 6.4vw, 68px)', lineHeight: 1.03, margin: '18px 0 0', color: 'var(--ink)' }}
                            >
                                {C.hero.title[0]}
                                <br />
                                <span style={{ color: 'var(--plum)' }}>{C.hero.title[1]}</span>
                            </motion.h1>

                            <motion.p
                                variants={rise}
                                style={{ margin: '20px 0 0', maxWidth: 520, fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.7, color: 'var(--muted)' }}
                            >
                                {C.hero.lead}
                            </motion.p>

                            <motion.div variants={rise} className="row wrap" style={{ marginTop: 28, gap: 12 }}>
                                <Link to="/register" className="btn btn-primary" style={{ padding: '13px 24px', fontSize: 15 }}>
                                    {C.hero.ctaPrimary} {btnIcon}
                                </Link>
                                <Link to="/templates" className="btn btn-ghost" style={{ padding: '13px 24px', fontSize: 15 }}>
                                    {C.hero.ctaSecondary}
                                </Link>
                            </motion.div>

                            <motion.p variants={rise} className="muted" style={{ marginTop: 16, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                <ShieldCheck size={14} /> {C.hero.note}
                            </motion.p>
                        </motion.div>

                        {/* animated card */}
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '18px 6px 6px' }}>
                            <CardShowcase eyebrow={C.card.eyebrow} save={C.card.save} date={C.card.date} venue={C.card.venue} />
                        </div>
                    </div>
                </header>

                {/* ========================== EMOTION ========================== */}
                <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--cream)', padding: 'clamp(64px, 9vw, 108px) 0' }}>
                    <div className="container">
                        <SectionHead eyebrow={C.emotion.eyebrow} title={C.emotion.title} sub={C.emotion.sub} />
                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            whileInView="show"
                            viewport={VIEWPORT}
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(248px, 1fr))', gap: 'clamp(16px, 2.4vw, 26px)' }}
                        >
                            {C.emotion.points.map((p, i) => {
                                const Icon = EMOTION_ICONS[i];
                                return (
                                    <motion.div
                                        key={p.title}
                                        variants={rise}
                                        style={{
                                            background: '#fff',
                                            border: '1px solid var(--line)',
                                            borderRadius: 'var(--radius)',
                                            padding: 'clamp(24px, 3vw, 32px)',
                                            textAlign: 'center',
                                            boxShadow: '0 20px 44px -30px rgba(61,26,48,0.4)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'inline-grid',
                                                placeItems: 'center',
                                                width: 58,
                                                height: 58,
                                                borderRadius: '50%',
                                                background: 'radial-gradient(circle at 30% 25%, #fff, var(--cream))',
                                                border: '1px solid var(--gold-soft)',
                                                color: 'var(--plum)',
                                                marginBottom: 16,
                                            }}
                                        >
                                            <Icon size={24} />
                                        </span>
                                        <h3 style={{ fontSize: 'clamp(20px, 2.6vw, 24px)', margin: 0, color: 'var(--plum)' }}>{p.title}</h3>
                                        <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>{p.desc}</p>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                </section>

                {/* ========================== FEATURES ========================= */}
                <section id="features" style={{ background: 'var(--ivory)', padding: 'clamp(64px, 9vw, 108px) 0' }}>
                    <div className="container">
                        <SectionHead eyebrow={C.features.eyebrow} title={C.features.title} sub={C.features.sub} />
                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, amount: 0.1 }}
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 'clamp(14px, 2vw, 20px)' }}
                        >
                            {C.features.items.map((f, i) => {
                                const Icon = FEATURE_ICONS[i];
                                return (
                                    <motion.div
                                        key={f.title}
                                        variants={rise}
                                        whileHover={reduce ? undefined : { y: -6 }}
                                        transition={{ duration: 0.25, ease: EASE }}
                                        style={{
                                            position: 'relative',
                                            background: '#fff',
                                            border: '1px solid var(--line)',
                                            borderRadius: 'var(--radius)',
                                            padding: 'clamp(22px, 2.6vw, 28px)',
                                            boxShadow: '0 14px 40px -32px rgba(61,26,48,0.5)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'grid',
                                                placeItems: 'center',
                                                width: 48,
                                                height: 48,
                                                borderRadius: 14,
                                                background: 'linear-gradient(140deg, var(--cream), #fff)',
                                                border: '1px solid var(--gold-soft)',
                                                color: 'var(--plum)',
                                                marginBottom: 16,
                                            }}
                                        >
                                            <Icon size={22} />
                                        </span>
                                        <h3 style={{ fontSize: 21, margin: '0 0 6px', color: 'var(--ink)' }}>{f.title}</h3>
                                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--muted)' }}>{f.desc}</p>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                </section>

                {/* ======================== HOW IT WORKS ======================= */}
                <section style={{ background: 'var(--cream)', padding: 'clamp(64px, 9vw, 108px) 0' }}>
                    <div className="container">
                        <SectionHead eyebrow={C.how.eyebrow} title={C.how.title} sub={C.how.sub} />
                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            whileInView="show"
                            viewport={VIEWPORT}
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'clamp(16px, 2.4vw, 26px)' }}
                        >
                            {C.how.steps.map((s, i) => {
                                const Icon = STEP_ICONS[i];
                                return (
                                    <motion.div
                                        key={s.title}
                                        variants={rise}
                                        style={{
                                            position: 'relative',
                                            background: '#fff',
                                            border: '1px solid var(--line)',
                                            borderRadius: 'var(--radius)',
                                            padding: 'clamp(26px, 3vw, 34px)',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                position: 'absolute',
                                                top: 6,
                                                right: 14,
                                                fontFamily: 'var(--serif)',
                                                fontSize: 96,
                                                fontWeight: 700,
                                                lineHeight: 1,
                                                color: 'var(--cream)',
                                            }}
                                        >
                                            {i + 1}
                                        </span>
                                        <span
                                            style={{
                                                position: 'relative',
                                                display: 'grid',
                                                placeItems: 'center',
                                                width: 52,
                                                height: 52,
                                                borderRadius: 14,
                                                background: 'var(--plum)',
                                                color: '#fff',
                                                marginBottom: 18,
                                            }}
                                        >
                                            <Icon size={23} />
                                        </span>
                                        <div
                                            style={{
                                                position: 'relative',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                letterSpacing: '0.2em',
                                                textTransform: 'uppercase',
                                                color: 'var(--gold)',
                                            }}
                                        >
                                            {String(i + 1).padStart(2, '0')}
                                        </div>
                                        <h3 style={{ position: 'relative', fontSize: 'clamp(21px, 2.6vw, 25px)', margin: '4px 0 8px', color: 'var(--plum)' }}>{s.title}</h3>
                                        <p style={{ position: 'relative', margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>{s.desc}</p>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                </section>

                {/* ========================= TEMPLATES ========================= */}
                <section style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, var(--plum) 0%, var(--plum-deep) 100%)', padding: 'clamp(64px, 9vw, 112px) 0' }}>
                    <motion.div aria-hidden="true" style={{ position: 'absolute', top: -30, left: -20, y: driftDown, opacity: 0.5, pointerEvents: 'none' }}>
                        <Sprig size={190} opacity={0.4} />
                    </motion.div>
                    <div className="container" style={{ position: 'relative' }}>
                        <SectionHead eyebrow={C.templates.eyebrow} title={C.templates.title} sub={C.templates.sub} invert />

                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            whileInView="show"
                            viewport={VIEWPORT}
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'clamp(16px, 2.6vw, 26px)', maxWidth: 760, margin: '0 auto' }}
                        >
                            {(['floral', 'curtain', 'songket'] as const).map((motif, i) => (
                                <motion.div key={motif} variants={rise} whileHover={reduce ? undefined : { y: -8 }} transition={{ duration: 0.28, ease: EASE }}>
                                    <Link to="/templates" aria-label={C.templates.tags[i]}>
                                        <MiniTemplate motif={motif} label={C.templates.tags[i]} />
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={reduce ? false : { opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={VIEWPORT}
                            transition={{ duration: 0.6, ease: EASE }}
                            style={{ textAlign: 'center', marginTop: 'clamp(30px, 4vw, 44px)' }}
                        >
                            <Link to="/templates" className="btn btn-gold" style={{ padding: '13px 26px', fontSize: 15 }}>
                                {C.templates.cta} {btnIcon}
                            </Link>
                        </motion.div>
                    </div>
                </section>

                {/* ========================== PRICING ========================== */}
                <section id="pricing" style={{ background: 'var(--ivory)', padding: 'clamp(64px, 9vw, 108px) 0' }}>
                    <div className="container">
                        <SectionHead eyebrow={C.pricing.eyebrow} title={C.pricing.title} sub={C.pricing.sub} />

                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            whileInView="show"
                            viewport={VIEWPORT}
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(272px, 1fr))', gap: 'clamp(18px, 2.6vw, 26px)', maxWidth: 780, margin: '0 auto' }}
                        >
                            <PricingCard plan={C.pricing.free} highlight={false} />
                            <PricingCard plan={C.pricing.premium} highlight />
                        </motion.div>

                        <p className="center muted" style={{ marginTop: 26, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                            <ShieldCheck size={15} /> {C.pricing.secure}
                        </p>
                    </div>
                </section>

                {/* =========================== FOOTER ========================== */}
                <footer style={{ position: 'relative', overflow: 'hidden', background: 'var(--plum-deep)', color: '#e7d4c8', padding: 'clamp(52px, 7vw, 76px) 0 44px' }}>
                    <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                            <Ornament width={150} />
                        </div>
                        <div className="brand" style={{ color: '#fff', justifyContent: 'center', fontSize: 30 }}>
                            Portal<span style={{ color: 'var(--gold)' }}>Kahwin</span>
                        </div>
                        <p style={{ margin: '10px auto 0', maxWidth: 420, fontSize: 15, lineHeight: 1.6, opacity: 0.82 }}>{C.footer.tagline}</p>

                        <nav className="row wrap" style={{ justifyContent: 'center', gap: 22, margin: '24px 0 4px' }}>
                            <Link to="/templates" style={{ opacity: 0.85, fontSize: 14 }}>
                                {C.footer.nav.templates}
                            </Link>
                            <a href="/#features" style={{ opacity: 0.85, fontSize: 14 }}>
                                {C.footer.nav.features}
                            </a>
                            <a href="/#pricing" style={{ opacity: 0.85, fontSize: 14 }}>
                                {C.footer.nav.pricing}
                            </a>
                            <Link to="/register" style={{ opacity: 0.85, fontSize: 14, color: 'var(--gold)', fontWeight: 600 }}>
                                {C.hero.ctaPrimary}
                            </Link>
                        </nav>

                        <div
                            style={{
                                marginTop: 22,
                                paddingTop: 20,
                                borderTop: '1px solid rgba(255,255,255,0.12)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 10,
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12.5,
                                opacity: 0.7,
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                {C.footer.madeWith}
                                <Heart size={13} color="var(--rose)" fill="var(--rose)" />
                            </span>
                            <span aria-hidden="true" style={{ opacity: 0.5 }}>
                                ·
                            </span>
                            <span>{C.footer.rights}</span>
                        </div>
                    </div>
                </footer>
            </div>
        </MotionConfig>
    );
}

// ---------------------------------------------------------------------------
//  Pricing card
// ---------------------------------------------------------------------------

function PricingCard({ plan, highlight }: { plan: Plan; highlight: boolean }) {
    return (
        <motion.div
            variants={rise}
            style={{
                position: 'relative',
                background: '#fff',
                border: highlight ? '1.5px solid var(--gold)' : '1px solid var(--line)',
                borderRadius: 20,
                padding: 'clamp(26px, 3vw, 34px)',
                boxShadow: highlight ? '0 34px 70px -34px rgba(61,26,48,0.55)' : '0 16px 44px -34px rgba(61,26,48,0.4)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {highlight && plan.tag && (
                <span
                    style={{
                        position: 'absolute',
                        top: -13,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '5px 14px',
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, var(--gold), #b98a2f)',
                        color: '#241a06',
                        boxShadow: '0 8px 18px -8px rgba(185,138,47,0.7)',
                    }}
                >
                    <Sparkles size={13} /> {plan.tag}
                </span>
            )}

            <span className={highlight ? 'badge badge-gold' : 'badge badge-free'}>{plan.badge}</span>

            <div style={{ margin: '16px 0 2px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 700, color: 'var(--plum)', lineHeight: 1 }}>{plan.price}</span>
                {plan.per && <span style={{ fontSize: 15, color: 'var(--muted)' }}>{plan.per}</span>}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.55 }}>{plan.blurb}</p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 24px', display: 'grid', gap: 11, flex: 1 }}>
                {plan.features.map((feat) => (
                    <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14.5, color: 'var(--ink)' }}>
                        <span
                            style={{
                                flex: '0 0 auto',
                                display: 'grid',
                                placeItems: 'center',
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: highlight ? 'linear-gradient(135deg, var(--gold), #b98a2f)' : 'var(--cream)',
                                color: highlight ? '#241a06' : 'var(--plum)',
                                marginTop: 1,
                            }}
                        >
                            <Check size={13} strokeWidth={3} />
                        </span>
                        {feat}
                    </li>
                ))}
            </ul>

            <Link to="/register" className={highlight ? 'btn btn-gold btn-block' : 'btn btn-ghost btn-block'}>
                {plan.cta}
            </Link>
        </motion.div>
    );
}
