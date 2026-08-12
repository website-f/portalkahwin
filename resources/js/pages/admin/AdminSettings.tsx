import { useEffect, useState } from 'react';
import {
    Check, Save, Plus, Pencil, Trash2, SlidersHorizontal,
    Package as PackageIcon, Ticket, ToggleRight, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Drawer } from '../../components/Drawer';
import { DataTable, type Column } from '../../components/DataTable';
import { useLang } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';

/* ----------------------------- types ----------------------------- */

type TabKey = 'umum' | 'pakej' | 'baucar' | 'ciri';

interface Settings {
    site_name: string;
    support_email: string;
    currency: string;
    premium_price_myr: number | string;
    free_card_limit: number | string;
    free_guest_limit: number | string;
    premium_guest_limit: number | string;
    // feature toggles arrive as 'true' / 'false' strings
    [key: string]: string | number | boolean | undefined;
}

interface Pkg {
    id?: string;
    name: string;
    role_target: 'any' | 'vendor' | 'affiliate';
    price_myr: number | string;
    interval: 'monthly' | 'yearly' | 'once';
    features: string[];
    is_active: boolean;
    sort: number;
}

interface Vch {
    id?: string;
    code: string;
    kind: 'full' | 'percent' | 'amount';
    value: number | string;
    max_uses: number | string | null;
    used_count?: number;
    expires_at?: string | null;
    is_active: boolean;
    note?: string | null;
}

const BLANK_PKG: Pkg = { name: '', role_target: 'any', price_myr: 0, interval: 'monthly', features: [], is_active: true, sort: 0 };
const BLANK_VCH: Vch = { code: '', kind: 'percent', value: 10, max_uses: '', expires_at: '', is_active: true, note: '' };

const TOGGLE_KEYS = ['allow_user_templates', 'payment_enabled_user', 'payment_enabled_vendor', 'payment_enabled_affiliate', 'seat_names_private'] as const;
type ToggleKey = (typeof TOGGLE_KEYS)[number];

/* --------------------------- component --------------------------- */

