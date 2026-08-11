import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Wish { id: string; name: string; message: string; status: 'attending' | 'declined'; }

export function WishesList({ slug }: { slug: string }) {
    const [wishes, setWishes] = useState<Wish[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<Wish[]>(`/cards/${slug}/wishes`).then((r) => setWishes(r.data)).finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <div style={{ textAlign: 'center', opacity: 0.6, padding: 16 }}>Memuatkan ucapan…</div>;
    if (wishes.length === 0) {
        return <div style={{ textAlign: 'center', opacity: 0.7, padding: 16 }}>Jadilah yang pertama menghantar ucapan 💌</div>;
    }

    return (
        <div style={{ display: 'grid', gap: 12, maxWidth: 560, margin: '0 auto', maxHeight: 420, overflowY: 'auto', padding: 4 }}>
            {wishes.map((w) => (
                <div key={w.id} style={{
                    background: 'rgba(255,255,255,0.9)', color: '#2a1f2d', borderRadius: 14,
                    padding: '14px 16px', textAlign: 'left', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <strong style={{ fontSize: 14 }}>{w.name}</strong>
                        <span style={{ fontSize: 11, opacity: 0.7 }}>{w.status === 'attending' ? '🤍 Hadir' : 'Tidak hadir'}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, opacity: 0.85 }}>{w.message}</p>
                </div>
            ))}
        </div>
    );
}
