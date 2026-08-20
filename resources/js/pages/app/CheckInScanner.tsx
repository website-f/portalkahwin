import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, CheckCircle2, XCircle, Info, QrCode, UserRound, Users, Phone, Clock, LogIn, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, dict } from '../../context/LangContext';

interface Guest {
    id: string;
    name: string;
    pax?: number;
    phone?: string | null;
    email?: string | null;
    status?: string;
    attended?: boolean;
    checked_in_at?: string | null;
}
type ErrKind = { message: string } | null;

function extractGuestId(text: string): string | null {
    const t = text.trim();
    if (t.startsWith('PKG:')) return t.slice(4);
    const m = t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return m ? m[0] : null;
}

export function CheckInScanner() {
    const { id = '' } = useParams();
    const { lang } = useLang();
    const [status, setStatus] = useState<'starting' | 'scanning' | 'nocamera'>('starting');
    // The scanned guest awaiting confirmation in the modal (null = none open).
    const [guest, setGuest] = useState<Guest | null>(null);
    const [checkingIn, setCheckingIn] = useState(false);
    const [err, setErr] = useState<ErrKind>(null);
    const [count, setCount] = useState(0);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    // Held while a scan is being resolved OR a confirm modal is open, so the
    // camera never fires a second lookup underneath the modal.
    const busyRef = useRef(false);
    const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

    const C = dict({
        bm: {
            title: 'Imbas Kehadiran', subtitle: 'Halakan kamera ke kod QR tetamu.', printPasses: 'Cetak Pas QR',
            startingCamera: 'Memulakan kamera…',
            noCamera: 'Kamera tidak tersedia. Buka halaman ini di telefon melalui HTTPS dan benarkan akses kamera.',
            sessionCount: 'Direkodkan sesi ini', waiting: 'Menunggu imbasan…',
            invalidQr: 'Kod QR tidak sah.', guestNotFound: 'Tetamu tidak ditemui.',
            guestDetails: 'Butiran Tetamu', pax: 'Bilangan', contact: 'Hubungan', rsvpStatus: 'Status RSVP',
            statusAttending: 'Hadir', statusPending: 'Belum jawab', statusDeclined: 'Tidak hadir',
            notCheckedIn: 'Belum daftar masuk', checkedInLabel: 'Sudah daftar masuk',
            checkedInAt: 'Didaftar pada', checkInBtn: 'Daftar Masuk Sekarang', checkingIn: 'Merekod…',
            justCheckedIn: 'Kehadiran direkodkan!', close: 'Tutup', scanNext: 'Imbas Seterusnya',
            alreadyWarn: 'Tetamu ini sudah didaftarkan. Tidak perlu daftar semula.',
        },
        en: {
            title: 'Scan check-in', subtitle: "Point the camera at a guest's QR code", printPasses: 'Print QR passes',
            startingCamera: 'Starting camera…',
            noCamera: 'Camera unavailable. Open this page on your phone over HTTPS and allow camera access.',
            sessionCount: 'Check-ins this session', waiting: 'Waiting for a scan…',
            invalidQr: 'Invalid QR code.', guestNotFound: 'Guest not found.',
            guestDetails: 'Guest details', pax: 'Party size', contact: 'Contact', rsvpStatus: 'RSVP status',
            statusAttending: 'Attending', statusPending: 'No reply', statusDeclined: 'Not attending',
            notCheckedIn: 'Not checked in yet', checkedInLabel: 'Checked in',
            checkedInAt: 'Checked in at', checkInBtn: 'Check in now', checkingIn: 'Recording…',
            justCheckedIn: 'Check-in recorded!', close: 'Close', scanNext: 'Scan next',
            alreadyWarn: 'This guest is already checked in — no need to check in again.',
        },
        zh: {
            title: '扫码签到', subtitle: '将摄像头对准宾客的二维码', printPasses: '打印二维码入场证',
            startingCamera: '正在启动摄像头…',
            noCamera: '无法使用摄像头。请在手机上以 HTTPS 打开此页面并允许摄像头权限。',
            sessionCount: '本次签到人数', waiting: '等待扫码…',
            invalidQr: '二维码无效。', guestNotFound: '未找到该宾客。',
            guestDetails: '宾客信息', pax: '人数', contact: '联系方式', rsvpStatus: 'RSVP 状态',
            statusAttending: '出席', statusPending: '未回复', statusDeclined: '不出席',
            notCheckedIn: '尚未签到', checkedInLabel: '已签到',
            checkedInAt: '签到时间', checkInBtn: '立即签到', checkingIn: '记录中…',
            justCheckedIn: '签到已记录！', close: '关闭', scanNext: '扫下一个',
            alreadyWarn: '该宾客已签到，无需重复签到。',
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : lang === 'zh' ? 'zh-CN' : 'en-MY';
    const fmtTime = (iso?: string | null): string => {
        if (!iso) return '';
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '' : d.toLocaleString(loc, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };
    const statusLabel = (s?: string): string =>
        s === 'declined' ? C.statusDeclined : s === 'pending' ? C.statusPending : C.statusAttending;

    useEffect(() => {
        const el = document.getElementById('reader');
        if (!el) return;
        const scanner = new Html5Qrcode('reader');
        scannerRef.current = scanner;

        scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            (decoded) => onDecode(decoded),
            () => {} // per-frame decode failures — ignore
        ).then(() => setStatus('scanning')).catch(() => setStatus('nocamera'));

        return () => {
            scanner.stop().then(() => scanner.clear()).catch(() => {});
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function onDecode(text: string) {
        const now = Date.now();
        // Ignore new scans while resolving one or while the confirm modal is open —
        // the host acts on the modal, not on a fresh auto-check-in.
        if (busyRef.current || guest) return;
        if (text === lastRef.current.text && now - lastRef.current.at < 2500) return;
        lastRef.current = { text, at: now };

        const guestId = extractGuestId(text);
        if (!guestId) { setErr({ message: C.invalidQr }); return; }

        busyRef.current = true;
        setErr(null);
        try {
            // LOOKUP only — never checks in. The host confirms in the modal.
            const r = await api.post(`/invitations/${id}/scan/lookup`, { guest_id: guestId });
            setGuest(r.data.guest);
            // busyRef stays held until the modal is closed.
        } catch (e) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setErr({ message: msg ?? C.guestNotFound });
            setTimeout(() => { busyRef.current = false; }, 1200);
        }
    }

    async function doCheckIn() {
        if (!guest || guest.attended) return; // guard: never re-record an attended guest
        setCheckingIn(true);
        try {
            const r = await api.post(`/invitations/${id}/scan`, { guest_id: guest.id });
            setGuest(r.data.guest); // now attended + checked_in_at
            if (!r.data.already) setCount((c) => c + 1);
        } catch (e) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setErr({ message: msg ?? C.guestNotFound });
        } finally {
            setCheckingIn(false);
        }
    }

    function closeModal() {
        setGuest(null);
        // Small gap so the same QR still in frame doesn't immediately re-open.
        setTimeout(() => { busyRef.current = false; }, 700);
    }

    return (
        <div>
            <div className="page-head spread">
                <div className="row">
                    <Link to={`/panel/cards/${id}/guests`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div>
                        <h1 style={{ fontSize: 26 }}>{C.title}</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>{C.subtitle}</p>
                    </div>
                </div>
                <Link to={`/panel/cards/${id}/passes`} className="btn btn-ghost btn-sm"><QrCode size={15} /> {C.printPasses}</Link>
            </div>

            <div className="grid-side">
                <div className="panel" style={{ padding: 12 }}>
                    <div id="reader" style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }} />
                    {status === 'starting' && <p className="muted center" style={{ marginTop: 10 }}>{C.startingCamera}</p>}
                    {status === 'nocamera' && (
                        <div style={{ marginTop: 10 }} className="muted">
                            <Info size={15} style={{ verticalAlign: -2 }} /> {C.noCamera}
                        </div>
                    )}
                </div>

                <div className="stack">
                    <div className="stat"><div className="n">{count}</div><div className="l">{C.sessionCount}</div></div>
                    {err && (
                        <div className="panel center" style={{ borderColor: 'var(--bad)', borderWidth: 2 }}>
                            <XCircle size={40} color="var(--bad)" />
                            <p className="muted" style={{ marginTop: 8 }}>{err.message}</p>
                        </div>
                    )}
                    {!err && <p className="muted">{C.waiting}</p>}
                </div>
            </div>

            {/* Confirmation modal — a scan never checks anyone in on its own. */}
            {guest && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={overlay}
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="panel" style={sheet}>
                        <button type="button" aria-label={C.close} onClick={closeModal} style={closeX}><X size={18} /></button>

                        <div className="muted" style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 700 }}>{C.guestDetails}</div>
                        <div className="row" style={{ gap: 10, alignItems: 'center', margin: '8px 0 14px' }}>
                            <span style={avatar}><UserRound size={22} /></span>
                            <div style={{ minWidth: 0 }}>
                                <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.15 }}>{guest.name}</h2>
                                <div className="row" style={{ gap: 12, color: 'var(--muted)', fontSize: 13, marginTop: 2, flexWrap: 'wrap' }}>
                                    <span className="row" style={{ gap: 4 }}><Users size={14} /> {guest.pax ?? 1} {C.pax}</span>
                                    <span className="badge">{statusLabel(guest.status)}</span>
                                </div>
                            </div>
                        </div>

                        {(guest.phone || guest.email) && (
                            <div className="row" style={{ gap: 6, color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
                                <Phone size={14} /> {guest.phone || guest.email}
                            </div>
                        )}

                        {/* Check-in status block. */}
                        {guest.attended ? (
                            <div style={{ ...statusBox, borderColor: 'var(--ok)', background: 'rgba(46,125,50,0.07)' }}>
                                <div className="row" style={{ gap: 8, color: 'var(--ok, #2e7d32)', fontWeight: 700 }}>
                                    <CheckCircle2 size={18} /> {C.checkedInLabel}
                                </div>
                                {guest.checked_in_at && (
                                    <div className="row muted" style={{ gap: 6, fontSize: 13, marginTop: 6 }}>
                                        <Clock size={14} /> {C.checkedInAt}: {fmtTime(guest.checked_in_at)}
                                    </div>
                                )}
                                <p className="muted" style={{ margin: '8px 0 0', fontSize: 12.5 }}>{C.alreadyWarn}</p>
                            </div>
                        ) : (
                            <div style={{ ...statusBox, borderColor: 'var(--gold)', background: 'rgba(198,160,74,0.08)' }}>
                                <div className="row" style={{ gap: 8, color: 'var(--gold)', fontWeight: 700 }}>
                                    <Info size={18} /> {C.notCheckedIn}
                                </div>
                            </div>
                        )}

                        <div className="row" style={{ gap: 10, marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {guest.attended ? (
                                <button type="button" className="btn btn-primary" onClick={closeModal}>{C.scanNext}</button>
                            ) : (
                                <>
                                    <button type="button" className="btn btn-ghost" onClick={closeModal}>{C.close}</button>
                                    <button type="button" className="btn btn-primary" disabled={checkingIn} onClick={() => void doCheckIn()}>
                                        <LogIn size={16} /> {checkingIn ? C.checkingIn : C.checkInBtn}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', padding: 16,
    background: 'rgba(24,18,33,0.55)', backdropFilter: 'blur(3px)',
};
const sheet: React.CSSProperties = { position: 'relative', width: '100%', maxWidth: 400, padding: '22px 20px' };
const closeX: React.CSSProperties = {
    position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: '50%', border: 0,
    background: 'var(--cream)', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center',
};
const avatar: React.CSSProperties = {
    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
const statusBox: React.CSSProperties = { border: '1.5px solid', borderRadius: 12, padding: '12px 14px' };
