import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Images } from 'lucide-react';
import { api } from '../../lib/api';
import { TEMPLATE_COMPONENTS } from '../../templates/registry';
import { TemplateCard } from '../../components/TemplateCard';
import { TemplateThumb } from '../../components/TemplateThumb';
import { ThumbnailStage, type ThumbJob } from '../../components/ThumbnailStage';
import { Drawer } from '../../components/Drawer';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

interface Tpl {
    id?: string; key: string; name: string; category: string; description?: string;
    tier: 'free' | 'premium'; price_myr: number | string; is_active: boolean; sort_order: number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
    config?: Record<string, unknown> | null;
    usage_count?: number;
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
            active: 'Aktif', off: 'Tidak aktif', free: 'Percuma', premium: 'Premium', edit: 'Sunting', remove: 'Padam',
            regen: 'Jana Semua Thumbnail', regenOne: 'Jana Semula Thumbnail',
            coverLabel: 'Gambar Kulit', coverHint: 'Kad menunjukkan rekaan sebenar secara langsung. Jana thumbnail hanya jika anda mahu imej tetap yang lebih ringan.',
            regenBusy: (a: number, b: number) => `Menjana ${a} / ${b}…`,
            regenDone: (n: number) => `${n} thumbnail dijana.`,
            regenFailed: (n: number) => `${n} gagal dijana.`,
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
            active: 'Active', off: 'Off', free: 'Free', premium: 'Premium', edit: 'Edit', remove: 'Delete',
            regen: 'Regenerate all thumbnails', regenOne: 'Regenerate thumbnail',
            coverLabel: 'Cover image', coverHint: 'Cards render the real design live. Generate a thumbnail only if you want a lighter static image.',
            regenBusy: (a: number, b: number) => `Capturing ${a} / ${b}…`,
            regenDone: (n: number) => `${n} thumbnails generated.`,
            regenFailed: (n: number) => `${n} failed.`,
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
            active: '已上架', off: '已下架', free: '免费', premium: '付费', edit: '编辑', remove: '删除',
            regen: '重新生成全部缩略图', regenOne: '重新生成缩略图',
            coverLabel: '封面图', coverHint: '卡片会实时渲染真实设计。仅在需要更轻量的静态图时才生成缩略图。',
            regenBusy: (a: number, b: number) => `正在生成 ${a} / ${b}…`,
            regenDone: (n: number) => `已生成 ${n} 张缩略图。`,
            regenFailed: (n: number) => `${n} 张失败。`,
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

    // ---- Thumbnail generation -------------------------------------------
    // Covers are captured in the browser from the real template, one at a time
    // so a 20-design run never renders 20 animated templates at once.
    const [queue, setQueue] = useState<ThumbJob[]>([]);
    const [queueTotal, setQueueTotal] = useState(0);
    const [failures, setFailures] = useState(0);
    const [note, setNote] = useState<string | null>(null);

    const toJob = (t: Tpl): ThumbJob => ({ id: t.id!, key: t.key, baseKey: t.base_key, config: t.config as ThumbJob['config'] });

    function regenerate(list: Tpl[]) {
        const jobs = list.filter((t) => t.id).map(toJob);
        setFailures(0);
        setNote(null);
        setQueueTotal(jobs.length);
        setQueue(jobs);
    }

    const finishJob = useCallback((remaining: ThumbJob[], failed: number) => {
        setQueue(remaining);
        if (remaining.length === 0) {
            setQueueTotal(0);
            load();
            setNote(failed > 0 ? C.regenFailed(failed) : null);
        }
    }, [C]);

    const onCaptured = useCallback(async (job: ThumbJob, image: string) => {
        let failed = failures;
        try {
            await api.post(`/admin/templates/${job.id}/thumbnail`, { image });
        } catch {
            failed += 1;
            setFailures(failed);
        }
        setQueue((q) => {
            const rest = q.slice(1);
            if (rest.length === 0) { setQueueTotal(0); load(); }
            return rest;
        });
    }, [failures]);

    const onFailed = useCallback((_job: ThumbJob) => {
        setFailures((f) => f + 1);
        setQueue((q) => {
            const rest = q.slice(1);
            if (rest.length === 0) { setQueueTotal(0); load(); }
            return rest;
        });
    }, []);

    const capturing = queue.length > 0;
    const capturedSoFar = queueTotal - queue.length + 1;

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
                    <button className="btn btn-ghost" disabled={capturing} onClick={() => regenerate(rows)}>
                        <Images size={16} /> {capturing ? C.regenBusy(capturedSoFar, queueTotal) : C.regen}
                    </button>
                    <button className="btn btn-primary" onClick={() => nav('/admin/designer')}><Sparkles size={16} /> {C.designNew}</button>
                </div>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner" /></div> : rows.length === 0 ? (
                <div className="panel center muted" style={{ padding: 40 }}>{C.emptyState}</div>
            ) : (
                // Same card as every other template listing; only the actions are
                // admin ones. An inactive design is dimmed rather than restyled,
                // so the catalogue still reads at a glance.
                <div className="gal-grid">
                    {rows.map((t) => (
                        <div key={t.id} style={t.is_active ? undefined : { opacity: 0.5 }}>
                            <TemplateCard
                                t={t}
                                labels={{ free: C.free, popular: 'POPULAR' }}
                                deviceTo={`/templates/${t.key}`}
                                actions={[
                                    { label: C.edit, onClick: () => setEditing({ ...t }) },
                                    { label: C.remove, onClick: () => remove(t), tone: 'danger' as const },
                                ]}
                            />
                        </div>
                    ))}
                </div>
            )}

            {note && <p className="muted" style={{ marginTop: 14 }}>{note}</p>}

            {/* Off-screen render target for the capture queue. */}
            <ThumbnailStage job={queue[0] ?? null} onCaptured={onCaptured} onFailed={onFailed} />

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
                        {/* Regenerating the cover belongs with the design's own
                            settings, not in the card's action strip where it
                            competed with edit and delete. */}
                        {editing.id && (
                            <div className="field">
                                <label>{C.coverLabel}</label>
                                <div className="row wrap" style={{ gap: 10, alignItems: 'center' }}>
                                    <span className="gal-device" style={{ width: 74, flex: 'none' }}>
                                        <span className="gal-screen">
                                            <TemplateThumb
                                                name={editing.name}
                                                category={editing.category}
                                                palette={editing.palette}
                                                thumbnail={editing.thumbnail}
                                                templateKey={editing.key}
                                                baseKey={editing.base_key}
                                            />
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        disabled={capturing}
                                        onClick={() => regenerate([editing])}
                                    >
                                        <Images size={15} /> {capturing ? C.regenBusy(capturedSoFar, queueTotal) : C.regenOne}
                                    </button>
                                </div>
                                <small className="muted" style={{ display: 'block', marginTop: 6 }}>{C.coverHint}</small>
                            </div>
                        )}
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
