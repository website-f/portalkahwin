import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Scissors, Loader2 } from 'lucide-react';
import { youtubeId, loadYT, type YTPlayer } from './MusicPlayer';
import { mediaUrl } from '../lib/base';
import { useLang, dict } from '../context/LangContext';

export interface TrimValue { start: number; end: number; duration: number }

interface Props {
    url: string;
    start: number;
    end: number | null;
    /** Fired whenever the trim window (or the resolved source duration) changes. */
    onChange: (v: TrimValue) => void;
}

const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
};

/** Parse "83", "1:23" or "1:23:45" → seconds. */
const parseTime = (str: string): number => {
    const t = str.trim();
    if (t === '') return 0;
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    const parts = t.split(':').map((p) => parseInt(p, 10));
    if (parts.some((n) => Number.isNaN(n))) return 0;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Advanced trim editor for a background track. For an MP3/audio URL it decodes a
 * waveform and gives draggable start/end handles + a looping preview. For a
 * YouTube link it drives the official IFrame player (no download/conversion) with
 * the same handles + preview. Either way it reports start/end/duration in seconds.
 */
export function MusicTrimmer(props: Props) {
    return youtubeId(props.url) ? <YouTubeTrimmer {...props} /> : <AudioTrimmer {...props} />;
}

/* ----------------------------- shared UI ----------------------------- */

function ScrubBar({ duration, start, end, playhead, peaks, onDrag }: {
    duration: number; start: number; end: number; playhead: number | null;
    peaks: number[] | null; onDrag: (start: number, end: number) => void;
}) {
    const barRef = useRef<HTMLDivElement>(null);
    const pct = (s: number) => (duration > 0 ? Math.min(100, Math.max(0, (s / duration) * 100)) : 0);

    const secFromClientX = (clientX: number): number => {
        const el = barRef.current;
        if (!el || duration <= 0) return 0;
        const r = el.getBoundingClientRect();
        return Math.min(duration, Math.max(0, ((clientX - r.left) / r.width) * duration));
    };

    const runDrag = (move: (ev: PointerEvent) => void) => {
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    // Resize one edge.
    const beginResize = (which: 'start' | 'end') => (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        runDrag((ev) => {
            const t = secFromClientX(ev.clientX);
            if (which === 'start') onDrag(Math.min(t, end - 1), end);
            else onDrag(start, Math.max(t, start + 1));
        });
    };

    // Slide the WHOLE window (keeps its length) — the Instagram/WhatsApp gesture.
    const beginMove = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const el = barRef.current;
        if (!el || duration <= 0) return;
        const width = el.getBoundingClientRect().width;
        const startX = e.clientX;
        const len = end - start;
        const from = start;
        runDrag((ev) => {
            const deltaSec = ((ev.clientX - startX) / width) * duration;
            const ns = clamp(from + deltaSec, 0, Math.max(0, duration - len));
            onDrag(ns, ns + len);
        });
    };

    const selLeft = pct(start);
    const selWidth = Math.max(0, pct(end) - pct(start));

    return (
        <div
            ref={barRef}
            style={{
                position: 'relative', height: peaks ? 72 : 44, borderRadius: 10,
                background: 'var(--cream)', border: '1px solid var(--line)', overflow: 'hidden',
                userSelect: 'none', touchAction: 'none',
            }}
        >
            {/* Waveform (audio only) — bars inside the window are highlighted. */}
            {peaks && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 1, padding: '0 2px' }}>
                    {peaks.map((p, i) => {
                        const at = duration > 0 ? (i / peaks.length) * duration : 0;
                        const inSel = at >= start && at <= end;
                        return (
                            <div key={i} style={{
                                flex: 1, height: `${Math.max(6, p * 100)}%`, borderRadius: 1,
                                background: inSel ? 'var(--plum)' : 'var(--line)',
                            }} />
                        );
                    })}
                </div>
            )}

            {/* Dim the trimmed-away regions */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${selLeft}%`, background: 'rgba(255,255,255,0.6)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${100 - selLeft - selWidth}%`, background: 'rgba(255,255,255,0.6)' }} />

            {/* Playhead */}
            {playhead != null && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(playhead)}%`, width: 2, background: 'var(--gold)', zIndex: 3, pointerEvents: 'none' }} />
            )}

            {/* The draggable selection window: grab anywhere in the middle to slide it. */}
            <div
                data-testid="trim-window"
                onPointerDown={beginMove}
                style={{
                    position: 'absolute', top: 2, bottom: 2, left: `${selLeft}%`, width: `${selWidth}%`,
                    border: '2px solid var(--plum)', borderRadius: 8,
                    background: peaks ? 'rgba(74,59,196,0.10)' : 'rgba(74,59,196,0.18)',
                    cursor: 'grab', touchAction: 'none', zIndex: 1, boxSizing: 'border-box',
                }}
            />

            {/* Edge grips — resize the window. */}
            <Handle left={selLeft} onPointerDown={beginResize('start')} />
            <Handle left={selLeft + selWidth} onPointerDown={beginResize('end')} />
        </div>
    );
}

function Handle({ left, onPointerDown }: { left: number; onPointerDown: (e: React.PointerEvent) => void }) {
    return (
        <div
            onPointerDown={onPointerDown}
            style={{
                position: 'absolute', top: 0, bottom: 0, left: `calc(${left}% - 9px)`, width: 18,
                cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2, touchAction: 'none',
            }}
        >
            <div style={{ width: 6, height: '60%', borderRadius: 4, background: 'var(--plum)', boxShadow: '0 0 0 2px #fff' }} />
        </div>
    );
}

function Readout({ start, end, duration, onEdit }: {
    start: number; end: number; duration: number; onEdit: (start: number, end: number) => void;
}) {
    const { lang } = useLang();
    const C = dict({
        bm: { start: 'Mula', end: 'Tamat', dur: 'Tempoh' },
        en: { start: 'Start', end: 'End', dur: 'Length' },
        zh: { start: '开始', end: '结束', dur: '时长' },
    }, lang);
    const [sText, setSText] = useState(fmt(start));
    const [eText, setEText] = useState(fmt(end));
    useEffect(() => { setSText(fmt(start)); }, [start]);
    useEffect(() => { setEText(fmt(end)); }, [end]);

    const commitStart = () => {
        const v = clamp(parseTime(sText), 0, Math.max(0, end - 1));
        onEdit(v, end);
        setSText(fmt(v));
    };
    const commitEnd = () => {
        const hi = duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
        const v = clamp(parseTime(eText), start + 1, hi);
        onEdit(start, v);
        setEText(fmt(v));
    };

    const inputCell = (label: string, text: string, setText: (v: string) => void, commit: () => void) => (
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>{label}</div>
            <input
                value={text}
                inputMode="numeric"
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                style={{
                    width: 68, textAlign: 'center', fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums',
                    padding: '4px 6px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)',
                }}
            />
        </div>
    );

    return (
        <div className="row" style={{ marginTop: 10, gap: 8, alignItems: 'flex-end' }}>
            {inputCell(C.start, sText, setSText, commitStart)}
            {inputCell(C.end, eText, setEText, commitEnd)}
            <div style={{ flex: 1, textAlign: 'center' }}>
                <div className="muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>{C.dur}</div>
                <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', padding: '4px 6px' }}>{fmt(Math.max(0, end - start))}</div>
            </div>
        </div>
    );
}

function useTrimLabels() {
    const { lang } = useLang();
    return dict({
        bm: { preview: 'Dengar pilihan', stop: 'Henti', decoding: 'Menyediakan gelombang…', ytLoading: 'Memuatkan pemain YouTube…', hint: 'Seret pemegang atau taip masa tepat (m:ss) untuk potong awal & akhir, kemudian dengar.', noDecode: 'Tidak dapat lukis gelombang untuk pautan ini — masih boleh potong guna garis masa di bawah.' },
        en: { preview: 'Preview selection', stop: 'Stop', decoding: 'Preparing waveform…', ytLoading: 'Loading YouTube player…', hint: 'Drag the handles or type an exact time (m:ss) to trim the start & end, then listen.', noDecode: 'Could not draw a waveform for this link — you can still trim with the timeline below.' },
        zh: { preview: '试听所选', stop: '停止', decoding: '正在生成波形…', ytLoading: '正在加载 YouTube 播放器…', hint: '拖动手柄或输入精确时间（m:ss）裁剪开头与结尾，然后试听。', noDecode: '无法为此链接生成波形——仍可用下方时间轴裁剪。' },
    }, lang);
}

/* ------------------------------- audio ------------------------------- */

function AudioTrimmer({ url, start, end, onChange }: Props) {
    const T = useTrimLabels();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [duration, setDuration] = useState(0);
    const [peaks, setPeaks] = useState<number[] | null>(null);
    const [decoding, setDecoding] = useState(true);
    const [playhead, setPlayhead] = useState<number | null>(null);
    const [playing, setPlaying] = useState(false);
    const s = start || 0;
    const e = end && end > s ? end : duration;

    // Decode the file once to draw a waveform + read its true duration.
    useEffect(() => {
        let cancelled = false;
        setDecoding(true);
        setPeaks(null);
        const full = mediaUrl(url) ?? url;
        fetch(full)
            .then((r) => r.arrayBuffer())
            .then((buf) => {
                const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                return new Ctx().decodeAudioData(buf);
            })
            .then((audio) => {
                if (cancelled) return;
                const ch = audio.getChannelData(0);
                const buckets = 120;
                const size = Math.floor(ch.length / buckets) || 1;
                const out: number[] = [];
                let max = 0;
                for (let i = 0; i < buckets; i++) {
                    let peak = 0;
                    for (let j = 0; j < size; j++) peak = Math.max(peak, Math.abs(ch[i * size + j] || 0));
                    out.push(peak);
                    max = Math.max(max, peak);
                }
                setPeaks(max > 0 ? out.map((p) => p / max) : out);
                setDuration(audio.duration);
                setDecoding(false);
            })
            .catch(() => {
                // CORS or an unsupported codec — fall back to metadata-only duration.
                if (cancelled) return;
                setPeaks(null);
                setDecoding(false);
            });
        return () => { cancelled = true; };
    }, [url]);

    // Once we know the duration, seed a full selection if none was set.
    useEffect(() => {
        if (duration > 0 && (!end || end > duration)) onChange({ start: s, end: duration, duration });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration]);

    function onLoadedMeta() {
        const a = audioRef.current;
        if (a && !duration && isFinite(a.duration)) setDuration(a.duration);
    }

    function togglePreview() {
        const a = audioRef.current;
        if (!a) return;
        if (playing) { a.pause(); setPlaying(false); setPlayhead(null); return; }
        a.currentTime = s;
        void a.play().then(() => setPlaying(true)).catch(() => {});
    }

    function onTime() {
        const a = audioRef.current;
        if (!a) return;
        setPlayhead(a.currentTime);
        if (a.currentTime >= e) { a.currentTime = s; } // loop the selection while previewing
    }

    return (
        <div>
            <audio ref={audioRef} src={mediaUrl(url) ?? url} preload="metadata"
                onLoadedMetadata={onLoadedMeta} onTimeUpdate={onTime}
                onEnded={() => { setPlaying(false); setPlayhead(null); }} />

            {decoding ? (
                <div className="row muted" style={{ gap: 8, padding: '18px 0', fontSize: 13 }}>
                    <Loader2 size={15} className="spin" /> {T.decoding}
                </div>
            ) : (
                <>
                    <ScrubBar duration={duration} start={s} end={e} playhead={playhead} peaks={peaks}
                        onDrag={(ns, ne) => onChange({ start: Math.round(ns), end: Math.round(ne), duration })} />
                    {!peaks && <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>{T.noDecode}</p>}
                    <Readout start={s} end={e} duration={duration}
                        onEdit={(ns, ne) => onChange({ start: Math.round(ns), end: Math.round(ne), duration })} />
                    <div className="row" style={{ marginTop: 10, gap: 10 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={togglePreview} disabled={duration <= 0}>
                            {playing ? <><Pause size={15} /> {T.stop}</> : <><Play size={15} /> {T.preview}</>}
                        </button>
                        <span className="muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Scissors size={13} /> {T.hint}
                        </span>
                    </div>
                </>
            )}
            <style>{`.spin { animation: pk-spin 0.9s linear infinite; } @keyframes pk-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

