import { useRef, useState } from 'react';
import { mediaUrl } from '../../lib/base';
import { Building2, User, Phone, Upload, ImageIcon, Check, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';

/** Pull a human-readable message out of a Laravel validation / error response. */
function apiError(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
    const errors = e?.response?.data?.errors;
    if (errors) {
        const first = Object.values(errors)[0];
        if (first && first[0]) return first[0];
    }
    return e?.response?.data?.message ?? fallback;
}

export function CompanyProfile() {
    const { user, refresh } = useAuth();
    const { lang } = useLang();
    const fileRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [companyName, setCompanyName] = useState(user?.company_name ?? '');
    const [logoUrl, setLogoUrl] = useState<string | null>(user?.company_logo ?? null);

    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const C = dict({
        bm: {
            title: 'Profil Syarikat',
            subtitle: 'Uruskan jenama syarikat anda. Logo dan nama ini dipaparkan pada setiap jemputan yang anda anjurkan.',
            brandingTitle: 'Jenama Syarikat',
            brandingSub: 'Logo dan nama syarikat yang dipaparkan pada kad jemputan.',
            companyName: 'Nama Syarikat',
            companyNamePh: 'cth. Kad Kahwin Sdn Bhd',
            logo: 'Logo Syarikat',
            uploadLogo: 'Muat Naik Logo',
            changeLogo: 'Tukar Logo',
            uploading: 'Memuat naik…',
            removeLogo: 'Buang logo',
            logoHint: 'Imej PNG atau JPG, maksimum 4MB. Latar belakang lutsinar disyorkan.',
            noLogo: 'Belum ada logo',
            accountTitle: 'Butiran Akaun',
            accountSub: 'Nama dan nombor telefon anda.',
            displayName: 'Nama Paparan',
            phone: 'Nombor Telefon',
            phonePh: 'cth. 012-3456789',
            save: 'Simpan Perubahan',
            saving: 'Menyimpan…',
            saved: 'Perubahan disimpan',
            uploadFail: 'Logo gagal dimuat naik. Sila cuba lagi.',
            saveFail: 'Perubahan gagal disimpan. Sila cuba lagi.',
        },
        en: {
            title: 'Company Profile',
            subtitle: 'Manage your company branding. This logo and name appear on every invitation you present.',
            brandingTitle: 'Company Branding',
            brandingSub: 'The logo and company name shown on your invitation cards.',
            companyName: 'Company Name',
            companyNamePh: 'e.g. Wedding Cards Sdn Bhd',
            logo: 'Company Logo',
            uploadLogo: 'Upload Logo',
            changeLogo: 'Change Logo',
            uploading: 'Uploading…',
            removeLogo: 'Remove logo',
            logoHint: 'PNG or JPG, max 4MB. A transparent background works best.',
            noLogo: 'No logo yet',
            accountTitle: 'Account Details',
            accountSub: 'Your name and phone number.',
            displayName: 'Display Name',
            phone: 'Phone Number',
            phonePh: 'e.g. 012-3456789',
            save: 'Save Changes',
            saving: 'Saving…',
            saved: 'Changes saved',
            uploadFail: 'Failed to upload logo. Please try again.',
            saveFail: 'Failed to save changes. Please try again.',
        },
        zh: {
            title: '公司资料',
            subtitle: '管理您的公司品牌。此标志与名称会显示在您呈献的每一张请柬上。',
            brandingTitle: '公司品牌',
            brandingSub: '显示在请柬上的公司标志与名称。',
            companyName: '公司名称',
            companyNamePh: '例如 Wedding Cards Sdn Bhd',
            logo: '公司标志',
            uploadLogo: '上传标志',
            changeLogo: '更换标志',
            uploading: '上传中…',
            removeLogo: '移除标志',
            logoHint: 'PNG 或 JPG，最大 4MB。建议使用透明背景。',
            noLogo: '尚未上传标志',
            accountTitle: '账户资料',
            accountSub: '您的姓名与联系电话。',
            displayName: '显示名称',
            phone: '联系电话',
            phonePh: '例如 012-3456789',
            save: '保存更改',
            saving: '保存中…',
            saved: '更改已保存',
            uploadFail: '标志上传失败，请重试。',
            saveFail: '保存失败，请重试。',
        },
    }, lang);

    function pickFile() {
        fileRef.current?.click();
    }

    async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (!file) return;

        setError(null);
        setSaved(false);
        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const r = await api.post<{ url: string }>('/me/logo', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setLogoUrl(r.data.url);
            await refresh();
        } catch (err: unknown) {
            setError(apiError(err, C.uploadFail));
        } finally {
            setUploading(false);
        }
    }

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSaved(false);
        setSaving(true);
        try {
            await api.put('/me/profile', {
                name: name.trim(),
                phone: phone.trim() || null,
                company_name: companyName.trim() || null,
                company_logo: logoUrl,
            });
            await refresh();
            setSaved(true);
        } catch (err: unknown) {
            setError(apiError(err, C.saveFail));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <form onSubmit={save} style={{ maxWidth: 720, display: 'grid', gap: 18 }}>
                {/* Branding */}
                <div className="panel">
                    <h3 style={{ margin: '0 0 4px' }}>{C.brandingTitle}</h3>
                    <p className="muted" style={{ margin: '0 0 18px', fontSize: 13 }}>{C.brandingSub}</p>

                    <div className="field">
                        <label>{C.logo}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div style={logoBox}>
                                {logoUrl
                                    ? <img src={mediaUrl(logoUrl)} alt={companyName || 'logo'} style={logoImg} />
                                    : <ImageIcon size={26} style={{ color: 'var(--muted)' }} />}
                            </div>
                            <div style={{ display: 'grid', gap: 8 }}>
                                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={pickFile} disabled={uploading}>
                                        {uploading
                                            ? <><Loader2 size={15} className="spin" /> {C.uploading}</>
                                            : <><Upload size={15} /> {logoUrl ? C.changeLogo : C.uploadLogo}</>}
                                    </button>
                                    {logoUrl && !uploading && (
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLogoUrl(null); setSaved(false); }}>
                                            <Trash2 size={15} /> {C.removeLogo}
                                        </button>
                                    )}
                                </div>
                                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                                    {logoUrl ? C.logoHint : C.noLogo}
                                </p>
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                onChange={onLogoChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="field" style={{ marginBottom: 0 }}>
                        <label>{C.companyName}</label>
                        <div style={inputIconWrap}>
                            <Building2 size={16} style={inputIcon} />
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder={C.companyNamePh}
                                maxLength={160}
                                style={{ width: '100%', paddingLeft: 38 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Account */}
                <div className="panel">
                    <h3 style={{ margin: '0 0 4px' }}>{C.accountTitle}</h3>
                    <p className="muted" style={{ margin: '0 0 18px', fontSize: 13 }}>{C.accountSub}</p>

                    <div className="field">
                        <label>{C.displayName}</label>
                        <div style={inputIconWrap}>
                            <User size={16} style={inputIcon} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={120}
                                required
                                style={{ width: '100%', paddingLeft: 38 }}
                            />
                        </div>
                    </div>

                    <div className="field" style={{ marginBottom: 0 }}>
                        <label>{C.phone}</label>
                        <div style={inputIconWrap}>
                            <Phone size={16} style={inputIcon} />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder={C.phonePh}
                                maxLength={30}
                                style={{ width: '100%', paddingLeft: 38 }}
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="form-err" style={{ margin: 0 }}>{error}</p>}

                <div className="row" style={{ gap: 14 }}>
                    <button className="btn btn-primary" disabled={saving || uploading}>
                        {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                        {saving ? C.saving : C.save}
                    </button>
                    {saved && !saving && (
                        <span className="row" style={{ gap: 6, color: 'var(--ok)', fontSize: 14, fontWeight: 600 }}>
                            <Check size={16} /> {C.saved}
                        </span>
                    )}
                </div>
            </form>

            <style>{`.spin { animation: pk-spin 0.9s linear infinite; } @keyframes pk-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

const logoBox: React.CSSProperties = {
    width: 84, height: 84, borderRadius: 16, background: 'var(--cream)',
    border: '1px solid var(--line)', display: 'grid', placeItems: 'center',
    overflow: 'hidden', flexShrink: 0,
};
const logoImg: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'contain', background: '#fff',
};
const inputIconWrap: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
const inputIcon: React.CSSProperties = {
    position: 'absolute', left: 12, color: 'var(--muted)', pointerEvents: 'none',
};
