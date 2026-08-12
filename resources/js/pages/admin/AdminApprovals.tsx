import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ShieldCheck, HardDrive, Check, Upload, FileText, Sparkles, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable, type Column } from '../../components/DataTable';
import { Drawer } from '../../components/Drawer';
import { useLang } from '../../context/LangContext';
import { useDialog } from '../../context/DialogContext';
import { getTemplate } from '../../templates/registry';
import { SAMPLE_INVITATION } from '../../templates/sampleData';
import { normalizeConfig, type CustomTemplateConfig } from '../../templates/customConfig';
import type { InvitationData, Palette } from '../../templates/types';

interface Submitter { id: number; name: string; email: string }

type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'draft';

interface DesignSubmission {
    id: string; key: string; base_key?: string | null; name: string; category: string;
    description?: string | null; thumbnail?: string | null;
    palette?: Record<string, string> | null;
    config?: Partial<CustomTemplateConfig> | null;
    status?: SubmissionStatus | string | null;
    is_active?: boolean;
    submittedBy?: Submitter | null; submitted_by?: Submitter | number | null;
    created_at?: string; updated_at?: string;
}

const DEFAULT_PALETTE: Palette = { primary: '#5b3a2e', secondary: '#8a6d5f', accent: '#c9a24b', bg: '#f6efe6', text: '#4a3b33' };

/** The submission's underlying render component + a full palette for a faithful preview. */
function asPalette(src?: Record<string, string> | null): Palette {
    return {
        primary: src?.primary ?? DEFAULT_PALETTE.primary,
        secondary: src?.secondary ?? DEFAULT_PALETTE.secondary,
        accent: src?.accent ?? DEFAULT_PALETTE.accent,
        bg: src?.bg ?? DEFAULT_PALETTE.bg,
        text: src?.text ?? DEFAULT_PALETTE.text,
    };
}

function submitterOf(s: DesignSubmission): Submitter | null {
    if (s.submittedBy && typeof s.submittedBy === 'object') return s.submittedBy;
    if (s.submitted_by && typeof s.submitted_by === 'object') return s.submitted_by as Submitter;
    return null;
}

