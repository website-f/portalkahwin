import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { TEMPLATE_COMPONENTS } from '../../templates/registry';
import { TemplateThumb } from '../../components/TemplateThumb';

interface Tpl {
    id?: string; key: string; name: string; category: string; description?: string;
    tier: 'free' | 'premium'; price_myr: number | string; is_active: boolean; sort_order: number;
    palette?: Record<string, string> | null;
}

const BLANK: Tpl = { key: '', name: '', category: 'floral', description: '', tier: 'free', price_myr: 0, is_active: true, sort_order: 0 };

export function AdminTemplates() {
    const [rows, setRows] = useState<Tpl[]>([]);
    const [editing, setEditing] = useState<Tpl | null>(null);
    const [loading, setLoading] = useState(true);

    function load() {
        setLoading(true);
        api.get<Tpl[]>('/admin/templates').then((r) => setRows(r.data)).finally(() => setLoading(false));
    }
    useEffect(() => { load(); }, []);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!editing) return;
        const payload = { ...editing, price_myr: Number(editing.price_myr) };
        if (editing.id) await api.put(`/admin/templates/${editing.id}`, payload);
        else await api.post('/admin/templates', payload);
        setEditing(null);
        load();
    }

    async function remove(t: Tpl) {
        if (!t.id || !confirm(`Padam templat "${t.name}"?`)) return;
        await api.delete(`/admin/templates/${t.id}`);
        load();
    }

    const componentKeys = Object.keys(TEMPLATE_COMPONENTS);

    return (
        <div>
            <div className="page-head spread">
                <div><h1>Templat</h1><p className="muted" style={{ margin: 0 }}>Urus katalog, harga & ketersediaan templat</p></div>
                <button className="btn btn-primary" onClick={() => setEditing({ ...BLANK })}><Plus size={16} /> Tambah Templat</button>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
                <div className="tpl-grid">
                    {rows.map((t) => {
                        return (
                            <div className="tpl-card" key={t.id}>
                                <div className="tpl-thumb"><TemplateThumb name={t.name} category={t.category} palette={t.palette} /></div>
                                <div className="tpl-body">
                                    <div className="spread">
                                        <h3>{t.name}</h3>
                                        {t.is_active ? <span className="badge badge-ok">Aktif</span> : <span className="badge badge-bad">Off</span>}
                                    </div>
                                    <p className="muted" style={{ fontSize: 13, margin: '4px 0 12px' }}>
                                        <span className="badge">{t.category}</span> · {t.tier === 'free' ? 'Percuma' : `RM${Number(t.price_myr)}`} · key: <code>{t.key}</code>
                                    </p>
                                    <div className="row">
                                        <button className="btn btn-ghost btn-sm grow" onClick={() => setEditing({ ...t })}><Pencil size={14} /> Sunting</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => remove(t)} style={{ color: 'var(--bad)' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editing && (
                <div style={overlay} onClick={() => setEditing(null)}>
                    <form className="auth-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()} onSubmit={save}>
                        <h2 style={{ marginTop: 0 }}>{editing.id ? 'Sunting' : 'Tambah'} Templat</h2>
                        <div className="field">
                            <label>Reka bentuk (key)</label>
                            <select value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} required>
                                <option value="" disabled>Pilih komponen reka bentuk…</option>
                                {componentKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <small className="muted">Setiap key dipetakan ke satu komponen reka bentuk beranimasi.</small>
                        </div>
                        <div className="field"><label>Nama</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></div>
                        <div className="field"><label>Kategori</label>
                            <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                                {['floral', 'motion', 'khat', 'songket', 'modern'].map((c) => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="field"><label>Penerangan</label><textarea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                        <div className="row">
                            <div className="field grow"><label>Tier</label>
                                <select value={editing.tier} onChange={(e) => setEditing({ ...editing, tier: e.target.value as 'free' | 'premium' })}>
                                    <option value="free">Percuma</option><option value="premium">Premium</option>
                                </select>
                            </div>
                            <div className="field grow"><label>Harga (RM)</label><input type="number" min={0} value={editing.price_myr} onChange={(e) => setEditing({ ...editing, price_myr: e.target.value })} /></div>
                            <div className="field" style={{ width: 90 }}><label>Susunan</label><input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
                        </div>
                        <label className="row" style={{ fontSize: 14 }}>
                            <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Aktif (papar di galeri)
                        </label>
                        <div className="row" style={{ marginTop: 12 }}>
                            <button type="button" className="btn btn-ghost grow" onClick={() => setEditing(null)}>Batal</button>
                            <button className="btn btn-primary grow">Simpan</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(42,31,45,0.5)', backdropFilter: 'blur(3px)',
    display: 'grid', placeItems: 'center', zIndex: 80, padding: 16, overflowY: 'auto',
};
