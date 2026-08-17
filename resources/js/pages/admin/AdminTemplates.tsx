import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Images } from 'lucide-react';
import { api } from '../../lib/api';
import { TemplateCard } from '../../components/TemplateCard';
import { ThumbnailStage, type ThumbJob } from '../../components/ThumbnailStage';
import { builtinToConfig } from '../../templates/builtinToConfig';
import { useLang, dict } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

interface Tpl {
    id?: string; key: string; name: string; category: string; description?: string;
    tier: 'free' | 'premium'; price_myr: number | string; discount_price_myr?: number | string | null;
    is_active: boolean; sort_order: number;
    languages?: string[] | null;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
    config?: Record<string, unknown> | null;
    usage_count?: number;
}

export function AdminTemplates() {
    const { lang } = useLang();
    const dialog = useDialog();
    const nav = useNavigate();
    const C = dict({
        bm: {
            title: 'Rekaan', subtitle: 'Urus katalog, harga dan ketersediaan rekaan kad.',
            designNew: 'Reka Rekaan Baharu',
            emptyState: 'Belum ada rekaan. Klik “Reka Rekaan Baharu” untuk bermula.',
            free: 'Percuma', edit: 'Sunting', copy: 'Salin', remove: 'Padam',
            regen: 'Jana Semua Thumbnail',
            regenBusy: (a: number, b: number) => `Menjana ${a} / ${b}…`,
            regenFailed: (n: number) => `${n} gagal dijana.`,
            confirmDelete: (name: string) => `Padam rekaan "${name}"?`,
            copyFailed: 'Gagal menyalin rekaan.',
        },
        en: {
            title: 'Templates', subtitle: 'Manage template catalog, pricing & availability',
            designNew: 'Design new template',
            emptyState: 'No templates yet. Click “Design new template” to get started.',
            free: 'Free', edit: 'Edit', copy: 'Copy', remove: 'Delete',
            regen: 'Regenerate all thumbnails',
            regenBusy: (a: number, b: number) => `Capturing ${a} / ${b}…`,
            regenFailed: (n: number) => `${n} failed.`,
            confirmDelete: (name: string) => `Delete template "${name}"?`,
            copyFailed: 'Could not copy the design.',
        },
        zh: {
            title: '请柬设计', subtitle: '管理设计目录、定价与上架状态',
            designNew: '设计新作品',
            emptyState: '暂无设计。点击「设计新作品」开始。',
            free: '免费', edit: '编辑', copy: '复制', remove: '删除',
            regen: '重新生成全部缩略图',
            regenBusy: (a: number, b: number) => `正在生成 ${a} / ${b}…`,
            regenFailed: (n: number) => `${n} 张失败。`,
            confirmDelete: (name: string) => `确定删除设计「${name}」？`,
            copyFailed: '复制设计失败。',
        },
    }, lang);

    const [rows, setRows] = useState<Tpl[]>([]);
    const [loading, setLoading] = useState(true);

    function load() {
        setLoading(true);
        api.get<Tpl[]>('/admin/templates').then((r) => setRows(r.data)).finally(() => setLoading(false));
    }
    useEffect(() => { load(); }, []);

    // ---- Thumbnail generation (bulk) ------------------------------------
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

    const onCaptured = useCallback(async (job: ThumbJob, image: string) => {
        try {
            await api.post(`/admin/templates/${job.id}/thumbnail`, { image });
        } catch {
            setFailures((f) => f + 1);
        }
        setQueue((q) => {
            const rest = q.slice(1);
            if (rest.length === 0) { setQueueTotal(0); load(); }
            return rest;
        });
    }, []);

    const onFailed = useCallback((_job: ThumbJob) => {
        setFailures((f) => f + 1);
        setQueue((q) => {
            const rest = q.slice(1);
            if (rest.length === 0) { setQueueTotal(0); load(); }
            return rest;
        });
    }, []);

    useEffect(() => {
        if (queueTotal > 0 || queue.length > 0) return;
        if (failures > 0) setNote(C.regenFailed(failures));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queueTotal, queue.length]);

    const capturing = queue.length > 0;
    const capturedSoFar = queueTotal - queue.length + 1;

    async function remove(t: Tpl) {
        if (!t.id) return;
        if (!(await dialog.confirm({ message: C.confirmDelete(t.name), danger: true }))) return;
        await api.delete(`/admin/templates/${t.id}`);
        load();
    }

    /**
     * Copy a design into a fully-editable no-code design, then open it in the
     * Designer. A custom source clones its config verbatim; a built-in (React-
     * coded) source is translated into a complete config — same colours + a
     * matching cover / effect / decoration — so every tab is there to customise.
     */
    async function duplicate(t: Tpl) {
        if (!t.id) return;
        try {
            const config = t.base_key === 'custom'
                ? (t.config ?? {})
                : builtinToConfig(t.base_key || t.key, t.palette, t.category);
            const r = await api.post<{ id: string }>('/me/designs', {
                name: `${t.name} (Copy)`,
                category: t.category ?? 'custom',
                description: t.description ?? undefined,
                config,
                // Carry the source's pricing across (admin-only on the backend).
                tier: t.tier,
                price_myr: Number(t.price_myr) || 0,
                discount_price_myr: t.discount_price_myr == null || t.discount_price_myr === '' ? null : Number(t.discount_price_myr),
            });
            nav(`/admin/designer/${r.data.id}`);
        } catch {
            await dialog.alert({ message: C.copyFailed });
        }
    }

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
                                // Every design edits in the Designer — the same create
                                // layout, pre-filled, with pricing in its Details tab. A
                                // no-code design gets all tabs; a built-in gets Theme +
                                // Details (colours + listing). Copy clones it into the
                                // Designer; Delete removes it.
                                actions={[
                                    { label: C.edit, onClick: () => nav(`/admin/designer/${t.id}`) },
                                    { label: C.copy, onClick: () => duplicate(t) },
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
        </div>
    );
}
