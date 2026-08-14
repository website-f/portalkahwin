import { useEffect, useRef, useState } from 'react';
import { Upload, ImageIcon, Trash2, Loader2, Check, ReceiptText } from 'lucide-react';
import { api } from '../lib/api';
import { mediaUrl } from '../lib/base';
import { useAuth } from '../context/AuthContext';
import { useLang, dict } from '../context/LangContext';

/** One superadmin-defined field. */
interface FieldDef {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'tel' | 'email' | 'number' | 'select' | 'logo';
    options: string[];
    required: boolean;
    system: boolean;
}
interface Group {
    key: string;
    label: string;
    system: boolean;
    fields: FieldDef[];
}
interface PFResponse {
    groups: Group[];
    values: Record<string, string | null>;
    branding: { allowed: boolean; use_own: boolean; can_brand: boolean };
}

/** Keys that map to a user column rather than profile_data (kept in sync with the API). */
const COLUMN_KEYS = ['company_name', 'company_logo'];

function apiError(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
    const first = e?.response?.data?.errors && Object.values(e.response.data.errors)[0]?.[0];
    return first ?? e?.response?.data?.message ?? fallback;
}

/**
 * Renders the superadmin-defined profile fields that apply to the signed-in user.
 *
 * `mode="business"` shows the built-in Business & Receipt group (logo, company,
 * address, tax…) plus the "use my own business on receipts" opt-in — this is the
 * vendor/affiliate branding home. `mode="custom"` shows every other group, so any
 * new tab a superadmin adds appears in the account profile for the matching role.
 * Each render saves independently via PUT /me/profile (partial, non-overlapping).
 */
