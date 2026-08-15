import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Lock, Layers } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { api } from '../../lib/api';
import { Drawer } from '../../components/Drawer';
import { useLang, dict } from '../../context/LangContext';

/* ----------------------------- types ----------------------------- */

type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'tel' | 'url' | 'date' | 'select' | 'radio' | 'multiselect' | 'checkbox' | 'logo';
type FieldRole = 'user' | 'vendor' | 'affiliate';

interface ProfileField {
    id: string;
    group_key: string;
    group_label: string;   // the tab name
    key: string;           // machine key (backend derives from label if blank on create)
    label: string;
    type: FieldType;
    options: string[];     // for type 'select'
    roles: string[];       // subset of ['user','vendor','affiliate']
    required: boolean;
    sort: number;
    is_active: boolean;
    system: boolean;       // built-in receipt fields: key + type locked, cannot delete
}

/** Editable draft for the drawer. `optionsText` is the raw textarea; it is
 *  parsed to string[] on save and joined with newlines when an existing field
 *  is loaded. `id` absent means a brand-new field. */
interface FieldDraft {
    id?: string;
    group_key: string;
    group_label: string;
    key: string;
    label: string;
    type: FieldType;
    optionsText: string;
    roles: FieldRole[];
    required: boolean;
    sort: number;
    is_active: boolean;
    system: boolean;
}

const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'number', 'email', 'tel', 'url', 'date', 'select', 'radio', 'multiselect', 'checkbox', 'logo'];
/** Types whose choices come from the options list. */
const TYPES_WITH_OPTIONS: FieldType[] = ['select', 'radio', 'multiselect'];
const ROLES: FieldRole[] = ['user', 'vendor', 'affiliate'];

const BLANK_DRAFT: FieldDraft = {
    group_key: '', group_label: '', key: '', label: '', type: 'text',
    optionsText: '', roles: ['user'], required: false, sort: 0, is_active: true, system: false,
};

const isRole = (r: string): r is FieldRole => r === 'user' || r === 'vendor' || r === 'affiliate';

/** One option per line → trimmed, non-empty list. */
const parseOptions = (text: string): string[] => text.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);

/** Pull a human message out of a failed request: first validation error, then
 *  the plain message, then a generic fallback. */
