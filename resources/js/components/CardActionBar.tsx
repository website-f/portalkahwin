import { useEffect, useState, type ReactNode } from 'react';
import {
    CalendarClock, MapPin, MailCheck, Gift, CalendarPlus,
    X, Copy, Check, ExternalLink, CalendarDays, Clock, Building2,
    Download, CircleAlert,
} from 'lucide-react';
import type { InvitationData } from '../templates/types';
import { useLang } from '../context/LangContext';
import { RsvpForm } from './RsvpForm';
import { googleCalendarUrl, icsDataUri } from '../lib/calendar';
import { mapEmbedSrc } from '../lib/map';

type SheetKey = 'aturcara' | 'lokasi' | 'rsvp' | 'gift' | 'calendar';

// Copy to clipboard with a legacy fallback for non-secure contexts.
async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* fall through to legacy path */
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

// ---------- Reusable bottom sheet (off-canvas from the bottom) ----------
interface SheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    closeLabel: string;
    children: ReactNode;
}

function Sheet({ open, onClose, title, closeLabel, children }: SheetProps) {
    const [mounted, setMounted] = useState(open);
    const [shown, setShown] = useState(false);

    // Mount on open, then flip the "shown" flag next frame so the panel
    // transitions up; on close, keep mounted through the exit transition.
    useEffect(() => {
        if (open) {
            setMounted(true);
            const raf = requestAnimationFrame(() => setShown(true));
            return () => cancelAnimationFrame(raf);
        }
        setShown(false);
        const t = setTimeout(() => setMounted(false), 320);
        return () => clearTimeout(t);
    }, [open]);

    // Esc to close + body scroll lock while open.
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!mounted) return null;

    return (
        <div className="cab-sheet-root" role="dialog" aria-modal="true" aria-label={title}>
            <div
                className={`cab-sheet-backdrop${shown ? ' is-shown' : ''}`}
                onClick={onClose}
            />
            <div className={`cab-sheet-panel${shown ? ' is-shown' : ''}`}>
                <div className="cab-sheet-grabber" aria-hidden="true" />
                <div className="cab-sheet-head">
                    <h3 className="serif">{title}</h3>
                    <button className="cab-sheet-close" onClick={onClose} aria-label={closeLabel}>
                        <X size={20} />
                    </button>
                </div>
                <div className="cab-sheet-body">{children}</div>
            </div>
        </div>
    );
}

// ---------- Copy-to-clipboard pill (Copy -> Check) ----------
function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
    const [ok, setOk] = useState(false);
    useEffect(() => {
        if (!ok) return;
        const t = setTimeout(() => setOk(false), 1600);
        return () => clearTimeout(t);
    }, [ok]);
    return (
        <button
            className="btn btn-ghost btn-sm"
            onClick={async () => {
                if (await copyText(value)) setOk(true);
            }}
        >
            {ok ? <Check size={15} /> : <Copy size={15} />}
            {ok ? copiedLabel : label}
        </button>
    );
}

