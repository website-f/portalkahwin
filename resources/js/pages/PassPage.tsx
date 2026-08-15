import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../lib/api';
import { useLang, dict, LOCALE } from '../context/LangContext';

interface Guest {
    name: string;
    pax: number;
    attended: boolean;
}

interface EventInfo {
    slug: string;
    coupleName: string;
    dateLabel: string;
    timeLabel: string;
    venueName: string;
    venueAddress: string;
    mapsUrl: string;
    receptionAt: string;
    companyName: string;
}

/** The token is valid: the guest, their QR, and the event are all present. */
interface PassData {
    found: true;
    expired: boolean;
    guest: Guest;
    qr: string;
    event: EventInfo;
    amountPaid: number | null;
    reference: string | null;
    expiresAt: string | null;
}

/** The token is unknown or has been retired. */
interface PassMiss {
    found: false;
}

type PassResponse = PassData | PassMiss;

// The card's plum, matching the QR "dark" colour and the app palette.
const PLUM = '#3d1a30';

export function PassPage() {
    const { token = '' } = useParams();
    const { lang } = useLang();
    const [data, setData] = useState<PassData | null>(null);
    const [qrImg, setQrImg] = useState('');
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const C = dict({
        bm: {
            title: 'Pas Kemasukan',
            admits: (n: number) => `Untuk ${n} orang`,
            reference: 'Rujukan',
            amountPaid: 'Jumlah dibayar',
            notFoundTitle: 'Pas tidak dijumpai',
            notFoundBody: 'Pautan ini mungkin tidak sah atau telah tamat tempoh. Sila semak e-mel anda untuk pautan terkini.',
            expiredTitle: 'Pas ini telah tamat tempoh',
            expiredBody: 'Majlis telah pun berlangsung. Terima kasih kerana hadir.',
            checkedIn: 'Telah masuk',
            venue: 'Tempat',
            date: 'Tarikh',
            time: 'Masa',
            directions: 'Lihat peta',
            showAtEntrance: 'Tunjukkan kod QR ini di pintu masuk',
            expires: (d: string) => `Pas ini sah sehingga selepas majlis · ${d}`,
        },
        en: {
            title: 'Entry Pass',
            admits: (n: number) => `Admits ${n}`,
            reference: 'Reference',
            amountPaid: 'Amount paid',
            notFoundTitle: 'Pass not found',
            notFoundBody: 'This link may be invalid or has expired. Please check your email for the latest link.',
            expiredTitle: 'This pass has expired',
            expiredBody: 'The event has already taken place. Thank you for coming.',
            checkedIn: 'Checked in',
            venue: 'Venue',
            date: 'Date',
            time: 'Time',
            directions: 'View map',
            showAtEntrance: 'Show this QR at the entrance',
            expires: (d: string) => `Valid until after the event · ${d}`,
        },
        zh: {
            title: '入场证',
            admits: (n: number) => `${n} 人入场`,
            reference: '参考编号',
            amountPaid: '已付金额',
            notFoundTitle: '找不到入场证',
            notFoundBody: '此链接可能无效或已过期。请查看您的电子邮件以获取最新链接。',
            expiredTitle: '此入场证已过期',
            expiredBody: '婚礼已经举行。感谢您的出席。',
            checkedIn: '已入场',
            venue: '地点',
            date: '日期',
            time: '时间',
            directions: '查看地图',
            showAtEntrance: '请在入口处出示此二维码',
            expires: (d: string) => `有效期至婚礼结束 · ${d}`,
        },
    }, lang);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setNotFound(false);
        setData(null);
        setQrImg('');
        api.get<PassResponse>('/pass/' + token)
            .then(async (r) => {
                if (!active) return;
                const d = r.data;
                if (!d.found) {
                    setNotFound(true);
                    return;
                }
                setData(d);
                if (!d.expired && d.qr) {
                    const img = await QRCode.toDataURL(d.qr, {
                        width: 240,
                        margin: 1,
                        color: { dark: PLUM, light: '#ffffff' },
                    });
                    if (active) setQrImg(img);
                }
            })
            .catch(() => {
                if (active) setNotFound(true);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [token]);

    const money = (n: number) =>
        new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: 'MYR' }).format(n);

    const fmtDateTime = (iso: string) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    // Unknown / retired token, or a network error while resolving it.
    if (notFound || !data) {
        return (
            <Shell>
                <div style={eyebrowStyle}>{C.title}</div>
                <h1 style={coupleStyle}>{C.notFoundTitle}</h1>
                <p style={{ color: '#6b5560', fontSize: 14.5, lineHeight: 1.6, margin: '10px 0 0' }}>
                    {C.notFoundBody}
                </p>
            </Shell>
        );
    }

    const { guest, event, amountPaid, reference, expiresAt } = data;

    // Expired: still greet the couple, but withhold the (now useless) QR.
    if (data.expired) {
        return (
            <Shell>
                {event.companyName && <div style={eyebrowStyle}>{event.companyName}</div>}
                <h1 style={coupleStyle}>{event.coupleName}</h1>
                <div style={{ ...badgeStyle, background: '#efe7ec', color: PLUM, marginTop: 14 }}>
                    {C.expiredTitle}
                </div>
                <p style={{ color: '#6b5560', fontSize: 14.5, lineHeight: 1.6, margin: '14px 0 0' }}>
                    {C.expiredBody}
                </p>
            </Shell>
        );
    }

    return (
        <Shell>
            {event.companyName && <div style={eyebrowStyle}>{event.companyName}</div>}
            <h1 style={coupleStyle}>{event.coupleName}</h1>
            <div style={{ color: '#6b5560', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                {C.title}
            </div>

            {guest.attended && (
                <div style={{ ...badgeStyle, background: '#e7f3ec', color: '#1f7a46', marginTop: 14 }}>
                    ✓ {C.checkedIn}
                </div>
            )}

            <div style={{ marginTop: 22, marginBottom: 6 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: PLUM }}>
                    {guest.name}
                </div>
                <div style={{ color: '#6b5560', fontSize: 14, marginTop: 2 }}>{C.admits(guest.pax)}</div>
            </div>

            {qrImg && (
                <div style={{ margin: '18px 0 8px' }}>
                    <img
                        src={qrImg}
                        alt={event.coupleName}
                        style={{ width: 240, height: 240, maxWidth: '100%', display: 'block', margin: '0 auto' }}
                    />
                    <div style={{ color: '#6b5560', fontSize: 13, marginTop: 8 }}>{C.showAtEntrance}</div>
                </div>
            )}

            <div style={{ height: 1, background: '#ece2e8', margin: '18px 0' }} />

            <div style={{ textAlign: 'left', display: 'grid', gap: 12 }}>
                <Row label={C.date} value={event.dateLabel} />
                <Row label={C.time} value={event.timeLabel} />
                <Row
                    label={C.venue}
                    value={
                        <>
                            <span>{event.venueName}</span>
                            {event.venueAddress && (
                                <span style={{ display: 'block', color: '#8a7480', fontSize: 13, marginTop: 2 }}>
                                    {event.venueAddress}
                                </span>
                            )}
                            {event.mapsUrl && (
                                <a
                                    href={event.mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'inline-block', marginTop: 4, color: PLUM, fontSize: 13, fontWeight: 600 }}
                                >
                                    {C.directions} →
                                </a>
                            )}
                        </>
                    }
                />
                {amountPaid != null && <Row label={C.amountPaid} value={money(amountPaid)} />}
                {reference && <Row label={C.reference} value={reference} />}
            </div>

            {expiresAt && (
                <p style={{ color: '#8a7480', fontSize: 12.5, lineHeight: 1.6, margin: '18px 0 0' }}>
                    {C.expires(fmtDateTime(expiresAt))}
                </p>
            )}
        </Shell>
    );
}

/** A centred, print-friendly card on a cream page — the whole public shell. */
function Shell({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--cream, #f7f1ee)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: '#ffffff',
                    borderRadius: 18,
                    padding: '32px 24px',
                    textAlign: 'center',
                    boxShadow: '0 18px 50px -20px rgba(61,26,48,0.35)',
                    border: '1px solid #efe7ec',
                    boxSizing: 'border-box',
                }}
            >
                {children}
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline' }}>
            <span style={{ color: '#8a7480', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>
                {label}
            </span>
            <span style={{ color: PLUM, fontSize: 14.5, textAlign: 'right', fontWeight: 500 }}>{value}</span>
        </div>
    );
}

const eyebrowStyle: CSSProperties = {
    color: '#8a7480',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
};

const coupleStyle: CSSProperties = {
    fontFamily: 'var(--serif)',
    fontSize: 27,
    fontWeight: 700,
    color: PLUM,
    margin: '6px 0 0',
    lineHeight: 1.2,
};

const badgeStyle: CSSProperties = {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 600,
};