function firstError(e: unknown, fallback: string): string {
    if (typeof e === 'object' && e !== null && 'response' in e) {
        const resp = (e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response;
        const errors = resp?.data?.errors;
        if (errors) {
            const key = Object.keys(errors)[0];
            const msg = key ? errors[key]?.[0] : undefined;
            if (msg) return msg;
        }
        if (resp?.data?.message) return resp.data.message;
    }
    return fallback;
}

/* --------------------------- component --------------------------- */

export function AdminProfileFields() {
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Medan Profil',
            subtitle: 'Medan yang dikumpulkan di bawah nama tab yang sama akan muncul sebagai satu tab dalam profil akaun/syarikat pengguna. Nama kumpulan baharu mencipta tab baharu.',
            addField: 'Tambah Medan',
            fieldsN: (n: number) => `${n} medan`,
            brandingTitle: 'Benarkan vendor & affiliate guna perniagaan sendiri pada resit',
            brandingHint: 'Apabila dimatikan, semua resit menggunakan identiti platform tanpa mengira tetapan perniagaan penjual.',
            addToGroup: 'Tambah medan',
            required: 'Wajib', inactive: 'Tidak aktif', system: 'Sistem', locked: 'Medan sistem',
            edit: 'Sunting', del: 'Padam', cancel: 'Batal', save: 'Simpan', saving: 'Menyimpan…',
            drawerAdd: 'Tambah Medan', drawerEdit: 'Sunting Medan',
            groupLabel: 'Nama tab (kumpulan)', groupPlaceholder: 'cth. Perniagaan, Butiran kerja',
            groupHint: 'Medan dengan nama tab yang sama muncul bersama dalam satu tab. Nama baharu mencipta tab baharu.',
            fieldLabel: 'Label medan',
            machineKey: 'Kunci mesin', keyHint: 'Dijana automatik daripada label.',
            keyLockedHint: 'Medan sistem — kunci tidak boleh diubah.',
            fieldType: 'Jenis', typeLockedHint: 'Jenis dikunci untuk medan sistem.',
            options: 'Pilihan (satu baris satu pilihan)',
            optionsPlaceholder: 'Pilihan A\nPilihan B\nPilihan C',
            optionsHint: 'Setiap baris menjadi satu pilihan dalam senarai.',
            roles: 'Diisi oleh peranan', rolesHint: 'Pilih sekurang-kurangnya satu peranan yang akan mengisi medan ini.',
            active: 'Aktif', sort: 'Susunan',
            errRoles: 'Pilih sekurang-kurangnya satu peranan.',
            errGeneric: 'Sesuatu tidak kena. Sila cuba lagi.',
            confirmDelete: (l: string) => `Padam medan "${l}"?`,
            empty: 'Belum ada medan profil. Klik "Tambah Medan" untuk mula.',
            importFrom: 'Salin daripada medan sedia ada', importNone: '— Mula dari kosong —',
            importHint: 'Guna semula konfigurasi medan lain (termasuk untuk peranan berbeza), kemudian laraskan peranannya.',
            t_text: 'Teks', t_textarea: 'Teks panjang', t_number: 'Nombor', t_email: 'E-mel', t_tel: 'Telefon', t_url: 'Pautan (URL)', t_date: 'Tarikh', t_select: 'Senarai juntai', t_radio: 'Pilihan tunggal', t_multiselect: 'Pilihan berbilang', t_checkbox: 'Kotak semak (ya/tidak)', t_logo: 'Logo / imej',
            r_user: 'Pengguna', r_vendor: 'Vendor', r_affiliate: 'Affiliate',
        },
        en: {
            title: 'Profile Fields',
            subtitle: 'Fields grouped under the same tab name appear as one tab in a user\'s account/company profile. A new group name creates a new tab.',
            addField: 'Add field',
            fieldsN: (n: number) => `${n} field${n === 1 ? '' : 's'}`,
            brandingTitle: 'Allow vendors & affiliates to use their own business on receipts',
            brandingHint: 'When off, all receipts use the platform identity regardless of a seller\'s own setting.',
            addToGroup: 'Add field',
            required: 'Required', inactive: 'Inactive', system: 'System', locked: 'System field',
            edit: 'Edit', del: 'Delete', cancel: 'Cancel', save: 'Save', saving: 'Saving…',
            drawerAdd: 'Add field', drawerEdit: 'Edit field',
            groupLabel: 'Tab (group) name', groupPlaceholder: 'e.g. Business, Job details',
            groupHint: 'Fields with the same tab name appear together in one tab. A new name creates a new tab.',
            fieldLabel: 'Field label',
            machineKey: 'Machine key', keyHint: 'Generated automatically from the label.',
            keyLockedHint: 'System field — the key cannot be changed.',
            fieldType: 'Type', typeLockedHint: 'Type is locked for system fields.',
            options: 'Options (one per line)',
            optionsPlaceholder: 'Option A\nOption B\nOption C',
            optionsHint: 'Each line becomes one option in the dropdown.',
            roles: 'Filled in by roles', rolesHint: 'Pick at least one role that will fill in this field.',
            active: 'Active', sort: 'Sort',
            errRoles: 'Pick at least one role.',
            errGeneric: 'Something went wrong. Please try again.',
            confirmDelete: (l: string) => `Delete field "${l}"?`,
            empty: 'No profile fields yet. Click "Add field" to start.',
            importFrom: 'Copy from an existing field', importNone: '— Start blank —',
            importHint: 'Reuse another field\'s setup (including from other roles), then adjust its roles.',
            t_text: 'Text', t_textarea: 'Long text', t_number: 'Number', t_email: 'Email', t_tel: 'Phone', t_url: 'URL / link', t_date: 'Date', t_select: 'Dropdown', t_radio: 'Single choice', t_multiselect: 'Multiple choice', t_checkbox: 'Checkbox (yes/no)', t_logo: 'Logo / image',
            r_user: 'User', r_vendor: 'Vendor', r_affiliate: 'Affiliate',
        },
        zh: {
            title: '资料字段',
            subtitle: '归入同一标签名称的字段会在用户的账户/公司资料中显示为一个标签页。新的分组名称会生成新的标签页。',
            addField: '添加字段',
            fieldsN: (n: number) => `${n} 个字段`,
            brandingTitle: '允许商家与联盟伙伴在收据上使用自己的商号',
            brandingHint: '关闭后，无论卖家自身如何设置，所有收据都使用平台的信息。',
            addToGroup: '添加字段',
            required: '必填', inactive: '未启用', system: '系统', locked: '系统字段',
            edit: '编辑', del: '删除', cancel: '取消', save: '保存', saving: '保存中…',
            drawerAdd: '添加字段', drawerEdit: '编辑字段',
            groupLabel: '标签（分组）名称', groupPlaceholder: '例如：业务、职位信息',
            groupHint: '标签名称相同的字段会集中显示在同一标签页。新名称会生成新的标签页。',
            fieldLabel: '字段标签',
            machineKey: '机器键名', keyHint: '根据标签自动生成。',
            keyLockedHint: '系统字段——键名无法更改。',
            fieldType: '类型', typeLockedHint: '系统字段的类型已锁定。',
            options: '选项（每行一个）',
            optionsPlaceholder: '选项 A\n选项 B\n选项 C',
            optionsHint: '每一行会成为下拉列表中的一个选项。',
            roles: '由以下身份填写', rolesHint: '至少选择一个将填写此字段的身份。',
            active: '启用', sort: '排序',
            errRoles: '请至少选择一个身份。',
            errGeneric: '出了点问题，请重试。',
            confirmDelete: (l: string) => `删除字段“${l}”？`,
            empty: '暂无资料字段。点击「添加字段」开始。',
            importFrom: '从现有字段复制', importNone: '— 从空白开始 —',
            importHint: '复用其他字段（包括其他身份）的配置，然后调整其适用身份。',
            t_text: '文本', t_textarea: '长文本', t_number: '数字', t_email: '电子邮箱', t_tel: '电话', t_url: '网址', t_date: '日期', t_select: '下拉选择', t_radio: '单选', t_multiselect: '多选', t_checkbox: '复选框（是/否）', t_logo: '标志 / 图片',
            r_user: '用户', r_vendor: '商家', r_affiliate: '联盟伙伴',
        },
    }, lang);

    const typeLabel = (t: FieldType) => C[`t_${t}` as keyof typeof C] as string;
    const roleLabel = (r: FieldRole) => C[`r_${r}` as keyof typeof C] as string;

    /* ---- data ---- */
    const [fields, setFields] = useState<ProfileField[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFields = () => api.get<ProfileField[]>('/admin/profile-fields').then((r) => setFields(r.data));

    useEffect(() => {
        loadFields().finally(() => setLoading(false));
    }, []);

    /* ---- grouping ---- */
    // Group by group_key (stable machine key) but title each section with the
    // group_label — two labels never share a key on the server.
    const groups = useMemo(() => {
        const map = new Map<string, { group_key: string; group_label: string; fields: ProfileField[] }>();
        for (const f of fields) {
            const g = map.get(f.group_key) ?? { group_key: f.group_key, group_label: f.group_label, fields: [] };
            g.fields.push(f);
            map.set(f.group_key, g);
        }
        const arr = Array.from(map.values());
        for (const g of arr) g.fields.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
        return arr;
    }, [fields]);

    /* ---- drawer / editing ---- */
    const [draft, setDraft] = useState<FieldDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function openCreate(group?: { group_key: string; group_label: string }) {
        setErr(null);
        setDraft({ ...BLANK_DRAFT, group_key: group?.group_key ?? '', group_label: group?.group_label ?? '' });
    }

    function openEdit(f: ProfileField) {
        setErr(null);
        setDraft({
            id: f.id,
            group_key: f.group_key,
            group_label: f.group_label,
            key: f.key,
            label: f.label,
            type: f.type,
            optionsText: (f.options ?? []).join('\n'),
            roles: (f.roles ?? []).filter(isRole),
            required: f.required,
            sort: f.sort,
            is_active: f.is_active,
            system: f.system,
        });
    }

    // Import: prefill the (new) draft from any existing field — the fast way to
    // reuse a field across roles. Lands in the source's group; roles stay editable.
    function copyFrom(id: string) {
        const src = fields.find((f) => f.id === id);
        if (!src) return;
        setErr(null);
        setDraft({
            group_key: src.group_key,
            group_label: src.group_label,
            key: '',
            label: src.label,
            type: src.type,
            optionsText: (src.options ?? []).join('\n'),
            roles: (src.roles ?? []).filter(isRole),
            required: src.required,
            sort: src.sort,
            is_active: true,
            system: false,
        });
    }

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!draft) return;
        if (draft.roles.length === 0) { setErr(C.errRoles); return; }
        setSaving(true);
        setErr(null);
        try {
            const payload: {
                group_label: string; group_key?: string; label: string; type: FieldType;
                options: string[]; roles: string[]; required: boolean; sort: number; is_active: boolean;
            } = {
                group_label: draft.group_label.trim(),
                label: draft.label.trim(),
                type: draft.type,
                options: TYPES_WITH_OPTIONS.includes(draft.type) ? parseOptions(draft.optionsText) : [],
                roles: draft.roles,
                required: draft.required,
                sort: Number(draft.sort),
                is_active: draft.is_active,
            };
            // Send group_key only when adding to / editing an existing group;
            // a blank key lets the backend derive a fresh key for a new tab.
            if (draft.group_key) payload.group_key = draft.group_key;

            if (draft.id) await api.put(`/admin/profile-fields/${draft.id}`, payload);
            else await api.post('/admin/profile-fields', payload);
            setDraft(null);
            await loadFields();
        } catch (ex) {
            setErr(firstError(ex, C.errGeneric));
        } finally {
            setSaving(false);
        }
    }

    // System fields are not deletable — guarded here and hidden in the UI, but
    // still surfaced if the backend refuses (409/403).
    async function removeField(f: Pick<ProfileField, 'id' | 'label' | 'system'>) {
        if (f.system) return;
        if (!window.confirm(C.confirmDelete(f.label))) return;
        try {
            await api.delete(`/admin/profile-fields/${f.id}`);
            setDraft(null);
            await loadFields();
        } catch (e) {
            window.alert(firstError(e, C.errGeneric));
        }
    }

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {/* Header row: count + add. */}
            <div className="spread wrap" style={{ gap: 12, margin: '0 auto 18px', maxWidth: 900 }}>
                <p className="muted" style={{ margin: 0 }}>{C.fieldsN(fields.length)}</p>
                <button className="btn btn-primary" onClick={() => openCreate()}><Plus size={16} /> {C.addField}</button>
            </div>

            {/* Grouped field list. */}
            {groups.length === 0 ? (
                <div className="panel center muted" style={{ padding: 40, maxWidth: 900, margin: '0 auto' }}>{C.empty}</div>
            ) : (
                groups.map((g) => (
                    <div className="panel" key={g.group_key} style={{ maxWidth: 900, margin: '0 auto 18px' }}>
                        <div className="spread wrap" style={{ marginBottom: 10, gap: 10 }}>
                            <div className="row" style={{ gap: 10 }}>
                                <div style={sectionIcon}><Layers size={16} /></div>
                                <h3 style={{ margin: 0 }}>{g.group_label}</h3>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => openCreate(g)}>
                                <Plus size={14} /> {C.addToGroup}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {g.fields.map((f, i) => (
                                <div
                                    key={f.id}
                                    className="spread wrap"
                                    style={{
                                        gap: 12, rowGap: 8, padding: '12px 0', alignItems: 'flex-start',
                                        borderBottom: i === g.fields.length - 1 ? 'none' : '1px solid var(--line)',
                                    }}
                                >
                                    <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                                        <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: 14.5 }}>{f.label}</span>
                                            <span className="badge">{typeLabel(f.type)}</span>
                                            {f.required && <span className="badge">{C.required}</span>}
                                            {!f.is_active && <span className="badge badge-bad">{C.inactive}</span>}
                                            {f.system && <span className="badge badge-gold">{C.system}</span>}
                                        </div>
                                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}><code>{f.key}</code></div>
                                        <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                                            {ROLES.filter((r) => (f.roles ?? []).includes(r)).map((r) => (
                                                <span key={r} className="badge badge-ok">{roleLabel(r)}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}>
                                            <Pencil size={14} /> {C.edit}
                                        </button>
                                        {f.system ? (
                                            <span className="row muted" style={{ gap: 4, fontSize: 12 }}>
                                                <Lock size={13} /> {C.locked}
                                            </span>
                                        ) : (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => void removeField(f)}
                                                style={{ color: 'var(--bad)' }}
                                                aria-label={C.del}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* ---------------- FIELD DRAWER ---------------- */}
            <Drawer
                open={!!draft}
                onClose={() => setDraft(null)}
                title={draft?.id ? C.drawerEdit : C.drawerAdd}
                width={520}
                footer={draft ? (
                    <>
                        {draft.id && !draft.system && (
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ color: 'var(--bad)', marginRight: 'auto' }}
                                onClick={() => void removeField({ id: draft.id!, label: draft.label, system: draft.system })}
                            >
                                <Trash2 size={15} /> {C.del}
                            </button>
                        )}
                        <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>{C.cancel}</button>
                        <button type="submit" form="field-form" className="btn btn-primary" disabled={saving}>{saving ? C.saving : C.save}</button>
                    </>
                ) : undefined}
            >
                {draft && (
                    <form id="field-form" onSubmit={save} className="stack" style={{ gap: 0 }}>
                        {err && (
                            <div style={{
                                background: 'var(--cream)', border: '1px solid var(--bad)', color: 'var(--bad)',
                                borderRadius: 9, padding: '9px 12px', fontSize: 13, marginBottom: 14,
                            }}>
                                {err}
                            </div>
                        )}

                        {/* Import: reuse an existing field's setup (incl. from other roles). Create-mode only. */}
                        {!draft.id && fields.length > 0 && (
                            <div className="field">
                                <label>{C.importFrom}</label>
                                <select value="" onChange={(e) => { if (e.target.value) copyFrom(e.target.value); }}>
                                    <option value="">{C.importNone}</option>
                                    {fields.map((f) => (
                                        <option key={f.id} value={f.id}>{f.group_label} — {f.label} ({typeLabel(f.type)})</option>
                                    ))}
                                </select>
                                <small className="muted" style={{ marginTop: 6, display: 'block' }}>{C.importHint}</small>
                            </div>
                        )}

                        <div className="field">
                            <label>{C.groupLabel}</label>
                            <input
                                value={draft.group_label}
                                onChange={(e) => setDraft({ ...draft, group_label: e.target.value })}
                                placeholder={C.groupPlaceholder}
                                required
                            />
                            <small className="muted" style={{ marginTop: 6, display: 'block' }}>{C.groupHint}</small>
                        </div>

                        <div className="field">
                            <label>{C.fieldLabel}</label>
                            <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required autoFocus />
                        </div>

                        {/* Machine key is read-only: backend derives it on create and
                            locks it for system fields. Shown only when editing. */}
                        {draft.id && (
                            <div className="field">
                                <label>{C.machineKey}</label>
                                <input value={draft.key} readOnly disabled />
                                <small className="muted" style={{ marginTop: 6, display: 'block' }}>
                                    {draft.system ? C.keyLockedHint : C.keyHint}
                                </small>
                            </div>
                        )}

                        <div className="field">
                            <label>{C.fieldType}</label>
                            <select
                                value={draft.type}
                                onChange={(e) => setDraft({ ...draft, type: e.target.value as FieldType })}
                                disabled={draft.system}
                            >
                                {FIELD_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
                            </select>
                            {draft.system && <small className="muted" style={{ marginTop: 6, display: 'block' }}>{C.typeLockedHint}</small>}
                        </div>

                        {TYPES_WITH_OPTIONS.includes(draft.type) && (
                            <div className="field">
                                <label>{C.options}</label>
                                <textarea
                                    rows={4}
                                    value={draft.optionsText}
                                    onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
                                    placeholder={C.optionsPlaceholder}
                                />
                                <small className="muted" style={{ marginTop: 6, display: 'block' }}>{C.optionsHint}</small>
                            </div>
                        )}

                        <div className="field">
                            <label>{C.roles}</label>
                            <div className="row wrap" style={{ gap: 14 }}>
                                {ROLES.map((r) => (
                                    <label key={r} className="row" style={{ fontSize: 14, cursor: 'pointer', gap: 6 }}>
                                        <input
                                            type="checkbox"
                                            checked={draft.roles.includes(r)}
                                            onChange={(e) => setDraft({
                                                ...draft,
                                                roles: e.target.checked ? [...draft.roles, r] : draft.roles.filter((x) => x !== r),
                                            })}
                                        />
                                        {roleLabel(r)}
                                    </label>
                                ))}
                            </div>
                            <small className="muted" style={{ display: 'block', marginTop: 8 }}>{C.rolesHint}</small>
                        </div>

                        <label className="spread" style={{ fontSize: 14, marginTop: 4, cursor: 'pointer', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{C.required}</span>
                            <Switch on={draft.required} onChange={(v) => setDraft({ ...draft, required: v })} />
                        </label>

                        <label className="spread" style={{ fontSize: 14, marginTop: 14, cursor: 'pointer', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{C.active}</span>
                            <Switch on={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
                        </label>

                        <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
                            <label>{C.sort}</label>
                            <NumberInput value={draft.sort} onChange={(t) => setDraft({ ...draft, sort: t === '' ? 0 : Number(t) })} />
                        </div>
                    </form>
                )}
            </Drawer>
        </div>
    );
}

/* --------------------------- helpers --------------------------- */

const sectionIcon: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};

/** iOS-style on/off switch built from theme tokens (no app.css edits). */
function Switch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button" role="switch" aria-checked={on} disabled={disabled}
            onClick={() => onChange(!on)}
            style={{
                width: 46, height: 26, borderRadius: 999, padding: 0, flexShrink: 0,
                border: '1px solid ' + (on ? 'var(--plum)' : 'var(--line)'),
                background: on ? 'var(--plum)' : '#e7e4f3',
                position: 'relative', cursor: disabled ? 'default' : 'pointer',
                transition: 'background .18s', opacity: disabled ? 0.6 : 1,
            }}
        >
            <span style={{
                position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20,
                borderRadius: '50%', background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.25)',
            }} />
        </button>
    );
}