/** Small, non-interactive live render of a base component re-skinned with the submitted palette. */
function MiniSkin({ renderKey, palette, config }: {
    renderKey: string;
    palette: Record<string, string> | null | undefined;
    config?: Partial<CustomTemplateConfig> | null;
}) {
    const STAGE_W = 420;
    const W = 132;
    const scale = W / STAGE_W;
    const Tpl = getTemplate(renderKey);
    // Custom designs render from a JSON config; legacy submissions re-skin a base component via palette.
    const data: InvitationData = renderKey === 'custom'
        ? { ...SAMPLE_INVITATION, palette: asPalette(palette), templateConfig: normalizeConfig(config) }
        : { ...SAMPLE_INVITATION, palette: asPalette(palette) };
    return (
        <div style={{ width: W, height: 176, overflow: 'hidden', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', flexShrink: 0 }}>
            <div style={{ width: STAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                <Tpl data={data} preview />
            </div>
        </div>
    );
}

interface Applicant {
    id: number; name: string; email: string; phone?: string | null;
    role: string; company_name?: string | null; created_at?: string;
}

interface StorageReq {
    id: string | number;
    user?: { id: number; name: string; email: string } | null;
    user_id?: number;
    requested_mb: number;
    reason?: string | null;
    status: string;
    admin_note?: string | null;
    created_at?: string;
}

type Tab = 'approvals' | 'storage' | 'submissions';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export function AdminApprovals() {
    const { lang } = useLang();
    const dialog = useDialog();
    const C = ({
        bm: {
            title: 'Kelulusan', subtitle: 'Luluskan pendaftaran vendor & affiliate serta permohonan storan.',
            tabApprovals: 'Vendor & Affiliate', tabStorage: 'Permohonan Storan',
            name: 'Nama', email: 'E-mel', role: 'Peranan', company: 'Syarikat', applied: 'Dimohon', phone: 'Telefon',
            review: 'Semak', empty: 'Tiada permohonan menunggu kelulusan.',
            vendor: 'Vendor', affiliate: 'Affiliate', noCompany: '—',
            applicant: 'Butiran Pemohon',
            receipt: 'Resit Pembayaran', receiptHint: 'Muat naik gambar atau PDF resit pembayaran (pilihan, maks 4MB).',
            chooseFile: 'Pilih fail…', note: 'Nota', noteHint: 'Nota dalaman (pilihan).',
            approve: 'Luluskan', reject: 'Tolak', saving: 'Memproses…', close: 'Tutup',
            confirmReject: (n: string) => `Tolak permohonan ${n}? Akaun mereka akan ditandakan sebagai ditolak.`,
            approvedFlash: (n: string) => `${n} telah diluluskan dan dimaklumkan melalui e-mel.`,
            rejectedFlash: (n: string) => `Permohonan ${n} telah ditolak.`,
            // Storage
            user: 'Pengguna', requested: 'Diminta (MB)', reason: 'Sebab', status: 'Status',
            pending: 'Menunggu', approved: 'Diluluskan', rejected: 'Ditolak',
            emptyStorage: 'Tiada permohonan storan.',
            storageReq: 'Permohonan Storan', grant: 'Kuota diberi (MB)', grantHint: 'Lalai kepada jumlah yang diminta.',
            adminNote: 'Nota admin', decide: 'Buat keputusan', srApprovedFlash: 'Permohonan storan diluluskan.',
            srRejectedFlash: 'Permohonan storan ditolak.', decided: 'Telah diputuskan',
            // Design submissions
            tabSubmissions: 'Sumbangan Rekaan', emptySubmissions: 'Tiada sumbangan rekaan.',
            submittedByLbl: 'Disumbang oleh', basedOn: 'Asas', approveDesign: 'Luluskan', rejectDesign: 'Tolak',
            confirmRejectDesign: (n: string) => `Tolak rekaan “${n}”? Ia tidak akan diterbitkan.`,
            designApprovedFlash: (n: string) => `Rekaan “${n}” telah diluluskan dan kini tersedia untuk semua.`,
            designRejectedFlash: (n: string) => `Rekaan “${n}” telah ditolak.`,
            draft: 'Draf', filterAll: 'Semua',
            selectAll: 'Pilih semua', clearSel: 'Kosongkan pilihan',
            selectedCount: (n: number) => `${n} dipilih`,
            deleteSelected: 'Padam yang dipilih',
            confirmBulkDelete: (n: number) => `Padam ${n} sumbangan rekaan yang dipilih? Tindakan ini tidak boleh diundur.`,
            bulkDeletedFlash: (n: number) => `${n} sumbangan rekaan telah dipadam.`,
            approvedLine: 'Rekaan ini telah diluluskan dan tersedia untuk semua.',
            rejectedLine: 'Rekaan ini telah ditolak.',
        },
        en: {
            title: 'Approvals', subtitle: 'Approve vendor & affiliate sign-ups and storage requests.',
            tabApprovals: 'Vendor & Affiliate', tabStorage: 'Storage requests',
            name: 'Name', email: 'Email', role: 'Role', company: 'Company', applied: 'Applied', phone: 'Phone',
            review: 'Review', empty: 'No applications waiting for approval.',
            vendor: 'Vendor', affiliate: 'Affiliate', noCompany: '—',
            applicant: 'Applicant details',
            receipt: 'Payment receipt', receiptHint: 'Upload an image or PDF of the payment receipt (optional, max 4MB).',
            chooseFile: 'Choose file…', note: 'Note', noteHint: 'Internal note (optional).',
            approve: 'Approve', reject: 'Reject', saving: 'Processing…', close: 'Close',
            confirmReject: (n: string) => `Reject ${n}'s application? Their account will be marked as rejected.`,
            approvedFlash: (n: string) => `${n} has been approved and notified by email.`,
            rejectedFlash: (n: string) => `${n}'s application was rejected.`,
            // Storage
            user: 'User', requested: 'Requested (MB)', reason: 'Reason', status: 'Status',
            pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
            emptyStorage: 'No storage requests.',
            storageReq: 'Storage request', grant: 'Grant quota (MB)', grantHint: 'Defaults to the requested amount.',
            adminNote: 'Admin note', decide: 'Decide', srApprovedFlash: 'Storage request approved.',
            srRejectedFlash: 'Storage request rejected.', decided: 'Decided',
            // Design submissions
            tabSubmissions: 'Design submissions', emptySubmissions: 'No design submissions.',
            submittedByLbl: 'Submitted by', basedOn: 'Base', approveDesign: 'Approve', rejectDesign: 'Reject',
            confirmRejectDesign: (n: string) => `Reject the design “${n}”? It won’t be published.`,
            designApprovedFlash: (n: string) => `The design “${n}” has been approved and is now available to everyone.`,
            designRejectedFlash: (n: string) => `The design “${n}” was rejected.`,
            draft: 'Draft', filterAll: 'All',
            selectAll: 'Select all', clearSel: 'Clear selection',
            selectedCount: (n: number) => `${n} selected`,
            deleteSelected: 'Delete selected',
            confirmBulkDelete: (n: number) => `Delete ${n} selected design submission${n === 1 ? '' : 's'}? This cannot be undone.`,
            bulkDeletedFlash: (n: number) => `${n} design submission${n === 1 ? '' : 's'} deleted.`,
            approvedLine: 'This design has been approved and is available to everyone.',
            rejectedLine: 'This design was rejected.',
        },
    })[lang];

    const [tab, setTab] = useState<Tab>('approvals');
    const [approvals, setApprovals] = useState<Applicant[]>([]);
    const [storageReqs, setStorageReqs] = useState<StorageReq[]>([]);
    const [submissions, setSubmissions] = useState<DesignSubmission[]>([]);
    const [loadingA, setLoadingA] = useState(true);
    const [loadingS, setLoadingS] = useState(true);
    const [loadingD, setLoadingD] = useState(true);
    const [decidingId, setDecidingId] = useState<string | null>(null);

    // Design submissions: status sub-filter + multi-select for bulk delete
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Applicant approval drawer
    const [sel, setSel] = useState<Applicant | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [note, setNote] = useState('');

    // Storage decision drawer
    const [srSel, setSrSel] = useState<StorageReq | null>(null);
    const [grantMb, setGrantMb] = useState<number>(0);
    const [srNote, setSrNote] = useState('');

    const [saving, setSaving] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function showFlash(msg: string) {
        setFlash(msg);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 4000);
    }

    useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

    useEffect(() => {
        setLoadingA(true);
        api.get<Applicant[]>('/admin/approvals')
            .then((r) => setApprovals(Array.isArray(r.data) ? r.data : []))
            .finally(() => setLoadingA(false));

        setLoadingS(true);
        api.get('/admin/storage-requests')
            .then((r) => {
                const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
                setStorageReqs(list as StorageReq[]);
            })
            .finally(() => setLoadingS(false));

        setLoadingD(true);
        api.get('/admin/template-submissions')
            .then((r) => {
                const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
                setSubmissions(list as DesignSubmission[]);
            })
            .catch(() => setSubmissions([]))
            .finally(() => setLoadingD(false));
    }, []);

    /* ---------------- Applicant approval ---------------- */

    function openApplicant(a: Applicant) { setSel(a); setFile(null); setNote(''); }
    function closeApplicant() { setSel(null); setFile(null); setNote(''); }

    async function approve() {
        if (!sel) return;
        setSaving(true);
        try {
            const fd = new FormData();
            if (file) fd.append('receipt', file);
            if (note.trim()) fd.append('note', note.trim());
            await api.post(`/admin/approvals/${sel.id}/approve`, fd);
            setApprovals((rows) => rows.filter((r) => r.id !== sel.id));
            const name = sel.name;
            closeApplicant();
            showFlash(C.approvedFlash(name));
        } finally { setSaving(false); }
    }

    async function reject() {
        if (!sel) return;
        if (!(await dialog.confirm({ message: C.confirmReject(sel.name), danger: true, confirmText: C.reject }))) return;
        setSaving(true);
        try {
            await api.post(`/admin/approvals/${sel.id}/reject`, { note: note.trim() || null });
            setApprovals((rows) => rows.filter((r) => r.id !== sel.id));
            const name = sel.name;
            closeApplicant();
            showFlash(C.rejectedFlash(name));
        } finally { setSaving(false); }
    }

    /* ---------------- Storage decision ---------------- */

    function openStorage(sr: StorageReq) {
        setSrSel(sr);
        setGrantMb(sr.requested_mb);
        setSrNote(sr.admin_note ?? '');
    }
    function closeStorage() { setSrSel(null); }

    async function decide(status: 'approved' | 'rejected') {
        if (!srSel) return;
        setSaving(true);
        try {
            await api.post(`/admin/storage-requests/${srSel.id}/decide`, {
                status,
                admin_note: srNote.trim() || null,
                grant_mb: Number(grantMb),
            });
            setStorageReqs((rows) => rows.map((r) => (r.id === srSel.id
                ? { ...r, status, admin_note: srNote.trim() || null } : r)));
            closeStorage();
            showFlash(status === 'approved' ? C.srApprovedFlash : C.srRejectedFlash);
        } finally { setSaving(false); }
    }

    /* ---------------- Design submission decisions ---------------- */

    async function approveDesign(s: DesignSubmission) {
        setDecidingId(s.id);
        try {
            await api.post(`/admin/template-submissions/${s.id}/approve`);
            setSubmissions((rows) => rows.map((r) => (r.id === s.id ? { ...r, status: 'approved', is_active: true } : r)));
            showFlash(C.designApprovedFlash(s.name));
        } finally { setDecidingId(null); }
    }

    async function rejectDesign(s: DesignSubmission) {
        if (!(await dialog.confirm({ message: C.confirmRejectDesign(s.name), danger: true, confirmText: C.rejectDesign }))) return;
        setDecidingId(s.id);
        try {
            await api.post(`/admin/template-submissions/${s.id}/reject`);
            setSubmissions((rows) => rows.map((r) => (r.id === s.id ? { ...r, status: 'rejected', is_active: false } : r)));
            showFlash(C.designRejectedFlash(s.name));
        } finally { setDecidingId(null); }
    }

    /* ---------------- Design submissions: filtering + multi-select ---------------- */

    const statusOf = (s: DesignSubmission): string => (typeof s.status === 'string' && s.status ? s.status : 'pending');
    const filteredSubmissions = statusFilter === 'all'
        ? submissions
        : submissions.filter((s) => statusOf(s) === statusFilter);
    const pendingSubmissions = submissions.filter((s) => statusOf(s) === 'pending').length;

    const visibleIds = filteredSubmissions.map((s) => s.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
            else visibleIds.forEach((id) => next.add(id));
            return next;
        });
    }

    function clearSelection() { setSelectedIds(new Set()); }

    async function bulkDelete() {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        if (!(await dialog.confirm({ message: C.confirmBulkDelete(ids.length), danger: true, confirmText: C.deleteSelected }))) return;
        setBulkDeleting(true);
        try {
            await api.post('/admin/template-submissions/bulk-delete', { ids });
            const gone = new Set(ids);
            setSubmissions((rows) => rows.filter((r) => !gone.has(r.id)));
            clearSelection();
            showFlash(C.bulkDeletedFlash(ids.length));
        } finally { setBulkDeleting(false); }
    }

    /* ---------------- Columns ---------------- */

    const roleLabel = (role: string) => (role === 'affiliate' ? C.affiliate : C.vendor);

    const appCols: Column<Applicant>[] = [
        { key: 'name', label: C.name, sortable: true, sortValue: (a) => a.name.toLowerCase(), render: (a) => <strong>{a.name}</strong> },
        { key: 'email', label: C.email, sortable: true, render: (a) => <span className="muted">{a.email}</span> },
        {
            key: 'role', label: C.role, sortable: true,
            render: (a) => (a.role === 'affiliate'
                ? <span className="badge">{C.affiliate}</span>
                : <span className="badge badge-gold">{C.vendor}</span>),
        },
        { key: 'company_name', label: C.company, render: (a) => a.company_name ? a.company_name : <span className="muted">{C.noCompany}</span> },
        { key: 'created_at', label: C.applied, sortable: true, sortValue: (a) => a.created_at ?? '', render: (a) => <span className="muted">{fmtDate(a.created_at)}</span> },
        {
            key: '_action', label: '', align: 'right',
            render: (a) => (
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openApplicant(a); }}>
                    <ShieldCheck size={14} /> {C.review}
                </button>
            ),
        },
    ];

    const srCols: Column<StorageReq>[] = [
        { key: 'user', label: C.user, render: (s) => <strong>{s.user?.name ?? `#${s.user_id ?? s.id}`}</strong> },
        { key: 'requested_mb', label: C.requested, align: 'right', sortable: true, sortValue: (s) => s.requested_mb, render: (s) => s.requested_mb.toLocaleString('ms-MY') },
        { key: 'reason', label: C.reason, render: (s) => s.reason ? s.reason : <span className="muted">—</span> },
        { key: 'status', label: C.status, sortable: true, render: (s) => srBadge(s.status, { pending: C.pending, approved: C.approved, rejected: C.rejected }) },
        { key: 'created_at', label: C.applied, sortable: true, sortValue: (s) => s.created_at ?? '', render: (s) => <span className="muted">{fmtDate(s.created_at)}</span> },
        {
            key: '_action', label: '', align: 'right',
            render: (s) => (s.status === 'pending'
                ? (
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openStorage(s); }}>
                        {C.decide}
                    </button>
                )
                : <span className="muted" style={{ fontSize: 12 }}>{C.decided}</span>),
        },
    ];

    const pendingStorage = storageReqs.filter((s) => s.status === 'pending').length;

    const filterPills: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: C.filterAll },
        { key: 'pending', label: C.pending },
        { key: 'approved', label: C.approved },
        { key: 'rejected', label: C.rejected },
    ];

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            {flash && (
                <div style={flashStyle}>
                    <Check size={16} /> {flash}
                </div>
            )}

            {/* Tabs */}
            <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
                <button className={`btn btn-sm ${tab === 'approvals' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('approvals')}>
                    <ShieldCheck size={15} /> {C.tabApprovals}
                    {approvals.length > 0 && <span className="badge" style={pillStyle}>{approvals.length}</span>}
                </button>
                <button className={`btn btn-sm ${tab === 'storage' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('storage')}>
                    <HardDrive size={15} /> {C.tabStorage}
                    {pendingStorage > 0 && <span className="badge" style={pillStyle}>{pendingStorage}</span>}
                </button>
                <button className={`btn btn-sm ${tab === 'submissions' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('submissions')}>
                    <Sparkles size={15} /> {C.tabSubmissions}
                    {pendingSubmissions > 0 && <span className="badge" style={pillStyle}>{pendingSubmissions}</span>}
                </button>
            </div>

            {tab === 'approvals' && (
                loadingA ? <div className="loading-screen"><div className="spinner" /></div> : (
                    <div className="panel" style={{ padding: 16 }}>
                        <DataTable
                            columns={appCols}
                            rows={approvals}
                            searchKeys={['name', 'email', 'company_name']}
                            pageSize={12}
                            onRowClick={openApplicant}
                            empty={C.empty}
                            exportName="kelulusan"
                        />
                    </div>
                )
            )}

            {tab === 'storage' && (
                loadingS ? <div className="loading-screen"><div className="spinner" /></div> : (
                    <div className="panel" style={{ padding: 16 }}>
                        <DataTable
                            columns={srCols}
                            rows={storageReqs}
                            pageSize={12}
                            onRowClick={(s) => s.status === 'pending' && openStorage(s)}
                            empty={C.emptyStorage}
                            exportName="permohonan-storan"
                        />
                    </div>
                )
            )}

            {tab === 'submissions' && (
                loadingD ? <div className="loading-screen"><div className="spinner" /></div> : (
                    <div>
                        {/* Status sub-filter + select-all */}
                        <div className="row wrap" style={{ gap: 8, marginBottom: 12, alignItems: 'center' }}>
                            {filterPills.map((p) => (
                                <button
                                    key={p.key}
                                    className={`btn btn-sm ${statusFilter === p.key ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setStatusFilter(p.key)}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ marginLeft: 'auto' }}
                                onClick={toggleSelectAll}
                                disabled={visibleIds.length === 0}
                            >
                                {allVisibleSelected ? <CheckSquare size={14} /> : <Square size={14} />} {C.selectAll}
                            </button>
                        </div>

                        {/* Bulk action bar */}
                        {selectedIds.size > 0 && (
                            <div style={bulkBarStyle}>
                                <strong style={{ fontSize: 14 }}>{C.selectedCount(selectedIds.size)}</strong>
                                <div className="row" style={{ gap: 8, marginLeft: 'auto' }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelection} disabled={bulkDeleting}>
                                        {C.clearSel}
                                    </button>
                                    <button type="button" className="btn btn-sm" style={dangerBtnStyle} onClick={bulkDelete} disabled={bulkDeleting}>
                                        <Trash2 size={14} /> {bulkDeleting ? C.saving : C.deleteSelected}
                                    </button>
                                </div>
                            </div>
                        )}

                        {filteredSubmissions.length === 0 ? (
                            <div className="panel" style={{ padding: '30px 20px', textAlign: 'center' }}>
                                <span className="muted" style={{ fontSize: 14 }}>{C.emptySubmissions}</span>
                            </div>
                        ) : (
                            <div style={subGrid}>
                                {filteredSubmissions.map((s) => {
                                    const who = submitterOf(s);
                                    const busy = decidingId === s.id;
                                    const renderKey = s.base_key || s.key;
                                    const status = statusOf(s);
                                    const selected = selectedIds.has(s.id);
                                    return (
                                        <div
                                            key={s.id}
                                            className="panel"
                                            style={{
                                                padding: 14, display: 'flex', gap: 14, position: 'relative',
                                                border: selected ? '1px solid var(--plum)' : undefined,
                                                boxShadow: selected ? '0 0 0 1px var(--plum)' : undefined,
                                            }}
                                        >
                                            <label
                                                style={selectBoxStyle}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => toggleSelect(s.id)}
                                                    aria-label={`${C.selectAll}: ${s.name}`}
                                                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                                                />
                                            </label>
                                            <MiniSkin renderKey={renderKey} palette={s.palette} config={s.config} />
                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <strong style={{ fontSize: 15 }}>{s.name}</strong>
                                                    {submissionBadge(status, { pending: C.pending, approved: C.approved, rejected: C.rejected, draft: C.draft })}
                                                    <span className="badge" style={{ textTransform: 'capitalize' }}>{s.category}</span>
                                                </div>
                                                {s.base_key && (
                                                    <div className="muted" style={{ fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>
                                                        {C.basedOn}: {s.base_key}
                                                    </div>
                                                )}
                                                {who && (
                                                    <div className="muted" style={{ fontSize: 12, marginTop: 6, wordBreak: 'break-word' }}>
                                                        {C.submittedByLbl} <strong style={{ color: 'var(--ink)' }}>{who.name}</strong>
                                                        <br />{who.email}
                                                    </div>
                                                )}
                                                {s.description && (
                                                    <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>{s.description}</p>
                                                )}
                                                <div className="row wrap" style={{ gap: 8, marginTop: 'auto', paddingTop: 12 }}>
                                                    {status === 'pending' ? (
                                                        <>
                                                            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => approveDesign(s)}>
                                                                <Check size={14} /> {busy ? C.saving : C.approveDesign}
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => rejectDesign(s)} style={{ color: 'var(--bad)' }}>
                                                                <X size={14} /> {C.rejectDesign}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="muted" style={{ fontSize: 12 }}>
                                                            {status === 'approved' ? C.approvedLine : status === 'rejected' ? C.rejectedLine : C.draft}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )
            )}

            {/* Applicant approval drawer */}
            <Drawer
                open={!!sel}
                onClose={closeApplicant}
                title={C.applicant}
                width={480}
                footer={sel ? (
                    <>
                        <button type="button" className="btn btn-ghost" onClick={reject} disabled={saving} style={{ color: 'var(--bad)' }}>
                            {C.reject}
                        </button>
                        <button type="submit" form="approve-form" className="btn btn-primary" disabled={saving}>
                            <Check size={15} /> {saving ? C.saving : C.approve}
                        </button>
                    </>
                ) : undefined}
            >
                {sel && (
                    <form id="approve-form" onSubmit={(e) => { e.preventDefault(); approve(); }} className="stack" style={{ gap: 0 }}>
                        <div style={detailCard}>
                            <Row label={C.name} value={<strong>{sel.name}</strong>} />
                            <Row label={C.email} value={sel.email} />
                            <Row label={C.phone} value={sel.phone ?? '—'} />
                            <Row label={C.company} value={sel.company_name ?? '—'} />
                            <Row label={C.role} value={roleLabel(sel.role)} />
                            <Row label={C.applied} value={fmtDate(sel.created_at)} />
                        </div>

                        <div className="field">
                            <label>{C.receipt}</label>
                            <label className="btn btn-ghost btn-block" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                                {file ? <FileText size={16} /> : <Upload size={16} />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file ? file.name : C.chooseFile}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <small className="muted">{C.receiptHint}</small>
                        </div>

                        <div className="field">
                            <label>{C.note}</label>
                            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                            <small className="muted">{C.noteHint}</small>
                        </div>
                    </form>
                )}
            </Drawer>

            {/* Storage decision drawer */}
            <Drawer
                open={!!srSel}
                onClose={closeStorage}
                title={C.storageReq}
                width={460}
                footer={srSel ? (
                    <>
                        <button type="button" className="btn btn-ghost" onClick={() => decide('rejected')} disabled={saving} style={{ color: 'var(--bad)' }}>
                            {C.reject}
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => decide('approved')} disabled={saving}>
                            <Check size={15} /> {saving ? C.saving : C.approve}
                        </button>
                    </>
                ) : undefined}
            >
                {srSel && (
                    <div className="stack" style={{ gap: 0 }}>
                        <div style={detailCard}>
                            <Row label={C.user} value={<strong>{srSel.user?.name ?? `#${srSel.user_id ?? srSel.id}`}</strong>} />
                            {srSel.user?.email && <Row label={C.email} value={srSel.user.email} />}
                            <Row label={C.requested} value={`${srSel.requested_mb.toLocaleString('ms-MY')} MB`} />
                            {srSel.reason && <Row label={C.reason} value={srSel.reason} />}
                        </div>

                        <div className="field">
                            <label>{C.grant}</label>
                            <input type="number" min={0} value={grantMb} onChange={(e) => setGrantMb(Number(e.target.value))} />
                            <small className="muted">{C.grantHint}</small>
                        </div>

                        <div className="field">
                            <label>{C.adminNote}</label>
                            <textarea rows={3} value={srNote} onChange={(e) => setSrNote(e.target.value)} />
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="spread" style={{ padding: '7px 0', fontSize: 14, gap: 12 }}>
            <span className="muted" style={{ flexShrink: 0 }}>{label}</span>
            <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
        </div>
    );
}

function srBadge(status: string, labels: { pending: string; approved: string; rejected: string }): ReactNode {
    if (status === 'approved') return <span className="badge badge-ok">{labels.approved}</span>;
    if (status === 'rejected') return <span className="badge badge-bad">{labels.rejected}</span>;
    return <span className="badge">{labels.pending}</span>;
}

/** Status pill for a design submission: pending=amber, approved=green, rejected=red, draft=neutral. */
function submissionBadge(status: string, labels: { pending: string; approved: string; rejected: string; draft: string }): ReactNode {
    if (status === 'approved') return <span className="badge badge-ok">{labels.approved}</span>;
    if (status === 'rejected') return <span className="badge badge-bad">{labels.rejected}</span>;
    if (status === 'draft') return <span className="badge">{labels.draft}</span>;
    return <span className="badge badge-gold">{labels.pending}</span>;
}

function fmtDate(s?: string): string {
    if (!s) return '—';
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

const flashStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, background: '#e4f3ec', border: '1px solid #b7e0c8',
    color: '#1b7a46', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 14,
};
const pillStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.25)', color: 'inherit', padding: '1px 8px', fontSize: 11,
};
const detailCard: React.CSSProperties = {
    background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 12,
    padding: '6px 14px', marginBottom: 16,
};
const subGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14,
};
const bulkBarStyle: React.CSSProperties = {
    position: 'sticky', top: 8, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 12,
    padding: '10px 14px', marginBottom: 12,
};
const dangerBtnStyle: React.CSSProperties = {
    background: 'var(--bad)', borderColor: 'var(--bad)', color: '#fff',
};
const selectBoxStyle: React.CSSProperties = {
    position: 'absolute', top: 8, left: 8, zIndex: 2, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 8,
    background: 'rgba(255,255,255,0.9)', border: '1px solid var(--line)', cursor: 'pointer',
};
