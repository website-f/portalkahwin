import { useEffect, useRef, useState } from 'react';
import { Music, Pause } from 'lucide-react';

/**
 * Floating background-music button.
 *
 * Accepts either a direct audio file URL (played via <audio>) OR a YouTube link
 * — in which case we play ONLY the audio through a hidden, off-screen YouTube
 * IFrame-API player. The video is never shown on the wedding card; the guest
 * just hears the track loop in the background.
 *
 * Playback starts on its own. Browsers block unprompted audio, so when autoplay
 * is refused we arm a one-shot listener and start on the guest's very first
 * interaction with the page — a tap, a scroll, a key. From their side the music
 * simply begins; the button is there to stop it, not to start it.
 */
export function MusicPlayer({ src }: { src: string }) {
    const ytId = youtubeId(src);
    return ytId ? <YouTubeMusic id={ytId} /> : <AudioMusic src={src} />;
}

/* ------------------------------------------------------------------ *
 * Direct audio file
 * ------------------------------------------------------------------ */
function AudioMusic({ src }: { src: string }) {
    const ref = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    // Set once the guest deliberately stops the music, so a later scroll or tap
    // does not restart something they just silenced.
    const stopped = useRef(false);

    useEffect(() => {
        const a = ref.current;
        if (!a) return;

        const start = () => {
            if (stopped.current || !ref.current) return Promise.reject();
            return ref.current.play().then(() => setPlaying(true));
        };

        void start().catch(() => armFirstGesture(start));
    }, [src]);

    function toggle() {
        const a = ref.current;
        if (!a) return;
        if (playing) {
            stopped.current = true;
            a.pause();
            setPlaying(false);
        } else {
            stopped.current = false;
            a.play().then(() => setPlaying(true)).catch(() => {});
        }
    }

    return (
        <>
            <audio ref={ref} src={src} loop preload="auto" />
            <button onClick={toggle} aria-label="Muzik latar" style={fabStyle(playing, true)}>
                {playing ? <Pause size={22} /> : <Music size={22} />}
            </button>
        </>
    );
}

/* ------------------------------------------------------------------ *
 * YouTube-backed audio (hidden player)
 * ------------------------------------------------------------------ */
