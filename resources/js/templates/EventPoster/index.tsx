import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Calendar, Clock, MapPin, Navigation, Phone, Ticket, ChevronDown, Sparkles } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { useLang, dict } from '../../context/LangContext';
import { PkSec } from '../PkSec';
import { hexA } from '../templateArt';
import { resolveEventTheme, EventMotif, EventAmbient } from '../eventThemes';
import type { TemplateProps } from '../types';

/**
 * EventPoster — a bold, poster-forward template for NON-wedding events
 * (concerts, galas, seminars, launches). No couple, no bismillah, no gift:
 * it leads with the event name + poster, a lineup/agenda, when & where, and a
 * ticket CTA (pay-per-entry). Palette-driven so one component powers many
 * distinct designs. All motifs are CSS/inline-SVG — no network.
 */

// ---- colour helpers --------------------------------------------------------
function parseHex(hex: string): { r: number; g: number; b: number } {
    let h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h || '111319', 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
const lum = (hex: string) => { const { r, g, b } = parseHex(hex); return 0.299 * r + 0.587 * g + 0.114 * b; };
function mix(a: string, b: string, t: number): string {
    const A = parseHex(a), B = parseHex(b);
    const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
    return `#${c(A.r, B.r)}${c(A.g, B.g)}${c(A.b, B.b)}`;
}
const darken = (h: string, t: number) => mix(h, '#000000', t);
const lighten = (h: string, t: number) => mix(h, '#ffffff', t);

interface Countdown { days: number; hours: number; mins: number; secs: number }
function useCountdown(target?: string, paused?: boolean): Countdown | null {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!target || paused) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [target, paused]);
    if (!target) return null;
    const t = new Date(target).getTime();
    if (Number.isNaN(t)) return null;
    const d = Math.max(0, t - now);
    return { days: Math.floor(d / 864e5), hours: Math.floor((d % 864e5) / 36e5), mins: Math.floor((d % 36e5) / 6e4), secs: Math.floor((d % 6e4) / 1e3) };
}