/* ------------------------------ youtube ------------------------------ */

function YouTubeTrimmer({ url, start, end, onChange }: Props) {
    const T = useTrimLabels();
    const id = youtubeId(url)!;
    const holderRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const [duration, setDuration] = useState(0);
    const [ready, setReady] = useState(false);
    const [playhead, setPlayhead] = useState<number | null>(null);
    const [playing, setPlaying] = useState(false);
    const s = start || 0;
    const e = end && end > s ? end : duration;

    useEffect(() => {
        let cancelled = false;
        let poll: number | undefined;
        loadYT().then((YT) => {
            if (cancelled || !holderRef.current) return;
            playerRef.current = new YT.Player(holderRef.current, {
                videoId: id,
                width: '100%',
                height: '200',
                playerVars: { controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
                events: {
                    onReady: (ev) => {
                        if (cancelled) return;
                        setReady(true);
                        // getDuration only reports once metadata loads — poll briefly.
                        poll = window.setInterval(() => {
                            const p = playerRef.current;
                            if (!p) return;
                            try {
                                const d = p.getDuration();
                                if (d > 0 && d !== duration) setDuration(d);
                                setPlayhead(p.getCurrentTime());
                            } catch { /* not ready */ }
                        }, 300);
                        void ev;
                    },
                    onStateChange: (ev) => {
                        if (cancelled) return;
                        setPlaying(ev.data === YT.PlayerState.PLAYING);
                    },
                },
            });
        }).catch(() => {});
        return () => {
            cancelled = true;
            if (poll) window.clearInterval(poll);
            try { playerRef.current?.destroy(); } catch { /* gone */ }
            playerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Loop the selection while previewing.
    useEffect(() => {
        if (!playing) return;
        const iv = window.setInterval(() => {
            const p = playerRef.current;
            if (!p) return;
            try { if (p.getCurrentTime() >= e) p.seekTo(s, true); } catch { /* */ }
        }, 300);
        return () => window.clearInterval(iv);
    }, [playing, s, e]);

    useEffect(() => {
        if (duration > 0 && (!end || end > duration)) onChange({ start: s, end: duration, duration });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration]);

    function togglePreview() {
        const p = playerRef.current;
        if (!p || !ready) return;
        if (playing) { p.pauseVideo(); return; }
        p.seekTo(s, true);
        p.playVideo();
    }

    return (
        <div>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: '#000' }}>
                <div ref={holderRef} />
            </div>
            {!ready ? (
                <div className="row muted" style={{ gap: 8, padding: '12px 0', fontSize: 13 }}>
                    <Loader2 size={15} className="spin" /> {T.ytLoading}
                </div>
            ) : (
                <div style={{ marginTop: 12 }}>
                    <ScrubBar duration={duration} start={s} end={e} playhead={playhead} peaks={null}
                        onDrag={(ns, ne) => onChange({ start: Math.round(ns), end: Math.round(ne), duration })} />
                    <Readout start={s} end={e} duration={duration}
                        onEdit={(ns, ne) => onChange({ start: Math.round(ns), end: Math.round(ne), duration })} />
                    <div className="row" style={{ marginTop: 10, gap: 10 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={togglePreview} disabled={duration <= 0}>
                            {playing ? <><Pause size={15} /> {T.stop}</> : <><Play size={15} /> {T.preview}</>}
                        </button>
                        <span className="muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Scissors size={13} /> {T.hint}
                        </span>
                    </div>
                </div>
            )}
            <style>{`.spin { animation: pk-spin 0.9s linear infinite; } @keyframes pk-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