function YouTubeMusic({ id }: { id: string }) {
    const holderRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const stopped = useRef(false);

    useEffect(() => {
        let cancelled = false;
        loadYT()
            .then((YT) => {
                if (cancelled || !holderRef.current) return;
                playerRef.current = new YT.Player(holderRef.current, {
                    videoId: id,
                    width: '240',
                    height: '180',
                    playerVars: {
                        autoplay: 0,
                        controls: 0,
                        disablekb: 1,
                        fs: 0,
                        modestbranding: 1,
                        rel: 0,
                        playsinline: 1,
                        // loop needs an explicit single-item playlist to repeat.
                        loop: 1,
                        playlist: id,
                        // Start muted: an unmuted autoplay is refused outright,
                        // whereas a muted one is allowed and can then be unmuted.
                        mute: 1,
                    },
                    events: {
                        onReady: (e: YTPlayerEvent) => {
                            if (cancelled) return;
                            setReady(true);
                            // Muted autoplay is always allowed; unmute right after
                            // so the track is audible without the guest tapping.
                            const p = e.target;
                            try {
                                p.playVideo();
                                window.setTimeout(() => { if (!cancelled && !stopped.current) p.unMute(); }, 250);
                            } catch { /* blocked — the gesture listener below covers it */ }
                            armFirstGesture(() => {
                                if (stopped.current) return Promise.reject();
                                p.unMute();
                                p.playVideo();
                                return Promise.resolve();
                            });
                        },
                        onStateChange: (e: YTPlayerEvent) => {
                            if (cancelled) return;
                            setPlaying(e.data === YT.PlayerState.PLAYING);
                            // Belt-and-braces loop: replay if it ever reaches the end.
                            if (e.data === YT.PlayerState.ENDED) e.target.playVideo();
                        },
                    },
                });
            })
            .catch(() => {});

        return () => {
            cancelled = true;
            try { playerRef.current?.destroy(); } catch { /* already gone */ }
            playerRef.current = null;
        };
    }, [id]);

    function toggle() {
        const p = playerRef.current;
        if (!p || !ready) return;
        if (playing) {
            stopped.current = true;
            p.pauseVideo();
        } else {
            stopped.current = false;
            p.unMute();
            p.playVideo();
        }
    }

    return (
        <>
            {/* Off-screen, clipped 1×1 holder — the iframe lives here so its audio
                plays while the video is never visible on the card. */}
            <div
                aria-hidden="true"
                style={{ position: 'fixed', left: -9999, top: -9999, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
            >
                <div ref={holderRef} />
            </div>
            <button onClick={toggle} aria-label="Muzik latar" disabled={!ready} style={fabStyle(playing, ready)}>
                {playing ? <Pause size={22} /> : <Music size={22} />}
            </button>
        </>
    );
}

/**
 * Run `start` on the page's first user gesture, then stop listening.
 *
 * Autoplay policies unblock audio the moment a page receives any real
 * interaction, so this turns "blocked" into "starts a heartbeat later" rather
 * than "never plays unless they find the button".
 */
function armFirstGesture(start: () => Promise<unknown>): void {
    const events = ['pointerdown', 'touchstart', 'keydown', 'scroll'] as const;
    const fire = () => {
        void start().catch(() => {});
        events.forEach((e) => window.removeEventListener(e, fire));
    };
    events.forEach((e) => window.addEventListener(e, fire, { once: true, passive: true }));
}

/* ------------------------------------------------------------------ *
 * Shared FAB style
 * ------------------------------------------------------------------ */
function fabStyle(playing: boolean, ready: boolean): React.CSSProperties {
    return {
        position: 'fixed', bottom: 92, right: 16, zIndex: 97,
        width: 52, height: 52, borderRadius: '50%', border: 'none',
        background: '#5b2a45', color: '#fff', cursor: ready ? 'pointer' : 'default',
        boxShadow: '0 10px 26px rgba(0,0,0,0.35)', display: 'grid', placeItems: 'center',
        opacity: ready ? 1 : 0.55,
        animation: playing ? 'spin 6s linear infinite' : 'none',
    };
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Extract a YouTube video id from the common URL shapes; null if not YouTube. */
export function youtubeId(url: string): string | null {
    if (!url) return null;
    try {
        const u = new URL(url.trim());
        const host = u.hostname.replace(/^www\./, '').replace(/^music\./, '').replace(/^m\./, '');
        if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
        if (host === 'youtube.com') {
            if (u.pathname === '/watch') return u.searchParams.get('v');
            const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/);
            if (m) return m[1];
        }
        return null;
    } catch {
        return null;
    }
}

/* ---- Minimal YouTube IFrame API typings (only what we use) ---- */
interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    unMute(): void;
    destroy(): void;
}
interface YTPlayerEvent {
    target: YTPlayer;
    data: number;
}
interface YTPlayerOptions {
    videoId: string;
    width?: string;
    height?: string;
    playerVars?: Record<string, string | number>;
    events?: {
        onReady?: (e: YTPlayerEvent) => void;
        onStateChange?: (e: YTPlayerEvent) => void;
    };
}
interface YTNamespace {
    Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer;
    PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let ytApiPromise: Promise<YTNamespace> | null = null;

/** Load the YouTube IFrame API once and resolve with the global namespace. */
function loadYT(): Promise<YTNamespace> {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise<YTNamespace>((resolve) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            if (window.YT) resolve(window.YT);
        };
        if (!document.querySelector('script[data-yt-iframe]')) {
            const s = document.createElement('script');
            s.src = 'https://www.youtube.com/iframe_api';
            s.async = true;
            s.setAttribute('data-yt-iframe', '');
            document.head.appendChild(s);
        }
    });
    return ytApiPromise;
}