export default function EventPosterTemplate({ data, preview, slots }: TemplateProps) {
    const { lang } = useLang();
    const reduce = useReducedMotion() ?? false;
    const cd = useCountdown(data.receptionAt, preview);

    const C = dict({
        bm: {
            presents: 'Anjuran', about: 'Mengenai Acara', info: 'Butiran Acara', lineup: 'Aturan Acara', when: 'Tarikh & Masa',
            where: 'Lokasi', tickets: 'Tiket & Kehadiran', gallery: 'Galeri', contact: 'Hubungi',
            getTickets: 'Dapatkan Tiket', scroll: 'Skrol', days: 'Hari', hours: 'Jam', mins: 'Minit', secs: 'Saat',
            countdown: 'Menuju Acara', madeWith: 'Direka dengan', ticketsNote: 'Sila lengkapkan kehadiran / tiket di bawah.',
        },
        en: {
            presents: 'Presented by', about: 'About the event', info: 'Event details', lineup: 'Line-up', when: 'Date & time',
            where: 'Location', tickets: 'Tickets & RSVP', gallery: 'Gallery', contact: 'Contact',
            getTickets: 'Get Tickets', scroll: 'Scroll', days: 'Days', hours: 'Hrs', mins: 'Min', secs: 'Sec',
            countdown: 'Counting down', madeWith: 'Made with', ticketsNote: 'Confirm your attendance / tickets below.',
        },
        zh: {
            presents: '主办', about: '活动介绍', info: '活动详情', lineup: '活动流程', when: '日期与时间',
            where: '地点', tickets: '门票与出席', gallery: '相册', contact: '联系',
            getTickets: '购票', scroll: '向下', days: '天', hours: '时', mins: '分', secs: '秒',
            countdown: '倒数中', madeWith: '设计工具', ticketsNote: '请在下方确认出席 / 购票。',
        },
    }, lang);

    // Theme engine: a per-template look (ground/ink/motif/effect/hero/font),
    // carried in the template config as `eventTheme`, palette overrides per colour.
    const T = resolveEventTheme(
        data.templateConfig?.eventTheme,
        data.palette as Record<string, string> | undefined,
    );
    const { ground, ink, inkSoft, accent, accent2, surface, line } = T;
    const spec = T.spec;

    const title = data.eventName || 'Nama Acara';
    // The poster reuses the shared cover upload when no dedicated poster is set.
    const poster = data.posterImage || data.coverImage;
    const hasPoster = !!poster;
    const hasProgram = !!(data.program && data.program.length);
    const hasVenue = !!(data.venueName || data.venueAddress);
    const hasMap = !!(data.mapsUrl || data.wazeUrl);
    const hasGallery = !!(data.galleryImages && data.galleryImages.length);
    const hasContacts = !!(data.contacts && data.contacts.length);
    const customFields = (data.customFields ?? []).filter((f) => f && f.label);

    const item = (delay = 0) => preview ? {} : {
        initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
    };
    const cover = (delay = 0) => preview ? {} : {
        initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
    };

    const rootStyle: CSSProperties = {
        position: 'relative', minHeight: '100%', color: ink, overflowX: 'hidden',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        backgroundColor: ground,
        backgroundImage: T.rootImage,
    };
    const DISPLAY = T.display;

    const section: CSSProperties = { position: 'relative', padding: '3.4rem 1.3rem', maxWidth: 760, margin: '0 auto', textAlign: 'center' };
    const eyebrow: CSSProperties = { textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '0.72rem', fontWeight: 700, color: accent };
    const h2: CSSProperties = { fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(1.7rem, 6.5vw, 2.6rem)', letterSpacing: '-0.02em', margin: '0.5rem 0 0', color: ink, lineHeight: 1.05 };
    const body: CSSProperties = { fontSize: 'clamp(1rem, 3.4vw, 1.12rem)', lineHeight: 1.75, color: inkSoft, margin: 0 };
    const btn: CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: '0.55rem', padding: '0.9rem 1.6rem',
        borderRadius: 999, background: `linear-gradient(120deg, ${accent}, ${accent2})`, color: '#0d0b12',
        fontWeight: 800, textDecoration: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem',
        boxShadow: `0 14px 34px ${hexA(accent, 0.4)}`,
    };
    const chip = (bg: string): CSSProperties => ({ display: 'inline-block', padding: '0.28rem 0.8rem', borderRadius: 999, background: hexA(bg, 0.16), color: bg, fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' });

    return (
        <div style={rootStyle}>
            {/* ============ COVER ============ */}
            <section style={{ minHeight: 'var(--pk-vh, 100vh)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3rem 1.25rem var(--pk-cue-clear, 96px)', position: 'relative' }}>
                {data.eventType && <motion.div {...cover(0.05)}><span style={chip(accent)}>{data.eventType}</span></motion.div>}

                {hasPoster && (
                    <motion.div {...cover(0.12)} style={{ margin: '1.3rem 0 0.4rem', width: '100%', maxWidth: 340 }}>
                        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: `1px solid ${hexA(accent, 0.5)}`, boxShadow: `0 26px 60px rgba(0,0,0,0.5), 0 0 0 1px ${hexA(ink, 0.05)}`, aspectRatio: '3 / 4' }}>
                            <img src={poster} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                    </motion.div>
                )}

                <motion.h1 {...cover(0.2)} style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 'clamp(2.6rem, 12vw, 5rem)', lineHeight: 0.98, letterSpacing: '-0.03em', margin: '1.3rem 0 0', textShadow: `0 2px 30px ${hexA(accent, 0.35)}`, background: `linear-gradient(120deg, ${ink}, ${lighten(accent, 0.35)})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                    {title}
                </motion.h1>

                {data.eventSubtitle && (
                    <motion.p {...cover(0.28)} style={{ ...body, maxWidth: 520, marginTop: '1rem', fontSize: 'clamp(1.05rem, 4vw, 1.25rem)' }}>{data.eventSubtitle}</motion.p>
                )}

                <motion.div {...cover(0.36)} style={{ display: 'flex', gap: '0.6rem 1.2rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.4rem', color: inkSoft, fontSize: '0.98rem' }}>
                    {data.dateLabel && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={17} style={{ color: accent }} /> {data.dateLabel}</span>}
                    {data.venueName && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={17} style={{ color: accent }} /> {data.venueName}</span>}
                </motion.div>

                <motion.div {...cover(0.46)} style={{ marginTop: '1.8rem' }}>
                    <a href="#tickets" style={btn}><Ticket size={19} /> {C.getTickets}</a>
                </motion.div>

                {data.organizer && (
                    <motion.div {...cover(0.54)} style={{ marginTop: '1.4rem', fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: inkSoft }}>
                        {C.presents} · <span style={{ color: ink, fontWeight: 700 }}>{data.organizer}</span>
                    </motion.div>
                )}

                {!preview && (
                    <motion.div style={{ position: 'absolute', bottom: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', color: accent, fontSize: '0.7rem', letterSpacing: '0.24em', textTransform: 'uppercase' }} animate={{ y: [0, 9, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
                        {C.scroll}<ChevronDown size={22} />
                    </motion.div>
                )}
            </section>

            {/* ============ ABOUT (intro) ============ */}
            {data.eventDescription && (
                <section style={section}>
                    <motion.div {...item(0)}><span style={eyebrow}>{C.about}</span></motion.div>
                    <motion.p {...item(0.08)} style={{ ...body, maxWidth: 620, margin: '1.2rem auto 0', whiteSpace: 'pre-line' }}>{data.eventDescription}</motion.p>
                </section>
            )}

            {/* ============ CUSTOM DETAILS (dress code, parking, RSVP-by …) ============ */}
            {customFields.length > 0 && (
                <section style={section}>
                    <motion.div {...item(0)}><span style={eyebrow}>{C.info}</span></motion.div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', maxWidth: 620, margin: '1.4rem auto 0' }}>
                        {customFields.map((f, i) => (
                            <motion.div key={`${f.label}-${i}`} {...item(i * 0.05)} style={{ padding: '1rem 1.1rem', borderRadius: 14, background: hexA(ink, 0.05), border: `1px solid ${hexA(accent, 0.2)}`, textAlign: 'left' }}>
                                <div style={{ fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, fontWeight: 700 }}>{f.label}</div>
                                {f.value && <div style={{ marginTop: '0.35rem', fontSize: '1.02rem', color: ink, whiteSpace: 'pre-line' }}>{f.value}</div>}
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Sections 5+ full render only. */}
            {!preview && (
                <>
                    {/* LINE-UP / AGENDA */}
                    <PkSec name="program">{hasProgram && (
                        <section style={section}>
                            <motion.div {...item(0)}><span style={eyebrow}>{C.lineup}</span></motion.div>
                            <div style={{ maxWidth: 520, margin: '1.4rem auto 0', textAlign: 'left', display: 'grid', gap: '0.7rem' }}>
                                {data.program!.map((p, i) => (
                                    <motion.div key={`${p.time}-${i}`} {...item(i * 0.05)} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', padding: '0.9rem 1.1rem', borderRadius: 14, background: hexA(ink, 0.05), border: `1px solid ${hexA(accent, 0.18)}` }}>
                                        <span style={{ color: accent, fontWeight: 800, fontFamily: DISPLAY, minWidth: 74, fontSize: '0.98rem' }}>{p.time}</span>
                                        <span style={{ fontWeight: 600 }}>{p.title}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}</PkSec>

                    {/* WHEN + COUNTDOWN */}
                    <section style={section}>
                        <motion.div {...item(0)}><span style={eyebrow}>{C.when}</span></motion.div>
                        {data.dateLabel && <motion.h3 {...item(0.06)} style={h2}>{data.dateLabel}</motion.h3>}
                        {data.timeLabel && <motion.p {...item(0.1)} style={{ ...body, marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} style={{ color: accent }} /> {data.timeLabel}</motion.p>}
                        {cd && (
                            <motion.div {...item(0.16)} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', maxWidth: 420, margin: '1.6rem auto 0' }}>
                                {[[cd.days, C.days], [cd.hours, C.hours], [cd.mins, C.mins], [cd.secs, C.secs]].map(([v, l], i) => (
                                    <div key={i} style={{ padding: '0.9rem 0.3rem', borderRadius: 14, background: hexA(ink, 0.06), border: `1px solid ${hexA(accent, 0.22)}` }}>
                                        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(1.6rem, 7vw, 2.2rem)', color: ink, lineHeight: 1 }}>{i === 0 ? v : String(v).padStart(2, '0')}</div>
                                        <div style={{ marginTop: '0.3rem', fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: accent }}>{l}</div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </section>

                    {/* WHERE */}
                    <PkSec name="location">{hasVenue && (
                        <section style={section}>
                            <motion.div {...item(0)}><span style={eyebrow}>{C.where}</span></motion.div>
                            {data.venueName && <motion.h3 {...item(0.06)} style={h2}>{data.venueName}</motion.h3>}
                            {data.venueAddress && <motion.p {...item(0.1)} style={{ ...body, maxWidth: 480, margin: '0.7rem auto 0' }}>{data.venueAddress}</motion.p>}
                            {hasMap && (
                                <motion.div {...item(0.16)} style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.4rem' }}>
                                    {data.mapsUrl && <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'transparent', color: accent, border: `1px solid ${accent}`, boxShadow: 'none' }}><MapPin size={18} /> Google Maps</a>}
                                    {data.wazeUrl && <a href={data.wazeUrl} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: 'transparent', color: accent, border: `1px solid ${accent}`, boxShadow: 'none' }}><Navigation size={18} /> Waze</a>}
                                </motion.div>
                            )}
                        </section>
                    )}</PkSec>

                    {/* TICKETS / RSVP */}
                    <PkSec name="rsvp"><section id="tickets" style={section}>
                        <motion.div {...item(0)}><span style={eyebrow}>{C.tickets}</span></motion.div>
                        <motion.div {...item(0.08)} style={{ maxWidth: 520, margin: '1.2rem auto 0' }}>
                            {slots?.rsvp ?? <p style={{ ...body }}>{C.ticketsNote}</p>}
                        </motion.div>
                    </section></PkSec>

                    {/* GALLERY */}
                    <PkSec name="gallery">{hasGallery && (
                        <section style={section}>
                            <motion.div {...item(0)}><span style={eyebrow}>{C.gallery}</span></motion.div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.6rem', maxWidth: 640, margin: '1.4rem auto 0' }}>
                                {data.galleryImages!.map((src, i) => (
                                    <motion.div key={`${src}-${i}`} {...item(i * 0.04)} style={{ aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 12, border: `1px solid ${hexA(accent, 0.25)}` }}>
                                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}</PkSec>

                    {/* CONTACT */}
                    <PkSec name="contacts">{hasContacts && (
                        <section style={section}>
                            <motion.div {...item(0)}><span style={eyebrow}>{C.contact}</span></motion.div>
                            <div style={{ display: 'grid', gap: '0.7rem', maxWidth: 440, margin: '1.4rem auto 0' }}>
                                {data.contacts!.map((ct, i) => (
                                    <motion.a key={`${ct.phone}-${i}`} {...item(i * 0.05)} href={`tel:${ct.phone.replace(/\s+/g, '')}`} style={{ ...btn, background: 'transparent', color: ink, border: `1px solid ${hexA(accent, 0.4)}`, boxShadow: 'none', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span style={{ textAlign: 'left' }}>{ct.name}{ct.role && <span style={{ display: 'block', fontSize: '0.78rem', opacity: 0.7 }}>{ct.role}</span>}</span>
                                        <Phone size={18} style={{ color: accent }} />
                                    </motion.a>
                                ))}
                            </div>
                        </section>
                    )}</PkSec>
                </>
            )}

            {/* ============ OUTRO (closing) ============ */}
            {data.eventOutro && (
                <section style={section}>
                    <motion.p {...item(0)} style={{ ...body, maxWidth: 620, margin: '0 auto', fontStyle: 'italic', whiteSpace: 'pre-line' }}>{data.eventOutro}</motion.p>
                </section>
            )}

            {/* ============ FOOTER ============ */}
            <footer style={{ textAlign: 'center', padding: '3rem 1.3rem 4rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: accent, marginBottom: '0.8rem' }}><Sparkles size={16} /></div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(1.4rem, 6vw, 2rem)', color: ink }}>{title}</div>
                <div style={{ marginTop: '1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: inkSoft }}>
                    <span>{C.madeWith}</span><BrandLogo height={12} plate style={{ verticalAlign: 'middle', padding: '3px 7px' }} />
                </div>
            </footer>
        </div>
    );
}
