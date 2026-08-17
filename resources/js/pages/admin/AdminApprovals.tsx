import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ShieldCheck, HardDrive, Check, Upload, FileText, Sparkles, X, Trash2, CheckSquare, Square, Wallet, Eye } from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { api } from '../../lib/api';
import { url as appUrl, mediaUrl } from '../../lib/base';
import { DataTable, type Column } from '../../components/DataTable';
import { Drawer } from '../../components/Drawer';
import { useLang, dict } from '../../context/LangContext';
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
    status?: string | null; approved_at?: string | null;
    // Decision artefacts — let a past approval be reopened and audited.
    approval_receipt?: string | null;
    approval_note?: string | null;
    approval_payment_id?: string | null;
    // A row is either a direct vendor/affiliate sign-up ('user') or an existing
    // normal user's upgrade request ('role_request'). Both review the same way; the
    // approve/reject calls route by source. `request_id` targets the role_requests row.
    source?: 'user' | 'role_request';
    request_id?: number;
    // The applicant's own note from an upgrade request ("why I want this").
    request_note?: string | null;
}

/** A pending user→vendor/affiliate upgrade request, as returned by /admin/role-requests. */
interface RoleReqRow {
    request_id: number; user_id: number; name: string; email: string;
    phone?: string | null; company_name?: string | null;
    requested_role: string; note?: string | null; status: string; created_at?: string;
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
    /**
     * Receipts are served from an authenticated API route, so they cannot be a
     * plain link — fetch the bytes, then open them as a blob URL.
     */
    async function openReceipt(userId: string) {
        try {
            const r = await api.get(`/admin/approvals/${userId}/receipt`, { responseType: 'blob' });
            const url = URL.createObjectURL(r.data as Blob);
            window.open(url, '_blank', 'noreferrer');
            // Give the new tab time to claim it before releasing the handle.
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch {
            await dialog.alert({ title: C.viewReceipt, message: C.receiptMissing });
        }
    }

    const C = dict({
        bm: {
            title: 'Kelulusan', subtitle: 'Luluskan pendaftaran & permohonan naik taraf vendor/affiliate serta permohonan storan.',
            tabApprovals: 'Vendor & Affiliate', tabStorage: 'Permohonan Storan',
            name: 'Nama', email: 'E-mel', role: 'Peranan', company: 'Syarikat', applied: 'Dimohon', phone: 'Telefon',
            review: 'Semak', empty: 'Tiada permohonan menunggu kelulusan.',
            vendor: 'Vendor', affiliate: 'Affiliate', noCompany: '—',
            applicant: 'Butiran Pemohon',
            srcNew: 'Pendaftaran', srcUpgrade: 'Naik taraf', srcLabel: 'Jenis', applicantNote: 'Nota pemohon',
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
            viewReceipt: 'Lihat Resit', noReceipt: 'Tiada resit dimuat naik', receiptMissing: 'Fail resit tidak dijumpai pada pelayan.',
            finTitle: 'Rekod ke Kewangan',
            finHint: 'Kelulusan diselesaikan di luar sistem, jadi bayarannya tidak muncul dalam Kewangan sehingga direkodkan di sini. Masukkan jumlah yang benar-benar diterima.',
            finAmount: 'Jumlah diterima (RM)', finNote: 'Rujukan / nota (pilihan)', finDone: 'Selesai',
            finRecorded: 'Telah direkodkan dalam Kewangan',
            finRecordedFlash: (n: string) => `Bayaran ${n} telah direkodkan dalam Kewangan.`,
            finAmountInvalid: 'Sila masukkan jumlah yang sah.',
            finFailed: 'Bayaran belum berjaya direkodkan. Sila cuba lagi.',
            previewDesign: 'Pratonton',
            approvedLine: 'Rekaan ini telah diluluskan dan tersedia untuk semua.',
            rejectedLine: 'Rekaan ini telah ditolak.',
        },
        en: {
            title: 'Approvals', subtitle: 'Approve vendor & affiliate sign-ups and upgrade requests, plus storage requests.',
            tabApprovals: 'Vendor & Affiliate', tabStorage: 'Storage requests',
            name: 'Name', email: 'Email', role: 'Role', company: 'Company', applied: 'Applied', phone: 'Phone',
            review: 'Review', empty: 'No applications waiting for approval.',
            vendor: 'Vendor', affiliate: 'Affiliate', noCompany: '—',
            applicant: 'Applicant details',
            srcNew: 'Sign-up', srcUpgrade: 'Upgrade', srcLabel: 'Type', applicantNote: 'Applicant note',
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
            viewReceipt: 'View receipt', noReceipt: 'No receipt uploaded', receiptMissing: 'The receipt file was not found on the server.',
            finTitle: 'Record to Finance',
            finHint: 'Approvals are settled offline, so the payment never reaches Finance until it is recorded here. Enter the amount actually collected.',
            finAmount: 'Amount received (RM)', finNote: 'Reference / note (optional)', finDone: 'Done',
            finRecorded: 'Recorded in Finance',
            finRecordedFlash: (n: string) => `${n}'s payment has been recorded in Finance.`,
            finAmountInvalid: 'Please enter a valid amount.',
            finFailed: 'Could not record the payment. Please try again.',
            previewDesign: 'Preview',
            approvedLine: 'This design has been approved and is available to everyone.',
            rejectedLine: 'This design was rejected.',
        },
        zh: {
            title: '审批', subtitle: '审核商家与联盟伙伴的注册及升级申请，以及扩容申请。',
            tabApprovals: '商家与联盟伙伴', tabStorage: '扩容申请',
            name: '姓名', email: '电子邮箱', role: '身份', company: '公司', applied: '申请时间', phone: '电话',
            review: '审核', empty: '暂无待审批的申请。',
            vendor: '商家', affiliate: '联盟伙伴', noCompany: '—',
            applicant: '申请人资料',
            srcNew: '注册', srcUpgrade: '升级', srcLabel: '类型', applicantNote: '申请人备注',
            receipt: '付款凭证', receiptHint: '上传付款凭证的图片或 PDF（可选，最大 4MB）。',
            chooseFile: '选择文件…', note: '备注', noteHint: '内部备注（可选）。',
            approve: '批准', reject: '拒绝', saving: '处理中…', close: '关闭',
            confirmReject: (n: string) => `拒绝 ${n} 的申请？该账户将被标记为未通过。`,
            approvedFlash: (n: string) => `${n} 已通过审批，并已发送邮件通知。`,
            rejectedFlash: (n: string) => `${n} 的申请已被拒绝。`,
            // Storage
            user: '用户', requested: '申请容量（MB）', reason: '申请理由', status: '状态',
            pending: '待审核', approved: '已批准', rejected: '未通过',
            emptyStorage: '暂无扩容申请。',
            storageReq: '扩容申请', grant: '批准容量（MB）', grantHint: '默认为申请的容量。',
            adminNote: '管理员备注', decide: '提交决定', srApprovedFlash: '扩容申请已批准。',
            srRejectedFlash: '扩容申请已拒绝。', decided: '已处理',
            // Design submissions
            tabSubmissions: '设计投稿', emptySubmissions: '暂无设计投稿。',
            submittedByLbl: '投稿人', basedOn: '基础设计', approveDesign: '通过', rejectDesign: '拒绝',
            confirmRejectDesign: (n: string) => `拒绝设计「${n}」？该设计将不会发布。`,
            designApprovedFlash: (n: string) => `设计「${n}」已通过审核，现已向所有人开放。`,
            designRejectedFlash: (n: string) => `设计「${n}」已被拒绝。`,
            draft: '草稿', filterAll: '全部',
            selectAll: '全选', clearSel: '清除选择',
            selectedCount: (n: number) => `已选择 ${n} 项`,
            deleteSelected: '删除所选',
            confirmBulkDelete: (n: number) => `确定删除所选的 ${n} 项设计投稿？此操作无法撤销。`,
            bulkDeletedFlash: (n: number) => `已删除 ${n} 项设计投稿。`,
            viewReceipt: '查看凭证', noReceipt: '未上传凭证', receiptMissing: '服务器上找不到凭证文件。',
            finTitle: '记入财务',
            finHint: '审批款项在系统外结算，只有在此登记后才会计入财务。请填写实际收到的金额。',
            finAmount: '实收金额（RM）', finNote: '参考编号 / 备注（可选）', finDone: '完成',
            finRecorded: '已记入财务',
            finRecordedFlash: (n: string) => `${n} 的款项已记入财务。`,
            finAmountInvalid: '请输入有效金额。',
            finFailed: '记录失败，请重试。',
            previewDesign: '预览',
            approvedLine: '此设计已通过审核，现已向所有人开放。',
            rejectedLine: '此设计已被拒绝。',
        },
    }, lang);

    const [tab, setTab] = useState<Tab>('approvals');
    const [approvals, setApprovals] = useState<Applicant[]>([]);
    const [storageReqs, setStorageReqs] = useState<StorageReq[]>([]);
    const [submissions, setSubmissions] = useState<DesignSubmission[]>([]);
    const [loadingA, setLoadingA] = useState(true);
    const [loadingS, setLoadingS] = useState(true);
    const [loadingD, setLoadingD] = useState(true);
    const [decidingId, setDecidingId] = useState<string | null>(null);

    // Vendor & affiliate applicants: status sub-filter over the full (all-status) list
    const [appStatusFilter, setAppStatusFilter] = useState<StatusFilter>('all');

    // Design submissions: status sub-filter + multi-select for bulk delete
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Applicant approval drawer
    const [sel, setSel] = useState<Applicant | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [note, setNote] = useState('');
    // "Add to finance" sub-form inside the applicant drawer
    const [finAmount, setFinAmount] = useState('');
    const [finNote, setFinNote] = useState('');
    const [finSaving, setFinSaving] = useState(false);
    const [finErr, setFinErr] = useState<string | null>(null);

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
        // Direct vendor/affiliate sign-ups AND pending upgrade requests from existing
        // users share one review surface. A pending request's user is still role='user'
        // (not in /admin/approvals), so the two lists never overlap.
        Promise.all([
            api.get<Applicant[]>('/admin/approvals').catch(() => ({ data: [] as Applicant[] })),
            api.get<RoleReqRow[]>('/admin/role-requests').catch(() => ({ data: [] as RoleReqRow[] })),
        ])
            .then(([a, rq]) => {
                const applicants = Array.isArray(a.data) ? a.data.map((x) => ({ ...x, source: 'user' as const })) : [];
                const requests: Applicant[] = (Array.isArray(rq.data) ? rq.data : []).map((r) => ({
                    id: r.user_id,
                    request_id: r.request_id,
                    source: 'role_request' as const,
                    name: r.name,
                    email: r.email,
                    phone: r.phone,
                    company_name: r.company_name,
                    role: r.requested_role,
                    status: r.status || 'pending',
                    created_at: r.created_at,
                    request_note: r.note ?? null,
                }));
                // Requests (newest attention items) first, then the applicant history.
                setApprovals([...requests, ...applicants]);
            })
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

    function openApplicant(a: Applicant) {
        setSel(a); setFile(null); setNote('');
        setFinAmount(''); setFinNote(''); setFinErr(null);
    }
    function closeApplicant() {
        setSel(null); setFile(null); setNote('');
        setFinAmount(''); setFinNote(''); setFinErr(null);
    }

    /**
     * Book the approval receipt into finance. Approvals are settled offline, so
     * without this the money never reaches the Finance tab and vendor revenue
     * reads as zero. The server refuses a second attempt, so the totals can't be
     * inflated by double-clicking.
     */
    async function recordPayment() {
        if (!sel) return;
        const amount = Number(finAmount);
        if (!Number.isFinite(amount) || amount <= 0) { setFinErr(C.finAmountInvalid); return; }
        setFinSaving(true);
        setFinErr(null);
        try {
            const r = await api.post<{ user: Applicant }>(`/admin/approvals/${sel.id}/record-payment`, {
                amount_myr: amount,
                note: finNote || undefined,
            });
            setSel(r.data.user);
            setApprovals((prev) => prev.map((a) => (a.id === sel.id ? { ...a, ...r.data.user } : a)));
            showFlash(C.finRecordedFlash(sel.name));
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setFinErr(msg ?? C.finFailed);
        } finally {
            setFinSaving(false);
        }
    }

    async function approve() {
        if (!sel) return;
        setSaving(true);
        try {
            const fd = new FormData();
            if (file) fd.append('receipt', file);
            if (note.trim()) fd.append('note', note.trim());

            if (sel.source === 'role_request') {
                // Approving an upgrade request flips the user's role, applies their
                // onboarding details, and stores the receipt — then they become a
                // regular active applicant (whose row supports "record to finance").
                const r = await api.post<{ user: Applicant }>(`/admin/role-requests/${sel.request_id}/approve`, fd);
                const u = r.data.user;
                setApprovals((rows) => rows.map((x) => (x.source === 'role_request' && x.request_id === sel.request_id)
                    ? { ...x, ...u, source: 'user' as const, id: u.id, status: u.status ?? 'active' }
                    : x));
            } else {
                await api.post(`/admin/approvals/${sel.id}/approve`, fd);
                // Keep the row visible under its new status instead of dropping it from the list.
                setApprovals((rows) => rows.map((r) => (r.id === sel.id && r.source !== 'role_request'
                    ? { ...r, status: 'active', approved_at: new Date().toISOString() } : r)));
            }
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
            if (sel.source === 'role_request') {
                await api.post(`/admin/role-requests/${sel.request_id}/reject`, { note: note.trim() || null });
                setApprovals((rows) => rows.map((x) => (x.source === 'role_request' && x.request_id === sel.request_id)
                    ? { ...x, status: 'rejected' } : x));
            } else {
                await api.post(`/admin/approvals/${sel.id}/reject`, { note: note.trim() || null });
                // Keep the row visible under its new status instead of dropping it from the list.
                setApprovals((rows) => rows.map((r) => (r.id === sel.id && r.source !== 'role_request' ? { ...r, status: 'rejected' } : r)));
            }
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

    /* ---------------- Applicants: filtering ---------------- */

    // Treat a missing status as pending; "Approved" maps to the active account status.
    const appStatusOf = (a: Applicant): string => (typeof a.status === 'string' && a.status ? a.status : 'pending');
    const matchesAppFilter = (a: Applicant): boolean => {
        const st = appStatusOf(a);
        if (appStatusFilter === 'approved') return st === 'active';
        if (appStatusFilter === 'rejected') return st === 'rejected';
        if (appStatusFilter === 'pending') return st === 'pending';
        return true;
    };
    const filteredApprovals = appStatusFilter === 'all' ? approvals : approvals.filter(matchesAppFilter);
    const pendingApprovals = approvals.filter((a) => appStatusOf(a) === 'pending').length;

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
        {
            key: '_source', label: C.srcLabel, sortable: true, sortValue: (a) => a.source ?? 'user',
            render: (a) => (a.source === 'role_request'
                ? <span className="badge" style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}>{C.srcUpgrade}</span>
                : <span className="muted" style={{ fontSize: 12.5 }}>{C.srcNew}</span>),
        },
        { key: 'company_name', label: C.company, render: (a) => a.company_name ? a.company_name : <span className="muted">{C.noCompany}</span> },
        { key: 'created_at', label: C.applied, sortable: true, sortValue: (a) => a.created_at ?? '', render: (a) => <span className="muted">{fmtDate(a.created_at)}</span> },
        {
            key: 'status', label: C.status, sortable: true, sortValue: (a) => appStatusOf(a),
            render: (a) => applicantBadge(appStatusOf(a), { pending: C.pending, approved: C.approved, rejected: C.rejected }),
        },
        {
            key: '_action', label: '', align: 'right',
            render: (a) => (appStatusOf(a) === 'pending'
                ? (
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openApplicant(a); }}>
                        <ShieldCheck size={14} /> {C.review}
                    </button>
                )
                : <span className="muted" style={{ fontSize: 12 }}>{C.decided}</span>),
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
                    {pendingApprovals > 0 && <span className="badge" style={pillStyle}>{pendingApprovals}</span>}
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
                    <div>
                        {/* Status sub-filter */}
                        <div className="row wrap" style={{ gap: 8, marginBottom: 12, alignItems: 'center' }}>
                            {filterPills.map((p) => (
                                <button
                                    key={p.key}
                                    className={`btn btn-sm ${appStatusFilter === p.key ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setAppStatusFilter(p.key)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="panel" style={{ padding: 16 }}>
                            <DataTable
                                columns={appCols}
                                rows={filteredApprovals}
                                searchKeys={['name', 'email', 'company_name']}
                                pageSize={12}
                                onRowClick={(a) => openApplicant(a)}
                                empty={C.empty}
                                exportName="kelulusan"
                            />
                        </div>
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
                                            className="sub-card"
                                            style={{
                                                borderColor: selected ? 'var(--plum)' : undefined,
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
                                            <div className="sub-card-top">
                                            <MiniSkin renderKey={renderKey} palette={s.palette} config={s.config} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
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
                                            </div>
                                            </div>

                                            <div className="sub-card-actions">
                                                {/* Judge the real thing, not the thumbnail. The public
                                                    preview route serves unapproved designs to staff. */}
                                                <a
                                                    className="btn btn-ghost btn-sm"
                                                    href={appUrl(`/templates/${s.key}`)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Eye size={14} /> {C.previewDesign}
                                                </a>
                                                {status === 'pending' ? (
                                                    <>
                                                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => approveDesign(s)}>
                                                            <Check size={14} /> {busy ? C.saving : C.approveDesign}
                                                        </button>
                                                        {/* Icon-only: destructive, and it keeps all three
                                                            actions on one line at the narrowest card width. */}
                                                        <button
                                                            className="btn btn-ghost btn-sm sub-card-reject"
                                                            disabled={busy}
                                                            onClick={() => rejectDesign(s)}
                                                            title={C.rejectDesign}
                                                            aria-label={C.rejectDesign}
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
                                                        {status === 'approved' ? C.approvedLine : status === 'rejected' ? C.rejectedLine : C.draft}
                                                    </span>
                                                )}
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
                footer={sel && appStatusOf(sel) === 'pending' ? (
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
                            {sel.source === 'role_request' && (
                                <Row label={C.srcLabel} value={<span className="badge" style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}>{C.srcUpgrade}</span>} />
                            )}
                            {sel.request_note && <Row label={C.applicantNote} value={sel.request_note} />}
                            <Row label={C.applied} value={fmtDate(sel.created_at)} />
                        </div>

                        {appStatusOf(sel) === 'pending' ? (
                            <>
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
                            </>
                        ) : (
                            <>
                                {/* Already decided: show the audit trail, not the decision form. */}
                                <div style={detailCard}>
                                    <Row
                                        label={C.status}
                                        value={appStatusOf(sel) === 'active'
                                            ? <span className="badge badge-ok">{C.approved}</span>
                                            : <span className="badge badge-bad">{C.rejected}</span>}
                                    />
                                    <Row label={C.decided} value={fmtDate(sel.approved_at ?? undefined)} />
                                    <Row
                                        label={C.receipt}
                                        value={sel.approval_receipt
                                            ? (
                                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openReceipt(String(sel.id))}>
                                                    <FileText size={14} /> {C.viewReceipt}
                                                </button>
                                            )
                                            : <span className="muted">{C.noReceipt}</span>}
                                    />
                                    {sel.approval_note && <Row label={C.note} value={sel.approval_note} />}
                                </div>

                                {appStatusOf(sel) === 'active' && (
                                    <div style={{ marginTop: 18 }}>
                                        <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{C.finTitle}</h4>
                                        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '0 0 12px' }}>
                                            {C.finHint}
                                        </p>

                                        {sel.approval_payment_id ? (
                                            <div className="row" style={{ gap: 8, color: 'var(--ok)', fontWeight: 600, fontSize: 13.5 }}>
                                                <Check size={16} /> {C.finRecorded}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="field">
                                                    <label>{C.finAmount}</label>
                                                    <NumberInput
                                                        decimals
                                                        min={0}
                                                        step="0.01"
                                                        value={finAmount}
                                                        onChange={setFinAmount}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="field">
                                                    <label>{C.finNote}</label>
                                                    <input value={finNote} onChange={(e) => setFinNote(e.target.value)} />
                                                </div>
                                                {finErr && <p className="form-err">{finErr}</p>}
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => void recordPayment()}
                                                    disabled={finSaving}
                                                >
                                                    <Wallet size={15} /> {finSaving ? C.saving : C.finDone}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
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
                            <NumberInput min={0} value={grantMb} onChange={(t) => setGrantMb(t === '' ? 0 : Number(t))} />
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

/** Status pill for a vendor/affiliate applicant: active(approved)=green, rejected=red, pending=amber. */
function applicantBadge(status: string, labels: { pending: string; approved: string; rejected: string }): ReactNode {
    if (status === 'active') return <span className="badge badge-ok">{labels.approved}</span>;
    if (status === 'rejected') return <span className="badge badge-bad">{labels.rejected}</span>;
    return <span className="badge badge-gold">{labels.pending}</span>;
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
    return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' });
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
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16,
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
