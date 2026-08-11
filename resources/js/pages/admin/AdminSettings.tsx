import { useEffect, useState } from 'react';
import { Check, Save, SlidersHorizontal, Package } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../context/LangContext';

interface Settings {
    site_name: string;
    support_email: string;
    currency: string;
    premium_price_myr: number | string;
    free_card_limit: number | string;
    free_guest_limit: number | string;
    premium_guest_limit: number | string;
}

export function AdminSettings() {
    const { lang } = useLang();
    const C = ({
        bm: {
            title: 'Tetapan', subtitle: 'Laraskan platform, pelan dan had penggunaan.',
            general: 'Umum', siteName: 'Nama laman', supportEmail: 'E-mel sokongan', currency: 'Mata wang',
            packagesPricing: 'Pelan & Harga', premiumPrice: 'Harga Premium (RM)',
            freeCardLimit: 'Had kad percuma', freeGuestLimit: 'Had tetamu percuma', premiumGuestLimit: 'Had tetamu Premium',
            saved: 'Disimpan', saving: 'Menyimpan…', saveSettings: 'Simpan Tetapan', changesSaved: 'Perubahan telah disimpan.',
        },
        en: {
            title: 'Settings', subtitle: 'Configure the platform, packages & usage limits',
            general: 'General', siteName: 'Site name', supportEmail: 'Support email', currency: 'Currency',
            packagesPricing: 'Packages & Pricing', premiumPrice: 'Premium price (RM)',
            freeCardLimit: 'Free card limit', freeGuestLimit: 'Free guest limit', premiumGuestLimit: 'Premium guest limit',
            saved: 'Saved', saving: 'Saving…', saveSettings: 'Save settings', changesSaved: 'Changes saved.',
        },
    })[lang];

    const [s, setS] = useState<Settings | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => { api.get<Settings>('/admin/settings').then((r) => setS(r.data)); }, []);
    if (!s) return <div className="loading-screen"><div className="spinner" /></div>;

    function set<K extends keyof Settings>(key: K, val: Settings[K]) {
        setS((prev) => (prev ? { ...prev, [key]: val } : prev));
        setSaved(false);
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!s) return;
        setSaving(true);
        try {
            await api.put('/admin/settings', {
                site_name: s.site_name,
                support_email: s.support_email,
                currency: s.currency,
                premium_price_myr: Number(s.premium_price_myr),
                free_card_limit: Number(s.free_card_limit),
                free_guest_limit: Number(s.free_guest_limit),
                premium_guest_limit: Number(s.premium_guest_limit),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } finally { setSaving(false); }
    }

    return (
        <form onSubmit={submit}>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
                <div className="panel">
                    <div className="row" style={{ marginBottom: 14 }}>
                        <div style={sectionIcon}><SlidersHorizontal size={16} /></div>
                        <h3 style={{ margin: 0 }}>{C.general}</h3>
                    </div>
                    <div className="field"><label>{C.siteName}</label><input value={s.site_name} onChange={(e) => set('site_name', e.target.value)} /></div>
                    <div className="field"><label>{C.supportEmail}</label><input type="email" value={s.support_email} onChange={(e) => set('support_email', e.target.value)} /></div>
                    <div className="field" style={{ marginBottom: 0 }}><label>{C.currency}</label><input value={s.currency} onChange={(e) => set('currency', e.target.value)} maxLength={6} /></div>
                </div>

                <div className="panel">
                    <div className="row" style={{ marginBottom: 14 }}>
                        <div style={sectionIcon}><Package size={16} /></div>
                        <h3 style={{ margin: 0 }}>{C.packagesPricing}</h3>
                    </div>
                    <div className="field"><label>{C.premiumPrice}</label><input type="number" min={0} step="0.01" value={s.premium_price_myr} onChange={(e) => set('premium_price_myr', e.target.value)} /></div>
                    <div className="field"><label>{C.freeCardLimit}</label><input type="number" min={0} value={s.free_card_limit} onChange={(e) => set('free_card_limit', e.target.value)} /></div>
                    <div className="field"><label>{C.freeGuestLimit}</label><input type="number" min={0} value={s.free_guest_limit} onChange={(e) => set('free_guest_limit', e.target.value)} /></div>
                    <div className="field" style={{ marginBottom: 0 }}><label>{C.premiumGuestLimit}</label><input type="number" min={0} value={s.premium_guest_limit} onChange={(e) => set('premium_guest_limit', e.target.value)} /></div>
                </div>
            </div>

            <div className="row" style={{ marginTop: 20 }}>
                <button className="btn btn-primary" disabled={saving}>
                    {saved ? <><Check size={16} /> {C.saved}</> : <><Save size={16} /> {saving ? C.saving : C.saveSettings}</>}
                </button>
                {saved && <span className="muted" style={{ fontSize: 13 }}>{C.changesSaved}</span>}
            </div>
        </form>
    );
}

const sectionIcon: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--plum)',
};