export function AdminSettings() {
    const { lang } = useLang();
    const dialog = useDialog();
    const C = ({
        bm: {
            title: 'Tetapan', subtitle: 'Urus platform, pakej, baucar dan ciri — semua di satu tempat.',
            tabUmum: 'Umum', tabPakej: 'Pakej', tabBaucar: 'Baucar', tabCiri: 'Ciri',
            // umum
            general: 'Umum', siteName: 'Nama laman', supportEmail: 'E-mel sokongan', currency: 'Mata wang',
            pricingLimits: 'Harga & Had', premiumPrice: 'Harga Premium (RM)',
            freeCardLimit: 'Had kad percuma', freeGuestLimit: 'Had tetamu percuma', premiumGuestLimit: 'Had tetamu Premium',
            saved: 'Disimpan', saving: 'Menyimpan…', saveSettings: 'Simpan Tetapan', changesSaved: 'Perubahan telah disimpan.',
            unlimitedHint: '0 = tanpa had',
            // pakej
            addPackage: 'Tambah Pakej', emptyPkg: 'Belum ada pakej. Klik “Tambah Pakej” untuk bermula.',
            drawerPkgEdit: 'Sunting Pakej', drawerPkgAdd: 'Tambah Pakej',
            pkgName: 'Nama pakej', roleTarget: 'Sasaran peranan', price: 'Harga (RM)', interval: 'Kitaran', features: 'Ciri',
            addFeature: 'Tambah ciri…', noFeatures: 'Tiada ciri lagi.', sort: 'Susunan', activePkg: 'Aktif (papar kepada pelanggan)',
            roleAny: 'Semua', roleVendor: 'Vendor', roleAffiliate: 'Affiliate',
            intMonthly: 'Bulanan', intYearly: 'Tahunan', intOnce: 'Sekali', perMonth: '/bln', perYear: '/thn', oneOff: 'sekali',
            confirmDeletePkg: (n: string) => `Padam pakej "${n}"?`,
            // baucar
            addVoucher: 'Tambah Baucar', code: 'Kod', kind: 'Jenis', value: 'Nilai', uses: 'Guna', expiry: 'Luput', status: 'Status',
            drawerVchEdit: 'Sunting Baucar', drawerVchAdd: 'Tambah Baucar',
            kindFull: 'Percuma penuh', kindPercent: 'Peratus (%)', kindAmount: 'Amaun (RM)',
            maxUses: 'Had guna', maxUsesHint: 'Kosongkan untuk tanpa had.', expiresAt: 'Tarikh luput', note: 'Nota', activeVch: 'Aktif (boleh ditebus)',
            emptyVch: 'Belum ada baucar.', never: '—', free: 'Percuma',
            confirmDeleteVch: (c: string) => `Padam baucar "${c}"?`,
            // ciri
            featureToggles: 'Ciri Platform', togglesSub: 'Hidupkan atau matikan ciri. Perubahan disimpan serta-merta.',
            t_allow_user_templates: 'Benarkan pengguna sumbang rekaan',
            t_allow_user_templates_d: 'Jika hidup, semua pengguna boleh menghantar rekaan kad untuk disemak.',
            t_payment_enabled_user: 'Aktifkan pembayaran untuk pengguna',
            t_payment_enabled_vendor: 'Aktifkan pembayaran untuk vendor',
            t_payment_enabled_affiliate: 'Aktifkan pembayaran untuk affiliate',
            t_payment_d: 'Membenarkan checkout & langganan berbayar untuk peranan ini.',
            t_seat_names_private: 'Sembunyikan nama tetamu lain di paparan meja',
            t_seat_names_private_d: 'Jika hidup, tetamu hanya nampak nama mereka sendiri dalam paparan susun atur meja. Jika mati, semua nama dipaparkan.',
            on: 'Hidup', offState: 'Mati',
            // shared
            active: 'Aktif', off: 'Tidak aktif', edit: 'Sunting', cancel: 'Batal', save: 'Simpan', del: 'Padam',
            search: 'Cari kod…',
        },
        en: {
            title: 'Settings', subtitle: 'Manage the platform, packages, vouchers & features — all in one place.',
            tabUmum: 'General', tabPakej: 'Packages', tabBaucar: 'Vouchers', tabCiri: 'Features',
            general: 'General', siteName: 'Site name', supportEmail: 'Support email', currency: 'Currency',
            pricingLimits: 'Pricing & limits', premiumPrice: 'Premium price (RM)',
            freeCardLimit: 'Free card limit', freeGuestLimit: 'Free guest limit', premiumGuestLimit: 'Premium guest limit',
            saved: 'Saved', saving: 'Saving…', saveSettings: 'Save settings', changesSaved: 'Changes saved.',
            unlimitedHint: '0 = unlimited',
            addPackage: 'Add package', emptyPkg: 'No packages yet. Click “Add package” to get started.',
            drawerPkgEdit: 'Edit package', drawerPkgAdd: 'Add package',
            pkgName: 'Package name', roleTarget: 'Role target', price: 'Price (RM)', interval: 'Interval', features: 'Features',
            addFeature: 'Add a feature…', noFeatures: 'No features yet.', sort: 'Sort', activePkg: 'Active (show to customers)',
            roleAny: 'Anyone', roleVendor: 'Vendor', roleAffiliate: 'Affiliate',
            intMonthly: 'Monthly', intYearly: 'Yearly', intOnce: 'One-off', perMonth: '/mo', perYear: '/yr', oneOff: 'once',
            confirmDeletePkg: (n: string) => `Delete package "${n}"?`,
            addVoucher: 'Add voucher', code: 'Code', kind: 'Kind', value: 'Value', uses: 'Uses', expiry: 'Expiry', status: 'Status',
            drawerVchEdit: 'Edit voucher', drawerVchAdd: 'Add voucher',
            kindFull: 'Fully free', kindPercent: 'Percent (%)', kindAmount: 'Amount (RM)',
            maxUses: 'Max uses', maxUsesHint: 'Leave blank for unlimited.', expiresAt: 'Expiry date', note: 'Note', activeVch: 'Active (redeemable)',
            emptyVch: 'No vouchers yet.', never: '—', free: 'Free',
            confirmDeleteVch: (c: string) => `Delete voucher "${c}"?`,
            featureToggles: 'Platform features', togglesSub: 'Turn features on or off. Changes are saved immediately.',
            t_allow_user_templates: 'Allow users to contribute designs',
            t_allow_user_templates_d: 'If on, any user can submit card designs for review.',
            t_payment_enabled_user: 'Enable payments for users',
            t_payment_enabled_vendor: 'Enable payments for vendors',
            t_payment_enabled_affiliate: 'Enable payments for affiliates',
            t_payment_d: 'Allows paid checkout & subscriptions for this role.',
            t_seat_names_private: 'Hide other guests’ names in the seating view',
            t_seat_names_private_d: 'When on, guests see only their own name in the seating layout. When off, all names are shown.',
            on: 'On', offState: 'Off',
            active: 'Active', off: 'Off', edit: 'Edit', cancel: 'Cancel', save: 'Save', del: 'Delete',
            search: 'Search code…',
        },
    })[lang];

    const [tab, setTab] = useState<TabKey>('umum');

    /* ---- data ---- */
    const [s, setS] = useState<Settings | null>(null);
    const [pkgs, setPkgs] = useState<Pkg[]>([]);
    const [vchs, setVchs] = useState<Vch[]>([]);

    const loadSettings = () => api.get<Settings>('/admin/settings').then((r) => setS(r.data));
    const loadPkgs = () => api.get<Pkg[]>('/admin/packages').then((r) => setPkgs(r.data));
    const loadVchs = () => api.get<Vch[]>('/admin/vouchers').then((r) => setVchs(r.data));

    useEffect(() => { loadSettings(); loadPkgs(); loadVchs(); }, []);

    /* ---- general (umum) ---- */
    const [savingGen, setSavingGen] = useState(false);
    const [savedGen, setSavedGen] = useState(false);
    function setField<K extends keyof Settings>(key: K, val: Settings[K]) {
        setS((prev) => (prev ? { ...prev, [key]: val } : prev));
        setSavedGen(false);
    }
    async function saveGeneral(e: React.FormEvent) {
        e.preventDefault();
        if (!s) return;
        setSavingGen(true);
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
            setSavedGen(true);
            setTimeout(() => setSavedGen(false), 2500);
        } finally { setSavingGen(false); }
    }

    /* ---- toggles (ciri) ---- */
    const [togglingKey, setTogglingKey] = useState<string | null>(null);
    const isOn = (k: ToggleKey) => String(s?.[k] ?? 'false') === 'true';
    async function setToggle(k: ToggleKey, next: boolean) {
        setS((prev) => (prev ? { ...prev, [k]: next ? 'true' : 'false' } : prev));
        setTogglingKey(k);
        try { await api.put('/admin/settings', { [k]: next ? 'true' : 'false' }); }
        finally { setTogglingKey(null); }
    }

    /* ---- packages (pakej) ---- */
    const [editingPkg, setEditingPkg] = useState<Pkg | null>(null);
    const [savingPkg, setSavingPkg] = useState(false);
    const [featInput, setFeatInput] = useState('');

    function openPkg(p: Pkg | null) {
        setEditingPkg(p ? { ...p, features: p.features ?? [] } : { ...BLANK_PKG });
        setFeatInput('');
    }
    function addFeature() {
        const f = featInput.trim();
        if (!f || !editingPkg) return;
        setEditingPkg({ ...editingPkg, features: [...editingPkg.features, f] });
        setFeatInput('');
    }
    function removeFeature(i: number) {
        if (!editingPkg) return;
        setEditingPkg({ ...editingPkg, features: editingPkg.features.filter((_, idx) => idx !== i) });
    }
    async function savePkg(e: React.FormEvent) {
        e.preventDefault();
        if (!editingPkg) return;
        setSavingPkg(true);
        try {
            const payload = { ...editingPkg, price_myr: Number(editingPkg.price_myr), sort: Number(editingPkg.sort) };
            if (editingPkg.id) await api.put(`/admin/packages/${editingPkg.id}`, payload);
            else await api.post('/admin/packages', payload);
            setEditingPkg(null);
            loadPkgs();
        } finally { setSavingPkg(false); }
    }
    async function togglePkgActive(p: Pkg, next: boolean) {
        if (!p.id) return;
        setPkgs((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)));
        await api.put(`/admin/packages/${p.id}`, { ...p, is_active: next, price_myr: Number(p.price_myr), sort: Number(p.sort) });
        loadPkgs();
    }
    async function removePkg(p: Pkg) {
        if (!p.id) return;
        if (!(await dialog.confirm({ message: C.confirmDeletePkg(p.name), danger: true }))) return;
        await api.delete(`/admin/packages/${p.id}`);
        loadPkgs();
    }

    /* ---- vouchers (baucar) ---- */
    const [editingVch, setEditingVch] = useState<Vch | null>(null);
    const [savingVch, setSavingVch] = useState(false);

    function openVch(v: Vch | null) {
        setEditingVch(v
            ? { ...v, max_uses: v.max_uses ?? '', expires_at: v.expires_at ? v.expires_at.slice(0, 16) : '' }
            : { ...BLANK_VCH });
    }
    async function saveVch(e: React.FormEvent) {
        e.preventDefault();
        if (!editingVch) return;
        setSavingVch(true);
        try {
            const payload = {
                code: editingVch.code.trim(),
                kind: editingVch.kind,
                value: editingVch.kind === 'full' ? 0 : Number(editingVch.value),
                max_uses: editingVch.max_uses === '' || editingVch.max_uses === null ? null : Number(editingVch.max_uses),
                expires_at: editingVch.expires_at ? editingVch.expires_at : null,
                is_active: editingVch.is_active,
                note: editingVch.note ?? '',
            };
            if (editingVch.id) await api.put(`/admin/vouchers/${editingVch.id}`, payload);
            else await api.post('/admin/vouchers', payload);
            setEditingVch(null);
            loadVchs();
        } finally { setSavingVch(false); }
    }
    async function removeVch(v: Vch) {
        if (!v.id) return;
        if (!(await dialog.confirm({ message: C.confirmDeleteVch(v.code), danger: true }))) return;
        await api.delete(`/admin/vouchers/${v.id}`);
        setEditingVch(null);
        loadVchs();
    }

    if (!s) return <div className="loading-screen"><div className="spinner" /></div>;

    /* --------------------------- labels --------------------------- */
    const roleLabel = (r: Pkg['role_target']) => (r === 'vendor' ? C.roleVendor : r === 'affiliate' ? C.roleAffiliate : C.roleAny);
    const roleBadge = (r: Pkg['role_target']) => (r === 'vendor' ? 'badge badge-gold' : r === 'affiliate' ? 'badge badge-ok' : 'badge');
    const intervalLabel = (i: Pkg['interval']) => (i === 'yearly' ? C.perYear : i === 'once' ? C.oneOff : C.perMonth);
    const kindLabel = (k: Vch['kind']) => (k === 'full' ? C.kindFull : k === 'percent' ? C.kindPercent : C.kindAmount);
    const valueLabel = (v: Vch) => (v.kind === 'full' ? C.free : v.kind === 'percent' ? `${Number(v.value)}%` : `RM${Number(v.value)}`);
    const fmtDate = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : C.never;

    const TABS: { key: TabKey; icon: LucideIcon; label: string }[] = [
        { key: 'umum', icon: SlidersHorizontal, label: C.tabUmum },
        { key: 'pakej', icon: PackageIcon, label: C.tabPakej },
        { key: 'baucar', icon: Ticket, label: C.tabBaucar },
        { key: 'ciri', icon: ToggleRight, label: C.tabCiri },
    ];

    const vchCols: Column<Vch>[] = [
        { key: 'code', label: C.code, sortable: true, sortValue: (v) => v.code, render: (v) => <code>{v.code}</code> },
        { key: 'kind', label: C.kind, sortable: true, sortValue: (v) => v.kind, render: (v) => <span className="badge">{kindLabel(v.kind)}</span> },
        { key: 'value', label: C.value, align: 'right', sortable: true, sortValue: (v) => Number(v.value), render: (v) => valueLabel(v) },
        { key: 'uses', label: C.uses, align: 'right', sortValue: (v) => v.used_count ?? 0, render: (v) => `${v.used_count ?? 0} / ${v.max_uses ?? '∞'}` },
        { key: 'expiry', label: C.expiry, sortable: true, sortValue: (v) => v.expires_at ?? '', render: (v) => fmtDate(v.expires_at) },
        {
            key: 'status', label: C.status, sortValue: (v) => (v.is_active ? 1 : 0),
            render: (v) => (v.is_active ? <span className="badge badge-ok">{C.active}</span> : <span className="badge badge-bad">{C.off}</span>),
        },
    ];

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {/* tab bar */}
            <div className="row wrap" style={{ gap: 8, marginBottom: 22 }}>
                {TABS.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button key={t.key} type="button" className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.key)}>
                            <Icon size={15} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ---------------- UMUM ---------------- */}
            {tab === 'umum' && (
                <form onSubmit={saveGeneral}>
                    <div className="panel" style={{ maxWidth: 480 }}>
                        <div className="row" style={{ marginBottom: 14 }}>
                            <div style={sectionIcon}><SlidersHorizontal size={16} /></div>
                            <h3 style={{ margin: 0 }}>{C.general}</h3>
                        </div>
                        <div className="field"><label>{C.siteName}</label><input value={s.site_name} onChange={(e) => setField('site_name', e.target.value)} /></div>
                        <div className="field"><label>{C.supportEmail}</label><input type="email" value={s.support_email} onChange={(e) => setField('support_email', e.target.value)} /></div>
                        <div className="field" style={{ marginBottom: 0 }}><label>{C.currency}</label><input value={s.currency} onChange={(e) => setField('currency', e.target.value)} maxLength={6} /></div>
                    </div>

                    <div className="row" style={{ marginTop: 20 }}>
                        <button className="btn btn-primary" disabled={savingGen}>
                            {savedGen ? <><Check size={16} /> {C.saved}</> : <><Save size={16} /> {savingGen ? C.saving : C.saveSettings}</>}
                        </button>
                        {savedGen && <span className="muted" style={{ fontSize: 13 }}>{C.changesSaved}</span>}
                    </div>
                </form>
            )}

            {/* ---------------- PAKEJ ---------------- */}
            {tab === 'pakej' && (
                <div>
                    {/* Pricing & limits — platform-wide defaults (moved here from General so
                        all pricing lives in one place). */}
                    <form onSubmit={saveGeneral} className="panel" style={{ maxWidth: 480, marginBottom: 22 }}>
                        <div className="row" style={{ marginBottom: 14 }}>
                            <div style={sectionIcon}><PackageIcon size={16} /></div>
                            <h3 style={{ margin: 0 }}>{C.pricingLimits}</h3>
                        </div>
                        <div className="field"><label>{C.premiumPrice}</label><input type="number" min={0} step="0.01" value={s.premium_price_myr} onChange={(e) => setField('premium_price_myr', e.target.value)} /></div>
                        <div className="field"><label>{C.freeCardLimit}</label><input type="number" min={0} value={s.free_card_limit} onChange={(e) => setField('free_card_limit', e.target.value)} /></div>
                        <div className="field"><label>{C.freeGuestLimit}</label><input type="number" min={0} value={s.free_guest_limit} onChange={(e) => setField('free_guest_limit', e.target.value)} /></div>
                        <div className="field"><label>{C.premiumGuestLimit}</label><input type="number" min={0} value={s.premium_guest_limit} onChange={(e) => setField('premium_guest_limit', e.target.value)} /><small className="muted">{C.unlimitedHint}</small></div>
                        <div className="row" style={{ marginTop: 4 }}>
                            <button className="btn btn-primary btn-sm" disabled={savingGen}>
                                {savedGen ? <><Check size={15} /> {C.saved}</> : <><Save size={15} /> {savingGen ? C.saving : C.saveSettings}</>}
                            </button>
                        </div>
                    </form>

                    <div className="spread" style={{ marginBottom: 18 }}>
                        <p className="muted" style={{ margin: 0 }}>{pkgs.length} {C.tabPakej.toLowerCase()}</p>
                        <button className="btn btn-primary" onClick={() => openPkg(null)}><Plus size={16} /> {C.addPackage}</button>
                    </div>

                    {pkgs.length === 0 ? (
                        <div className="panel center muted" style={{ padding: 40 }}>{C.emptyPkg}</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {pkgs.map((p) => (
                                <div className="panel" key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="spread" style={{ alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 6px', fontSize: 20 }}>{p.name}</h3>
                                            <span className={roleBadge(p.role_target)}>{roleLabel(p.role_target)}</span>
                                        </div>
                                        <Switch on={p.is_active} onChange={(v) => togglePkgActive(p, v)} />
                                    </div>

                                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--plum)' }}>
                                        RM{Number(p.price_myr)}<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}> {intervalLabel(p.interval)}</span>
                                    </div>

                                    {(p.features ?? []).length > 0 && (
                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {(p.features ?? []).map((f, i) => (
                                                <li key={i} className="row" style={{ gap: 8, fontSize: 13.5, alignItems: 'flex-start' }}>
                                                    <Check size={15} style={{ color: 'var(--ok)', flexShrink: 0, marginTop: 2 }} /> <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className="row" style={{ marginTop: 'auto' }}>
                                        <button className="btn btn-ghost btn-sm grow" onClick={() => openPkg(p)}><Pencil size={14} /> {C.edit}</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => removePkg(p)} style={{ color: 'var(--bad)' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ---------------- BAUCAR ---------------- */}
            {tab === 'baucar' && (
                <DataTable
                    columns={vchCols}
                    rows={vchs}
                    searchKeys={['code', 'note']}
                    pageSize={10}
                    exportName="baucar"
                    onRowClick={(v) => openVch(v)}
                    empty={C.emptyVch}
                    toolbar={<button className="btn btn-primary btn-sm" onClick={() => openVch(null)}><Plus size={15} /> {C.addVoucher}</button>}
                />
            )}

            {/* ---------------- CIRI ---------------- */}
            {tab === 'ciri' && (
                <div className="panel" style={{ maxWidth: 720 }}>
                    <div className="row" style={{ marginBottom: 4 }}>
                        <div style={sectionIcon}><ToggleRight size={16} /></div>
                        <div>
                            <h3 style={{ margin: 0 }}>{C.featureToggles}</h3>
                            <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{C.togglesSub}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
                        <ToggleRow
                            title={C.t_allow_user_templates} desc={C.t_allow_user_templates_d}
                            on={isOn('allow_user_templates')} busy={togglingKey === 'allow_user_templates'}
                            onChange={(v) => setToggle('allow_user_templates', v)} onLabel={C.on} offLabel={C.offState}
                        />
                        <ToggleRow
                            title={C.t_payment_enabled_user} desc={C.t_payment_d}
                            on={isOn('payment_enabled_user')} busy={togglingKey === 'payment_enabled_user'}
                            onChange={(v) => setToggle('payment_enabled_user', v)} onLabel={C.on} offLabel={C.offState}
                        />
                        <ToggleRow
                            title={C.t_payment_enabled_vendor} desc={C.t_payment_d}
                            on={isOn('payment_enabled_vendor')} busy={togglingKey === 'payment_enabled_vendor'}
                            onChange={(v) => setToggle('payment_enabled_vendor', v)} onLabel={C.on} offLabel={C.offState}
                        />
                        <ToggleRow
                            title={C.t_payment_enabled_affiliate} desc={C.t_payment_d}
                            on={isOn('payment_enabled_affiliate')} busy={togglingKey === 'payment_enabled_affiliate'}
                            onChange={(v) => setToggle('payment_enabled_affiliate', v)} onLabel={C.on} offLabel={C.offState}
                        />
                        <ToggleRow
                            title={C.t_seat_names_private} desc={C.t_seat_names_private_d}
                            on={isOn('seat_names_private')} busy={togglingKey === 'seat_names_private'}
                            onChange={(v) => setToggle('seat_names_private', v)} onLabel={C.on} offLabel={C.offState} last
                        />
                    </div>
                </div>
            )}

            {/* ---------------- PACKAGE DRAWER ---------------- */}
            <Drawer
                open={!!editingPkg}
                onClose={() => setEditingPkg(null)}
                title={editingPkg?.id ? C.drawerPkgEdit : C.drawerPkgAdd}
                width={520}
                footer={editingPkg ? (
                    <>
                        <button type="button" className="btn btn-ghost" onClick={() => setEditingPkg(null)}>{C.cancel}</button>
                        <button type="submit" form="pkg-form" className="btn btn-primary" disabled={savingPkg}>{savingPkg ? C.saving : C.save}</button>
                    </>
                ) : undefined}
            >
                {editingPkg && (
                    <form id="pkg-form" onSubmit={savePkg} className="stack" style={{ gap: 0 }}>
                        <div className="field"><label>{C.pkgName}</label><input value={editingPkg.name} onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })} required /></div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 150 }}>
                                <label>{C.roleTarget}</label>
                                <select value={editingPkg.role_target} onChange={(e) => setEditingPkg({ ...editingPkg, role_target: e.target.value as Pkg['role_target'] })}>
                                    <option value="any">{C.roleAny}</option>
                                    <option value="vendor">{C.roleVendor}</option>
                                    <option value="affiliate">{C.roleAffiliate}</option>
                                </select>
                            </div>
                            <div className="field" style={{ width: 120 }}>
                                <label>{C.sort}</label>
                                <input type="number" value={editingPkg.sort} onChange={(e) => setEditingPkg({ ...editingPkg, sort: Number(e.target.value) })} />
                            </div>
                        </div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 130 }}>
                                <label>{C.price}</label>
                                <input type="number" min={0} step="0.01" value={editingPkg.price_myr} onChange={(e) => setEditingPkg({ ...editingPkg, price_myr: e.target.value })} />
                            </div>
                            <div className="field grow" style={{ minWidth: 130 }}>
                                <label>{C.interval}</label>
                                <select value={editingPkg.interval} onChange={(e) => setEditingPkg({ ...editingPkg, interval: e.target.value as Pkg['interval'] })}>
                                    <option value="monthly">{C.intMonthly}</option>
                                    <option value="yearly">{C.intYearly}</option>
                                    <option value="once">{C.intOnce}</option>
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label>{C.features}</label>
                            <div className="row" style={{ gap: 8 }}>
                                <input
                                    className="grow" value={featInput} placeholder={C.addFeature}
                                    onChange={(e) => setFeatInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                                />
                                <button type="button" className="btn btn-ghost btn-sm" onClick={addFeature}><Plus size={15} /></button>
                            </div>
                            {editingPkg.features.length === 0 ? (
                                <small className="muted" style={{ marginTop: 6 }}>{C.noFeatures}</small>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                    {editingPkg.features.map((f, i) => (
                                        <div key={i} className="spread" style={{ background: 'var(--cream)', borderRadius: 9, padding: '7px 10px 7px 12px', fontSize: 13.5 }}>
                                            <span className="row" style={{ gap: 8 }}><Check size={14} style={{ color: 'var(--ok)' }} /> {f}</span>
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeFeature(i)} style={{ color: 'var(--bad)', padding: 4 }} aria-label={C.del}><Trash2 size={13} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <label className="row" style={{ fontSize: 14, marginTop: 4, cursor: 'pointer', gap: 10 }}>
                            <Switch on={editingPkg.is_active} onChange={(v) => setEditingPkg({ ...editingPkg, is_active: v })} />
                            {C.activePkg}
                        </label>
                    </form>
                )}
            </Drawer>

            {/* ---------------- VOUCHER DRAWER ---------------- */}
            <Drawer
                open={!!editingVch}
                onClose={() => setEditingVch(null)}
                title={editingVch?.id ? C.drawerVchEdit : C.drawerVchAdd}
                width={480}
                footer={editingVch ? (
                    <>
                        {editingVch.id && <button type="button" className="btn btn-ghost" onClick={() => removeVch(editingVch)} style={{ color: 'var(--bad)', marginRight: 'auto' }}><Trash2 size={15} /> {C.del}</button>}
                        <button type="button" className="btn btn-ghost" onClick={() => setEditingVch(null)}>{C.cancel}</button>
                        <button type="submit" form="vch-form" className="btn btn-primary" disabled={savingVch}>{savingVch ? C.saving : C.save}</button>
                    </>
                ) : undefined}
            >
                {editingVch && (
                    <form id="vch-form" onSubmit={saveVch} className="stack" style={{ gap: 0 }}>
                        <div className="field">
                            <label>{C.code}</label>
                            <input value={editingVch.code} onChange={(e) => setEditingVch({ ...editingVch, code: e.target.value.toUpperCase() })} required style={{ textTransform: 'uppercase' }} />
                        </div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 150 }}>
                                <label>{C.kind}</label>
                                <select value={editingVch.kind} onChange={(e) => setEditingVch({ ...editingVch, kind: e.target.value as Vch['kind'] })}>
                                    <option value="full">{C.kindFull}</option>
                                    <option value="percent">{C.kindPercent}</option>
                                    <option value="amount">{C.kindAmount}</option>
                                </select>
                            </div>
                            {editingVch.kind !== 'full' && (
                                <div className="field grow" style={{ minWidth: 120 }}>
                                    <label>{editingVch.kind === 'percent' ? '%' : 'RM'}</label>
                                    <input type="number" min={0} step="0.01" value={editingVch.value} onChange={(e) => setEditingVch({ ...editingVch, value: e.target.value })} />
                                </div>
                            )}
                        </div>

                        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                            <div className="field grow" style={{ minWidth: 130 }}>
                                <label>{C.maxUses}</label>
                                <input type="number" min={1} value={editingVch.max_uses ?? ''} onChange={(e) => setEditingVch({ ...editingVch, max_uses: e.target.value })} />
                                <small className="muted">{C.maxUsesHint}</small>
                            </div>
                            <div className="field grow" style={{ minWidth: 150 }}>
                                <label>{C.expiresAt}</label>
                                <input type="datetime-local" value={editingVch.expires_at ?? ''} onChange={(e) => setEditingVch({ ...editingVch, expires_at: e.target.value })} />
                            </div>
                        </div>

                        <div className="field">
                            <label>{C.note}</label>
                            <input value={editingVch.note ?? ''} onChange={(e) => setEditingVch({ ...editingVch, note: e.target.value })} maxLength={200} />
                        </div>

                        <label className="row" style={{ fontSize: 14, marginTop: 4, cursor: 'pointer', gap: 10 }}>
                            <Switch on={editingVch.is_active} onChange={(v) => setEditingVch({ ...editingVch, is_active: v })} />
                            {C.activeVch}
                        </label>
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

/** A single labelled toggle row for the Ciri tab. */
function ToggleRow({ title, desc, on, busy, onChange, onLabel, offLabel, last }: {
    title: string; desc: string; on: boolean; busy: boolean;
    onChange: (v: boolean) => void; onLabel: string; offLabel: string; last?: boolean;
}) {
    return (
        <div className="spread" style={{ gap: 16, padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--line)', alignItems: 'flex-start' }}>
            <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{title}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{desc}</div>
            </div>
            <div className="row" style={{ gap: 10, flexShrink: 0 }}>
                <span className="muted" style={{ fontSize: 12, minWidth: 26, textAlign: 'right' }}>{on ? onLabel : offLabel}</span>
                <Switch on={on} onChange={onChange} disabled={busy} />
            </div>
        </div>
    );
}
