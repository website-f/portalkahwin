import { useEffect, useState } from 'react';

type Health = { app: string; laravel: string; php: string; database: string; supabase: string };

export default function Root() {
    const [health, setHealth] = useState<Health | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/health')
            .then((r) => r.json())
            .then(setHealth)
            .catch((e) => setError(String(e)));
    }, []);

    const row = (label: string, value: string, ok = true) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ opacity: 0.7 }}>{label}</span>
            <span style={{ fontWeight: 600, color: ok ? '#8ef5c8' : '#ff9b9b' }}>{value}</span>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'radial-gradient(1200px 600px at 50% -10%, #2a1e3f 0%, #14101f 60%)', color: '#f4f1fb', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ width: 'min(520px, 92vw)', padding: 32, borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}>
                <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.6 }}>Portal</div>
                <h1 style={{ margin: '4px 0 2px', fontSize: 34, fontWeight: 800 }}>Kahwin</h1>
                <p style={{ marginTop: 0, opacity: 0.7 }}>Laravel + React · MySQL · ToyyibPay — no Supabase.</p>
                <div style={{ marginTop: 20, fontSize: 14 }}>
                    {error && <div style={{ color: '#ff9b9b' }}>API error: {error}</div>}
                    {!health && !error && <div style={{ opacity: 0.6 }}>Pinging /api/health…</div>}
                    {health && (
                        <>
                            {row('React served by Laravel', 'OK')}
                            {row('Laravel', health.laravel)}
                            {row('PHP', health.php)}
                            {row('MySQL', health.database, health.database === 'connected')}
                            {row('Supabase', health.supabase, health.supabase === 'none')}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
