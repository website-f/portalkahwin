import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { TEMPLATE_COMPONENTS } from '../../templates/registry';
import { TemplateThumb } from '../../components/TemplateThumb';
import { Drawer } from '../../components/Drawer';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

interface Tpl {
    id?: string; key: string; name: string; category: string; description?: string;
    tier: 'free' | 'premium'; price_myr: number | string; is_active: boolean; sort_order: number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
}

const CATEGORIES = ['floral', 'motion', 'khat', 'songket', 'modern', 'batik', 'celestial', 'luxe', 'boho', 'peranakan'];

export function AdminTemplates() {
    const { lang } = useLang();
    const dialog = useDialog();
    const nav = useNavigate();
    const C = dict({
        bm: {
            title: 'Rekaan', subtitle: 'Urus katalog, harga dan ketersediaan rekaan kad.',
            designNew: 'Reka Rekaan Baharu',
            addTemplate: 'Tambah Rekaan', emptyState: 'Belum ada rekaan. Klik “Tambah Rekaan” untuk bermula.',
            active: 'Aktif', off: 'Tidak aktif', free: 'Percuma', premium: 'Premium', edit: 'Sunting',
            drawerEdit: 'Sunting Rekaan', drawerAdd: 'Tambah Rekaan', cancel: 'Batal', saving: 'Menyimpan…', save: 'Simpan',
            designKey: 'Komponen rekaan (key)', chooseComponent: 'Pilih komponen rekaan…',
            keyHint: 'Setiap key dipadankan dengan satu komponen rekaan beranimasi.',
            name: 'Nama', category: 'Kategori', description: 'Penerangan', tier: 'Pelan',
            price: 'Harga (RM)', sortOrder: 'Susunan', activeGallery: 'Aktif dan dipaparkan di galeri',
            confirmDelete: (name: string) => `Padam rekaan "${name}"?`,
        },
        en: {
            title: 'Templates', subtitle: 'Manage template catalog, pricing & availability',
            designNew: 'Design new template',
            addTemplate: 'Add template', emptyState: 'No templates yet. Click “Add template” to get started.',
            active: 'Active', off: 'Off', free: 'Free', premium: 'Premium', edit: 'Edit',
            drawerEdit: 'Edit template', drawerAdd: 'Add template', cancel: 'Cancel', saving: 'Saving…', save: 'Save',
            designKey: 'Design (key)', chooseComponent: 'Choose a design component…',
            keyHint: 'Each key maps to one animated design component.',
            name: 'Name', category: 'Category', description: 'Description', tier: 'Tier',
            price: 'Price (RM)', sortOrder: 'Sort order', activeGallery: 'Active (show in gallery)',
            confirmDelete: (name: string) => `Delete template "${name}"?`,
        },
        zh: {
            title: '请柬设计', subtitle: '管理设计目录、定价与上架状态',
            designNew: '设计新作品',
            addTemplate: '添加设计', emptyState: '暂无设计。点击「添加设计」开始。',
            active: '已上架', off: '已下架', free: '免费', premium: '付费', edit: '编辑',
            drawerEdit: '编辑设计', drawerAdd: '添加设计', cancel: '取消', saving: '保存中…', save: '保存',
            designKey: '设计标识（key）', chooseComponent: '选择一个设计组件…',
            keyHint: '每个标识对应一个动画设计组件。',
            name: '名称', category: '分类', description: '描述', tier: '类型',
            price: '价格（RM）', sortOrder: '排序', activeGallery: '上架（在作品集中显示）',
            confirmDelete: (name: string) => `确定删除设计「${name}」？`,
        },
    }, lang);

    const [rows, setRows] = useState<Tpl[]>([]);
    const [editing, setEditing] = useState<Tpl | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    function load() {
        setLoading(true);
        api.get<Tpl[]>('/admin/templates').then((r) => setRows(r.data)).finally(() => setLoading(false));
    }
    useEffect(() => { load(); }, []);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!editing) return;
        setSaving(true);
        try {
            const payload = { ...editing, price_myr: Number(editing.price_myr) };
            if (editing.id) await api.put(`/admin/templates/${editing.id}`, payload);
            else await api.post('/admin/templates', payload);
            setEditing(null);
            load();
        } finally { setSaving(false); }
    }

    async function remove(t: Tpl) {
        if (!t.id) return;
        if (!(await dialog.confirm({ message: C.confirmDelete(t.name), danger: true }))) return;
        await api.delete(`/admin/templates/${t.id}`);
        load();
    }

    const componentKeys = Object.keys(TEMPLATE_COMPONENTS);

    return (
        <div>
            <div className="page-head spread">
                <div><h1>{C.title}</h1><p className="muted" style={{ margin: 0 }}>{C.subtitle}</p></div>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={() => nav('/admin/designer')}><Sparkles size={16} /> {C.designNew}</button>
                </div>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner" /></div> : rows.length === 0 ? (
                <div className="panel center muted" style={{ padding: 40 }}>{C.emptyState}</div>
            ) : (
                <div className="tpl-grid">
                    {rows.map((t) => (
                        <div className="tpl-card" key={t.id}>
                            <div className="tpl-thumb"><TemplateThumb name={t.name} category={t.category} palette={t.palette} thumbnail={t.thumbnail} /></div>
                            <div className="tpl-body">
                                <div className="spread">
                                    <h3>{t.name}</h3>
                                    {t.is_active ? <span className="badge badge-ok">{C.active}</span> : <span className="badge badge-bad">{C.off}</span>}
                                </div>
                                <p className="muted" style={{ fontSize: 13, margin: '4px 0 12px' }}>
                                    <span className="badge">{t.category}</span> · {t.tier === 'free' ? C.free : `RM${Number(t.price_myr)}`} · key: <code>{t.key}</code>
                                </p>
                                <div className="row">
                                    <button className="btn btn-ghost btn-sm grow" onClick={() => setEditing({ ...t })}><Pencil size={14} /> {C.edit}</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => remove(t)} style={{ color: 'var(--bad)' }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Drawer
                open={!!editing}
                onClose={() => setEditing(null)}
                title={editing?.id ? C.drawerEdit : C.drawerAdd}
                width={520}
                footer={editing ? (
                    <>
                        <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>{C.cancel}</button>
                        <button type="submit" form="tpl-form" className="btn btn-primary" disabled={saving}>{saving ? C.saving : C.save}</button>
                    </>
                ) : undefined}
            >
                {editing && (
                    <form id="tpl-form" onSubmit={save} className="stack" style={{ gap: 0 }}>
                        <div className="field">
                            <label>{C.designKey}</label>
                            <select value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} required>
                                <option value="" disabled>{C.chooseComponent}</option>
                                {componentKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <small className="muted">{C.keyHint}</small>
                        </div>

                        <div className="field"><label>{C.name}</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></div>

                        <div className="field">
                            <label>{C.category}</label>
                            <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="field">
                            <label>{C.description}</label>
                            <textarea rows={3} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                        </div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 130 }}>
                                <label>{C.tier}</label>
                                <select value={editing.tier} onChange={(e) => setEditing({ ...editing, tier: e.target.value as 'free' | 'premium' })}>
                                    <option value="free">{C.free}</option><option value="premium">{C.premium}</option>
                                </select>
                            </div>
                            <div className="field grow" style={{ minWidth: 130 }}>
                                <label>{C.price}</label>
                                <input type="number" min={0} step="0.01" value={editing.price_myr} onChange={(e) => setEditing({ ...editing, price_myr: e.target.value })} />
                            </div>
                            <div className="field" style={{ width: 110 }}>
                                <label>{C.sortOrder}</label>
                                <input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                            </div>
                        </div>

                        <label className="row" style={{ fontSize: 14, marginTop: 4, cursor: 'pointer' }}>
                            <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                            {C.activeGallery}
                        </label>
                    </form>
                )}
            </Drawer>
        </div>
    );
}
