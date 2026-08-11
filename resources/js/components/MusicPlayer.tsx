import { useRef, useState } from 'react';
import { Music, Pause } from 'lucide-react';

export function MusicPlayer({ src }: { src: string }) {
    const ref = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);

    function toggle() {
        const a = ref.current;
        if (!a) return;
        if (playing) {
            a.pause();
            setPlaying(false);
        } else {
            a.play().then(() => setPlaying(true)).catch(() => {});
        }
    }

    return (
        <>
            <audio ref={ref} src={src} loop preload="none" />
            <button
                onClick={toggle}
                aria-label="Muzik latar"
                style={{
                    position: 'fixed', bottom: 92, right: 16, zIndex: 97,
                    width: 52, height: 52, borderRadius: '50%', border: 'none',
                    background: '#5b2a45', color: '#fff', cursor: 'pointer',
                    boxShadow: '0 10px 26px rgba(0,0,0,0.35)', display: 'grid', placeItems: 'center',
                    animation: playing ? 'spin 6s linear infinite' : 'none',
                }}
            >
                {playing ? <Pause size={22} /> : <Music size={22} />}
            </button>
        </>
    );
}
