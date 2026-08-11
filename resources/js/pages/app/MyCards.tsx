import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, ExternalLink, Trash2, Users, Eye, MailPlus } from 'lucide-react';
import { api } from '../../lib/api';

interface Card {
    id: string;
    slug: string;
    template_key: string;
    status: 'draft' | 'published';
    groom_name: string;
    bride_name: string;
    views: number;
    guests_count: number;
}
interface Tpl { id: string; key: string; name: string; tier: string; price_myr: string | number; }

export function MyCards() {
    const [cards, setCards] = useState<Card[]>([]);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [params] = useSearchParams();
    const nav = useNavigate();

    const [form, setForm] = useState({ template_key: 'floral', groom_name: '', bride_name: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        Promise.all([api.get('/invitations'), api.get('/templates')]).then(([c, t]) => {
            setCards(c.data);
            setTemplates(t.data);
            const tpl = params.get('tpl');
            if (tpl) { setForm((f) => ({ ...f, template_key: tpl })); setShowNew(true); }
        }).finally(() => setLoading(false));
    }, [params]);

    async function create(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            const r = await api.post('/invitations', form);
            nav(`/app/cards/${r.data.id}/edit`);
        } catch (err: any) {
            if (err?.response?.status === 403 && err.response.data?.requires_upgrade) {
                setShowNew(false);
                nav('/app/upgrade');
            } else {
                alert('Gagal mencipta kad. Sila cuba lagi.');
            }
        } finally {
            setCreating(false);
        }
    }

    async function remove(id: string) {
        if (!confirm('Padam kad ini?')) return;
        await api.delete(`/invitations/${id}`);
        setCards((c) => c.filter((x) => x.id !== id));
    }

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-head spread">
                <div>
                    <h1>Kad Saya</h1>
                    <p className="muted" style={{ margin: 0 }}>Urus kad kahwin digital anda</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> Cipta Kad Baharu</button>
            </div>

            {cards.length === 0 ? (
                <div className="panel center" style={{ padding: 48 }}>
                    <MailPlus size={44} color="var(--plum)" style={{ margin: '0 auto' }} />
                    <h3 style={{ marginTop: 10 }}>Belum ada kad</h3>
                    <p className="muted">Cipta kad kahwin digital pertama anda dalam beberapa minit.</p>
                    <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> Cipta Kad</button>
                </div>
            ) : (
                <div className="tpl-grid">
                    {cards.map((c) => (
                        <div className="panel" key={c.id}>
                            <div className="spread">
                                <span className="badge">{c.template_key}</span>
                                {c.status === 'published'
                                    ? <span className="badge badge-ok">Diterbitkan</span>
                                    : <span className="badge">Draf</span>}
                            </div>
                            <h3 style={{ margin: '12px 0 2px' }}>{c.bride_name} & {c.groom_name}</h3>
                            <p className="muted" style={{ fontSize: 13, margin: '0 0 14px' }}>
                                <Eye size={13} style={{ verticalAlign: -2 }} /> {c.views} tontonan · <Users size={13} style={{ verticalAlign: -2 }} /> {c.guests_count} RSVP
                            </p>
                            <div className="row wrap">
                                <Link to={`/app/cards/${c.id}/edit`} className="btn btn-ghost btn-sm"><Pencil size={14} /> Sunting</Link>
                                {c.status === 'published' && (
                                    <a href={`/e/${c.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> Lihat</a>
                                )}
                                <button className="btn btn-ghost btn-sm" onClick={() => remove(c.id)} style={{ color: 'var(--bad)' }}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showNew && (
                <div style={overlay} onClick={() => setShowNew(false)}>
                    <form className="auth-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()} onSubmit={create}>
                        <h2 style={{ marginTop: 0 }}>Cipta Kad Baharu</h2>
                        <div className="field">
                            <label>Templat</label>
                            <select value={form.template_key} onChange={(e) => setForm({ ...form, template_key: e.target.value })}>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.key}>{t.name} {t.tier === 'free' ? '(Percuma)' : `(RM${Number(t.price_myr)})`}</option>
                                ))}
                            </select>
                        </div>
                        <div className="field"><label>Nama Pengantin Lelaki</label><input value={form.groom_name} onChange={(e) => setForm({ ...form, groom_name: e.target.value })} required /></div>
                        <div className="field"><label>Nama Pengantin Perempuan</label><input value={form.bride_name} onChange={(e) => setForm({ ...form, bride_name: e.target.value })} required /></div>
                        <div className="row" style={{ marginTop: 8 }}>
                            <button type="button" className="btn btn-ghost grow" onClick={() => setShowNew(false)}>Batal</button>
                            <button className="btn btn-primary grow" disabled={creating}>{creating ? 'Mencipta…' : 'Cipta'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(42,31,45,0.5)', backdropFilter: 'blur(3px)',
    display: 'grid', placeItems: 'center', zIndex: 80, padding: 16,
};