export function CardActionBar({ data, slug, rsvpEnabled }: { data: InvitationData; slug: string; rsvpEnabled: boolean }) {
    const { lang } = useLang();
    const [openKey, setOpenKey] = useState<SheetKey | null>(null);
    const close = () => setOpenKey(null);

    const T = {
        bm: {
            aturcara: 'Aturcara', lokasi: 'Lokasi', rsvp: 'RSVP', gift: 'Salam Kasih', kalendar: 'Kalendar',
            close: 'Tutup',
            programTitle: 'Atur Cara Majlis',
            programEmpty: 'Atur cara majlis akan dikemas kini tidak lama lagi.',
            locTitle: 'Lokasi Majlis',
            openMaps: 'Buka Google Maps', openWaze: 'Buka Waze',
            locEmpty: 'Butiran lokasi akan dikongsi tidak lama lagi.',
            rsvpTitle: 'Sahkan Kehadiran',
            giftTitle: 'Salam Kasih',
            bank: 'Bank', accName: 'Nama Akaun', accNo: 'No. Akaun',
            copy: 'Salin', copied: 'Disalin',
            giftEmpty: 'Maklumat hadiah akan dikongsi tidak lama lagi.',
            calTitle: 'Simpan Tarikh',
            gcal: 'Tambah ke Google Calendar', ics: 'Muat turun .ics',
            calHint: 'Tarikh penuh belum ditetapkan — sila rujuk tarikh di atas.',
            eventTitle: (c: string) => `Majlis Perkahwinan ${c}`,
        },
        en: {
            aturcara: 'Programme', lokasi: 'Location', rsvp: 'RSVP', gift: 'Gift', kalendar: 'Calendar',
            close: 'Close',
            programTitle: 'Order of Events',
            programEmpty: 'The programme will be updated soon.',
            locTitle: 'Venue',
            openMaps: 'Open Google Maps', openWaze: 'Open Waze',
            locEmpty: 'Venue details will be shared soon.',
            rsvpTitle: 'Confirm Attendance',
            giftTitle: 'Gift',
            bank: 'Bank', accName: 'Account Name', accNo: 'Account No.',
            copy: 'Copy', copied: 'Copied',
            giftEmpty: 'Gift details will be shared soon.',
            calTitle: 'Save the Date',
            gcal: 'Add to Google Calendar', ics: 'Download .ics',
            calHint: 'Exact date/time not set yet — please refer to the date above.',
            eventTitle: (c: string) => `Wedding of ${c}`,
        },
    }[lang];

    // The bar is uniform across every template: Aturcara / Lokasi / Salam Kasih /
    // Kalendar always render (each sheet degrades to a gentle note when thin);
    // only RSVP is gated, on rsvpEnabled.
    const hasLocation = !!(data.venueName || data.venueAddress || data.mapsUrl || data.wazeUrl);
    const mapSrc = mapEmbedSrc(data);
    const g = data.gift;
    const hasGift = !!(g && (g.bankName || g.accountName || g.accountNo || g.note || g.qrUrl));

    const items: { key: SheetKey; label: string; icon: ReactNode }[] = [
        { key: 'aturcara', label: T.aturcara, icon: <CalendarClock size={20} /> },
        { key: 'lokasi', label: T.lokasi, icon: <MapPin size={20} /> },
    ];
    if (rsvpEnabled) items.push({ key: 'rsvp', label: T.rsvp, icon: <MailCheck size={20} /> });
    items.push({ key: 'gift', label: T.gift, icon: <Gift size={20} /> });
    items.push({ key: 'calendar', label: T.kalendar, icon: <CalendarPlus size={20} /> });

    // Calendar event derived from card data.
    const couple = `${data.groomName} & ${data.brideName}`;
    const eventTitle = T.eventTitle(couple);
    const eventDetails = [data.dateLabel, data.timeLabel, data.venueName].filter(Boolean).join('\n') || undefined;
    const eventLocation = [data.venueName, data.venueAddress].filter(Boolean).join(', ') || undefined;
    const gcalHref = googleCalendarUrl({ title: eventTitle, startIso: data.receptionAt, details: eventDetails, location: eventLocation });
    const icsHref = icsDataUri({ title: eventTitle, startIso: data.receptionAt, details: eventDetails, location: eventLocation });

    const program = data.program ?? [];

    return (
        <>
            <style>{CAB_CSS}</style>

            <nav className="cab-bar" aria-label={lang === 'bm' ? 'Tindakan kad' : 'Card actions'}>
                {items.map((it) => (
                    <button
                        key={it.key}
                        className={`cab-btn${openKey === it.key ? ' is-active' : ''}`}
                        onClick={() => setOpenKey(it.key)}
                        aria-haspopup="dialog"
                        aria-expanded={openKey === it.key}
                    >
                        {it.icon}
                        <span className="cab-label">{it.label}</span>
                    </button>
                ))}
            </nav>

            {/* Aturcara */}
            <Sheet open={openKey === 'aturcara'} onClose={close} title={T.programTitle} closeLabel={T.close}>
                {program.length > 0 ? (
                    <ul className="cab-tl">
                        {program.map((p, i) => (
                            <li key={i}>
                                <span className="dot" aria-hidden="true" />
                                <div className="t">{p.time}</div>
                                <div className="ti serif">{p.title}</div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="cab-note">{T.programEmpty}</p>
                )}
            </Sheet>

            {/* Lokasi */}
            <Sheet open={openKey === 'lokasi'} onClose={close} title={T.locTitle} closeLabel={T.close}>
                {hasLocation ? (
                    <div className="cab-stack">
                        {data.venueName && <div className="cab-venue serif">{data.venueName}</div>}
                        {data.venueAddress && <p className="cab-addr">{data.venueAddress}</p>}
                        {mapSrc && (
                            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', margin: '4px 0 6px' }}>
                                <iframe
                                    title="Peta lokasi"
                                    style={{ width: '100%', height: 240, border: 0, display: 'block' }}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={mapSrc}
                                />
                            </div>
                        )}
                        <div className="cab-actions">
                            {data.mapsUrl && (
                                <a className="btn btn-primary btn-block" href={data.mapsUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink size={16} /> {T.openMaps}
                                </a>
                            )}
                            {data.wazeUrl && (
                                <a className="btn btn-ghost btn-block" href={data.wazeUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink size={16} /> {T.openWaze}
                                </a>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="cab-note">{T.locEmpty}</p>
                )}
            </Sheet>

            {/* RSVP */}
            {rsvpEnabled && (
                <Sheet open={openKey === 'rsvp'} onClose={close} title={T.rsvpTitle} closeLabel={T.close}>
                    <RsvpForm slug={slug} />
                </Sheet>
            )}

            {/* Salam Kasih */}
            <Sheet open={openKey === 'gift'} onClose={close} title={T.giftTitle} closeLabel={T.close}>
                {hasGift && g ? (
                    <div className="cab-kv">
                        {g.bankName && (
                            <div className="cab-row">
                                <span className="k">{T.bank}</span>
                                <span className="v">{g.bankName}</span>
                            </div>
                        )}
                        {g.accountName && (
                            <div className="cab-row">
                                <span className="k">{T.accName}</span>
                                <span className="v">{g.accountName}</span>
                            </div>
                        )}
                        {g.accountNo && (
                            <div className="cab-row">
                                <div>
                                    <div className="k">{T.accNo}</div>
                                    <div className="v cab-accno">{g.accountNo}</div>
                                </div>
                                <CopyButton value={g.accountNo} label={T.copy} copiedLabel={T.copied} />
                            </div>
                        )}
                        {g.note && <p className="cab-gift-note">{g.note}</p>}
                    </div>
                ) : (
                    <p className="cab-note">{T.giftEmpty}</p>
                )}
            </Sheet>

            {/* Kalendar */}
            <Sheet open={openKey === 'calendar'} onClose={close} title={T.calTitle} closeLabel={T.close}>
                <div className="cab-cal-sum">
                    {data.dateLabel && (
                        <div className="cab-cal-line d">
                            <CalendarDays size={18} /> <span>{data.dateLabel}</span>
                        </div>
                    )}
                    {data.timeLabel && (
                        <div className="cab-cal-line">
                            <Clock size={16} /> <span>{data.timeLabel}</span>
                        </div>
                    )}
                    {data.venueName && (
                        <div className="cab-cal-line">
                            <Building2 size={16} /> <span>{data.venueName}</span>
                        </div>
                    )}
                </div>
                <div className="cab-actions">
                    {gcalHref ? (
                        <a className="btn btn-primary btn-block" href={gcalHref} target="_blank" rel="noopener noreferrer">
                            <CalendarPlus size={16} /> {T.gcal}
                        </a>
                    ) : (
                        <button className="btn btn-primary btn-block" disabled>
                            <CalendarPlus size={16} /> {T.gcal}
                        </button>
                    )}
                    {icsHref ? (
                        <a className="btn btn-gold btn-block" href={icsHref} download={`${slug || 'jemputan'}.ics`}>
                            <Download size={16} /> {T.ics}
                        </a>
                    ) : (
                        <button className="btn btn-gold btn-block" disabled>
                            <Download size={16} /> {T.ics}
                        </button>
                    )}
                    {!gcalHref && (
                        <p className="cab-hint">
                            <CircleAlert size={14} /> {T.calHint}
                        </p>
                    )}
                </div>
            </Sheet>
        </>
    );
}

// Scoped styles for the bar + sheets (kept out of app.css by design).
const CAB_CSS = `
.cab-bar {
    position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
    z-index: 96; display: flex; gap: 2px;
    padding: 8px; padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    border-radius: 999px; max-width: calc(100vw - 20px);
    background: rgba(61, 26, 48, 0.72);
    -webkit-backdrop-filter: blur(14px) saturate(1.3); backdrop-filter: blur(14px) saturate(1.3);
    border: 1px solid rgba(230, 211, 163, 0.35);
    box-shadow: 0 18px 44px -14px rgba(61, 26, 48, 0.6);
}
.cab-btn {
    appearance: none; border: 0; background: transparent; cursor: pointer;
    color: rgba(255, 255, 255, 0.86); font-family: inherit;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 7px 9px; min-width: 52px; border-radius: 999px;
    transition: background .16s ease, color .16s ease, transform .12s ease;
}
.cab-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
.cab-btn:active { transform: scale(0.93); }
.cab-btn.is-active { color: #241a06; background: linear-gradient(135deg, var(--gold), #b98a2f); }
.cab-label { font-size: 10px; font-weight: 700; letter-spacing: 0.3px; line-height: 1; }

.cab-sheet-root { position: fixed; inset: 0; z-index: 130; }
.cab-sheet-backdrop {
    position: absolute; inset: 0; background: rgba(42, 31, 45, 0.5);
    -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
    opacity: 0; transition: opacity .24s cubic-bezier(.4, 0, 1, 1);
}
.cab-sheet-backdrop.is-shown { opacity: 1; transition: opacity .3s cubic-bezier(.16, 1, .3, 1); }
.cab-sheet-panel {
    position: absolute; left: 0; right: 0; bottom: 0; margin: 0 auto;
    width: min(720px, 100%); max-height: 85vh;
    display: flex; flex-direction: column;
    background: var(--ivory); border-radius: 22px 22px 0 0; border-top: 1px solid var(--line);
    box-shadow: 0 -24px 60px -20px rgba(42, 31, 45, 0.5);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    /* EXIT: ease-in (slides away smoothly, not a sudden jump). */
    transform: translateY(102%); transition: transform .3s cubic-bezier(.4, 0, 1, 1);
}
/* ENTRANCE: ease-out (settles gently into place). */
.cab-sheet-panel.is-shown { transform: translateY(0); transition: transform .42s cubic-bezier(.16, 1, .3, 1); }
.cab-sheet-grabber { flex: none; width: 42px; height: 5px; border-radius: 999px; background: rgba(42, 31, 45, 0.18); margin: 10px auto 2px; }
.cab-sheet-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 20px 12px; border-bottom: 1px solid var(--line); }
.cab-sheet-head h3 { margin: 0; font-size: 22px; color: var(--plum); }
.cab-sheet-close {
    flex: none; border: 0; cursor: pointer; width: 34px; height: 34px; border-radius: 50%;
    display: grid; place-items: center; background: var(--cream); color: var(--plum);
    transition: background .16s ease;
}
.cab-sheet-close:hover { background: #ece0cf; }
.cab-sheet-body { overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 18px 20px 24px; }

.cab-note { color: var(--muted); font-size: 14px; line-height: 1.6; text-align: center; padding: 22px 8px; margin: 0; }

.cab-tl { list-style: none; margin: 0; padding: 4px 0 0; }
.cab-tl li { position: relative; padding: 0 0 20px 26px; }
.cab-tl li::before { content: ''; position: absolute; left: 6px; top: 20px; bottom: -2px; width: 2px; background: var(--line); }
.cab-tl li:last-child { padding-bottom: 2px; }
.cab-tl li:last-child::before { display: none; }
.cab-tl .dot { position: absolute; left: 0; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: var(--gold); border: 3px solid var(--ivory); box-shadow: 0 0 0 1px var(--gold-soft); }
.cab-tl .t { font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--plum); }
.cab-tl .ti { font-size: 19px; color: var(--ink); line-height: 1.3; }

.cab-stack { display: flex; flex-direction: column; gap: 6px; }
.cab-venue { font-size: 22px; color: var(--plum); }
.cab-addr { margin: 0 0 6px; color: var(--muted); font-size: 15px; line-height: 1.6; }

.cab-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }

.cab-kv { display: grid; gap: 12px; }
.cab-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: #fff; border: 1px solid var(--line); border-radius: 12px; }
.cab-row .k { font-size: 12px; color: var(--muted); }
.cab-row .v { font-weight: 600; color: var(--ink); }
.cab-accno { font-size: 18px; letter-spacing: 0.5px; margin-top: 2px; }
.cab-gift-note { margin: 6px 2px 0; color: var(--muted); font-size: 14px; line-height: 1.6; }

.cab-cal-sum { text-align: center; padding: 6px 4px 4px; display: grid; gap: 8px; }
.cab-cal-line { display: inline-flex; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-size: 15px; }
.cab-cal-line.d { color: var(--plum); font-family: var(--serif); font-size: 23px; font-weight: 600; }
.cab-hint { display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--muted); font-size: 13px; margin: 2px 0 0; text-align: center; }

@media print { .cab-bar, .cab-sheet-root { display: none !important; } }
`;