export function ProfileFields({ mode }: { mode: 'business' | 'custom' }) {
    const { refresh } = useAuth();
    const { lang } = useLang();
    const fileRef = useRef<HTMLInputElement>(null);

    const [data, setData] = useState<PFResponse | null>(null);
    const [vals, setVals] = useState<Record<string, string>>({});
    const [useOwn, setUseOwn] = useState(false);
    const [tab, setTab] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const C = dict({
        bm: {
            save: 'Simpan', saving: 'Menyimpan…', saved: 'Perubahan disimpan',
            uploadLogo: 'Muat Naik Logo', changeLogo: 'Tukar Logo', uploading: 'Memuat naik…', removeLogo: 'Buang',
            noLogo: 'Belum ada logo', logoHint: 'PNG atau JPG, latar lutsinar disyorkan.',
            brandTitle: 'Guna perniagaan saya pada resit',
            brandOn: 'Resit pembelian yang berkaitan dengan anda memaparkan logo & butiran perniagaan anda.',
            brandBlocked: 'Superadmin telah mematikan penjenamaan penjual — semua resit menggunakan jenama platform buat masa ini.',
            saveFail: 'Gagal menyimpan. Sila cuba lagi.', uploadFail: 'Logo gagal dimuat naik.',
            optional: 'pilihan',
        },
        en: {
            save: 'Save', saving: 'Saving…', saved: 'Changes saved',
            uploadLogo: 'Upload Logo', changeLogo: 'Change Logo', uploading: 'Uploading…', removeLogo: 'Remove',
            noLogo: 'No logo yet', logoHint: 'PNG or JPG, a transparent background works best.',
            brandTitle: 'Use my business on receipts',
            brandOn: 'Receipts for purchases attributed to you show your logo & business details.',
            brandBlocked: 'The superadmin has turned off seller branding — all receipts use the platform brand for now.',
            saveFail: 'Could not save. Please try again.', uploadFail: 'Failed to upload logo.',
            optional: 'optional',
        },
        zh: {
            save: '保存', saving: '保存中…', saved: '更改已保存',
            uploadLogo: '上传标志', changeLogo: '更换标志', uploading: '上传中…', removeLogo: '移除',
            noLogo: '尚未上传标志', logoHint: 'PNG 或 JPG，建议使用透明背景。',
            brandTitle: '在收据上使用我的商号',
            brandOn: '归属于您的购买收据将显示您的标志与商号信息。',
            brandBlocked: '超级管理员已关闭商家品牌功能，目前所有收据均使用平台品牌。',
            saveFail: '保存失败，请重试。', uploadFail: '标志上传失败。',
            optional: '可选',
        },
    }, lang);

    async function load() {
        const r = await api.get<PFResponse>('/me/profile-fields');
        setData(r.data);
        const init: Record<string, string> = {};
        for (const [k, v] of Object.entries(r.data.values ?? {})) init[k] = v == null ? '' : String(v);
        setVals(init);
        setUseOwn(r.data.branding.use_own);
    }
    useEffect(() => { void load(); }, []);

    if (!data) return null;

    const groups = data.groups.filter((g) => (mode === 'business' ? g.system : !g.system));
    if (groups.length === 0) return null;
    const active = groups[Math.min(tab, groups.length - 1)];
    const showBrandToggle = mode === 'business' && data.branding.can_brand;
    const brandingAllowed = data.branding.allowed;

    function setVal(key: string, v: string) {
        setSaved(false);
        setVals((prev) => ({ ...prev, [key]: v }));
    }

    async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError(null); setSaved(false); setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const r = await api.post<{ url: string }>('/me/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            setVals((prev) => ({ ...prev, company_logo: r.data.url }));
        } catch (err) {
            setError(apiError(err, C.uploadFail));
        } finally {
            setUploading(false);
        }
    }

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setError(null); setSaved(false); setSaving(true);
        try {
            // Route each field to its column or into profile_data — only keys this
            // render owns are sent, so the two modes never clobber each other.
            const payload: Record<string, unknown> = {};
            const profileData: Record<string, string> = {};
            for (const g of groups) {
                for (const f of g.fields) {
                    const v = vals[f.key] ?? '';
                    if (COLUMN_KEYS.includes(f.key)) payload[f.key] = v || null;
                    else profileData[f.key] = v;
                }
            }
            payload.profile_data = profileData;
            if (showBrandToggle && brandingAllowed) payload.use_own_receipt_branding = useOwn;

            await api.put('/me/profile', payload);
            await refresh();
            setSaved(true);
        } catch (err) {
            setError(apiError(err, C.saveFail));
        } finally {
            setSaving(false);
        }
    }

    const renderField = (f: FieldDef) => {
        if (f.type === 'logo') {
            const url = vals[f.key] || '';
            return (
                <div className="field" key={f.key}>
                    <label>{f.label}{!f.required && <span className="muted" style={{ fontWeight: 400 }}> · {C.optional}</span>}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={logoBox}>
                            {url ? <img src={mediaUrl(url)} alt="" style={logoImg} /> : <ImageIcon size={24} style={{ color: 'var(--muted)' }} />}
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                                    {uploading ? <><Loader2 size={15} className="spin" /> {C.uploading}</> : <><Upload size={15} /> {url ? C.changeLogo : C.uploadLogo}</>}
                                </button>
                                {url && !uploading && (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVal('company_logo', '')}>
                                        <Trash2 size={15} /> {C.removeLogo}
                                    </button>
                                )}
                            </div>
                            <p className="muted" style={{ margin: 0, fontSize: 12 }}>{url ? C.logoHint : C.noLogo}</p>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
                    </div>
                </div>
            );
        }
        const label = <label>{f.label}{f.required ? <span style={{ color: 'var(--bad)' }}> *</span> : <span className="muted" style={{ fontWeight: 400 }}> · {C.optional}</span>}</label>;
        if (f.type === 'select') {
            return (
                <div className="field" key={f.key}>
                    {label}
                    <select value={vals[f.key] ?? ''} onChange={(e) => setVal(f.key, e.target.value)}>
                        <option value="">—</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
            );
        }
        if (f.type === 'textarea') {
            return (
                <div className="field" key={f.key}>
                    {label}
                    <textarea rows={3} value={vals[f.key] ?? ''} onChange={(e) => setVal(f.key, e.target.value)} />
                </div>
            );
        }
        const inputType = f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : 'text';
        return (
            <div className="field" key={f.key}>
                {label}
                <input type={inputType} value={vals[f.key] ?? ''} onChange={(e) => setVal(f.key, e.target.value)} />
            </div>
        );
    };

    return (
        <form onSubmit={save} className="panel" style={{ maxWidth: 720 }}>
            {/* Tabs — one per field group. A single group shows just its title. */}
            {groups.length > 1 ? (
                <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
                    {groups.map((g, i) => (
                        <button key={g.key} type="button" className={`btn btn-sm ${i === tab ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(i)}>
                            {g.label}
                        </button>
                    ))}
                </div>
            ) : (
                <h3 style={{ margin: '0 0 14px' }}>{active.label}</h3>
            )}

            {showBrandToggle && (
                <div style={brandRow}>
                    <div style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, fontWeight: 600, fontSize: 14 }}>
                            <ReceiptText size={16} style={{ color: 'var(--plum)' }} /> {C.brandTitle}
                        </div>
                        <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5 }}>
                            {data.branding.allowed ? C.brandOn : C.brandBlocked}
                        </p>
                    </div>
                    <Switch on={useOwn} disabled={!data.branding.allowed} onChange={(v) => { setUseOwn(v); setSaved(false); }} />
                </div>
            )}

            {active.fields.map(renderField)}

            {error && <p className="form-err" style={{ margin: '4px 0 0' }}>{error}</p>}

            <div className="row" style={{ gap: 14, marginTop: 16 }}>
                <button className="btn btn-primary" disabled={saving || uploading}>
                    {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />} {saving ? C.saving : C.save}
                </button>
                {saved && !saving && (
                    <span className="row" style={{ gap: 6, color: 'var(--ok)', fontSize: 14, fontWeight: 600 }}>
                        <Check size={16} /> {C.saved}
                    </span>
                )}
            </div>

            <style>{`.spin { animation: pk-spin 0.9s linear infinite; } @keyframes pk-spin { to { transform: rotate(360deg); } }`}</style>
        </form>
    );
}

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

const logoBox: React.CSSProperties = {
    width: 84, height: 84, borderRadius: 16, background: 'var(--cream)',
    border: '1px solid var(--line)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0,
};
const logoImg: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'contain', background: '#fff' };
const brandRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between',
    background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 16,
};
