import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, CheckCircle2, XCircle, Info, QrCode } from 'lucide-react';
import { api } from '../../lib/api';

type Result = { kind: 'ok' | 'already' | 'error'; name?: string; message?: string };

function extractGuestId(text: string): string | null {
    const t = text.trim();
    if (t.startsWith('PKG:')) return t.slice(4);
    const m = t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return m ? m[0] : null;
}

export function CheckInScanner() {
    const { id = '' } = useParams();
    const [status, setStatus] = useState<'starting' | 'scanning' | 'nocamera'>('starting');
    const [result, setResult] = useState<Result | null>(null);
    const [count, setCount] = useState(0);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const busyRef = useRef(false);
    const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

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
        if (busyRef.current) return;
        if (text === lastRef.current.text && now - lastRef.current.at < 2500) return;
        lastRef.current = { text, at: now };

        const guestId = extractGuestId(text);
        if (!guestId) {
            setResult({ kind: 'error', message: 'Kod QR tidak sah.' });
            return;
        }
        busyRef.current = true;
        try {
            const r = await api.post(`/invitations/${id}/scan`, { guest_id: guestId });
            if (r.data.already) setResult({ kind: 'already', name: r.data.guest.name });
            else { setResult({ kind: 'ok', name: r.data.guest.name }); setCount((c) => c + 1); }
        } catch (e: any) {
            setResult({ kind: 'error', message: e?.response?.data?.message ?? 'Tetamu tidak dijumpai.' });
        } finally {
            setTimeout(() => { busyRef.current = false; }, 1200);
        }
    }

    return (
        <div>
            <div className="page-head spread">
                <div className="row">
                    <Link to={`/app/cards/${id}/guests`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div>
                        <h1 style={{ fontSize: 26 }}>Imbas Check-in</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Halakan kamera ke kod QR tetamu</p>
                    </div>
                </div>
                <Link to={`/app/cards/${id}/passes`} className="btn btn-ghost btn-sm"><QrCode size={15} /> Cetak Pas QR</Link>
            </div>

            <div className="grid-side">
                <div className="panel" style={{ padding: 12 }}>
                    <div id="reader" style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }} />
                    {status === 'starting' && <p className="muted center" style={{ marginTop: 10 }}>Memulakan kamera…</p>}
                    {status === 'nocamera' && (
                        <div style={{ marginTop: 10 }} className="muted">
                            <Info size={15} style={{ verticalAlign: -2 }} /> Kamera tidak tersedia. Buka halaman ini di telefon melalui HTTPS dan benarkan akses kamera.
                        </div>
                    )}
                </div>

                <div className="stack">
                    <div className="stat"><div className="n">{count}</div><div className="l">Check-in sesi ini</div></div>
                    {result && (
                        <div className="panel center" style={{
                            borderColor: result.kind === 'ok' ? 'var(--ok)' : result.kind === 'already' ? 'var(--gold)' : 'var(--bad)',
                            borderWidth: 2,
                        }}>
                            {result.kind === 'ok' && <><CheckCircle2 size={44} color="var(--ok)" /><h3 style={{ margin: '8px 0 2px' }}>{result.name}</h3><p className="muted" style={{ margin: 0 }}>Check-in berjaya ✓</p></>}
                            {result.kind === 'already' && <><Info size={44} color="var(--gold)" /><h3 style={{ margin: '8px 0 2px' }}>{result.name}</h3><p className="muted" style={{ margin: 0 }}>Sudah check-in sebelum ini</p></>}
                            {result.kind === 'error' && <><XCircle size={44} color="var(--bad)" /><p className="muted" style={{ marginTop: 8 }}>{result.message}</p></>}
                        </div>
                    )}
                    {!result && <p className="muted">Menunggu imbasan…</p>}
                </div>
            </div>
        </div>
    );
}
