import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Send, Clock, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../context/LangContext';
import { useAuth, isStaff } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { getTemplate } from '../../templates/registry';
import { SAMPLE_INVITATION } from '../../templates/sampleData';
import { normalizeConfig, type CustomTemplateConfig } from '../../templates/customConfig';

type DesignStatus = 'draft' | 'pending' | 'approved' | 'rejected';

interface Design {
    id: string;
    key: string;
    name: string;
    category?: string | null;
    description?: string | null;
    status: DesignStatus;
    config?: Partial<CustomTemplateConfig> | null;
    updated_at?: string;
}

interface PublicSettings { allow_user_templates: boolean }

export function MyDesigns() {
    const { lang } = useLang();
    const { user } = useAuth();
    const dialog = useDialog();
    const nav = useNavigate();
    const isAdmin = isStaff(user);

    const C = ({
        bm: {
            title: 'Rekaan Saya', subtitle: 'Rekaan tersuai yang anda cipta — draf, hantaran dan yang telah diterbitkan.',
            newDesign: 'Reka Baharu', empty: 'Anda belum mereka sebarang rekaan lagi.', emptyCta: 'Mula mereka rekaan pertama anda.',
            edit: 'Sunting', publish: 'Terbitkan', submitReview: 'Hantar', delete: 'Padam',
            statuses: { draft: 'Draf', pending: 'Menunggu', approved: 'Diterbitkan', rejected: 'Ditolak' } as Record<DesignStatus, string>,
            confirmDelete: (n: string) => `Padam rekaan "${n}"? Tindakan ini tidak boleh dibatalkan.`,
            publishedTitle: 'Rekaan diterbitkan!', publishedBody: 'Rekaan anda kini tersedia untuk semua pengguna.',
            submittedTitle: 'Rekaan dihantar!', submittedBody: 'Rekaan anda kini menunggu semakan admin.',
            uncategorised: 'Tiada kategori',
        },
        en: {
            title: 'My Designs', subtitle: 'The custom designs you have created — drafts, submissions and published ones.',
            newDesign: 'New Design', empty: 'You haven’t created any designs yet.', emptyCta: 'Start building your first design.',
            edit: 'Edit', publish: 'Publish', submitReview: 'Submit', delete: 'Delete',
            statuses: { draft: 'Draft', pending: 'Pending', approved: 'Published', rejected: 'Rejected' } as Record<DesignStatus, string>,
            confirmDelete: (n: string) => `Delete design "${n}"? This cannot be undone.`,
            publishedTitle: 'Design published!', publishedBody: 'Your design is now available to everyone.',
            submittedTitle: 'Design submitted!', submittedBody: 'Your design is now awaiting admin review.',
            uncategorised: 'Uncategorised',
        },
    })[lang];

    const [rows, setRows] = useState<Design[]>([]);
    const [loading, setLoading] = useState(true);
    const [allow, setAllow] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    function load() {
        setLoading(true);
        api.get<Design[]>('/me/designs')
            .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
        api.get<PublicSettings>('/settings')
            .then((r) => setAllow(!!r.data?.allow_user_templates))
            .catch(() => setAllow(false));
    }, []);

    const canCreate = isAdmin || allow;

    async function submit(d: Design) {
        setBusyId(d.id);
        try {
            await api.post(`/me/designs/${d.id}/submit`);
            await dialog.alert({
                title: isAdmin ? C.publishedTitle : C.submittedTitle,
                message: isAdmin ? C.publishedBody : C.submittedBody,
            });
            load();
        } finally {
            setBusyId(null);
        }
    }

    async function remove(d: Design) {
        if (!(await dialog.confirm({ message: C.confirmDelete(d.name), danger: true }))) return;
        setBusyId(d.id);
        try {
            await api.delete(`/me/designs/${d.id}`);
            setRows((prev) => prev.filter((x) => x.id !== d.id));
        } finally {
            setBusyId(null);
        }
    }

    const statusBadge = (s: DesignStatus) => {
        const cls = s === 'approved' ? 'badge badge-ok'
            : s === 'rejected' ? 'badge badge-bad'
                : s === 'pending' ? 'badge badge-gold'
                    : 'badge';
        return (
            <span className={cls}>
                {s === 'pending' && <Clock size={11} style={{ marginRight: 3 }} />}
                {C.statuses[s]}
            </span>
        );
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div>
            <style>{MD_CSS}</style>
            <div className="page-head spread">
                <div>
                    <h1>{C.title}</h1>
                    <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
                </div>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => nav('/panel/designer')}>
                        <Plus size={16} /> {C.newDesign}
                    </button>
                )}
            </div>

            {rows.length === 0 ? (
                <div className="panel center" style={{ padding: '46px 24px' }}>
                    <p className="muted" style={{ margin: '0 0 16px', fontSize: 14 }}>{C.empty}</p>
                    {canCreate && (
                        <button className="btn btn-primary" onClick={() => nav('/panel/designer')}>
                            <Plus size={16} /> {C.newDesign}
                        </button>
                    )}
                </div>
            ) : (
                <div className="tpl-grid">
                    {rows.map((d) => {
                        const canSubmit = d.status === 'draft' || d.status === 'rejected';
                        const busy = busyId === d.id;
                        return (
                            <div className="tpl-card" key={d.id}>
                                <div className="tpl-thumb md-thumb">
                                    <MiniPreview config={normalizeConfig(d.config)} />
                                </div>
                                <div className="tpl-body">
                                    <div className="spread">
                                        <h3 style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</h3>
                                        {statusBadge(d.status)}
                                    </div>
                                    <p className="muted" style={{ fontSize: 13, margin: '4px 0 12px', textTransform: 'capitalize' }}>
                                        {d.category && d.category !== 'custom' ? d.category : C.uncategorised}
                                    </p>
                                    <div className="row" style={{ gap: 8 }}>
                                        <button className="btn btn-ghost btn-sm grow" onClick={() => nav(`/panel/designer/${d.id}`)}>
                                            <Pencil size={14} /> {C.edit}
                                        </button>
                                        {canSubmit && (
                                            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void submit(d)}>
                                                {busy ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {isAdmin ? C.publish : C.submitReview}
                                            </button>
                                        )}
                                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void remove(d)} style={{ color: 'var(--bad)' }} aria-label={C.delete}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/** Small, non-interactive scaled render of a design's config for the card thumb. */
function MiniPreview({ config }: { config: CustomTemplateConfig }) {
    const W = 380;
    const boxRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.28);

    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const measure = () => setScale(box.clientWidth / W);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(box);
        return () => ro.disconnect();
    }, []);

    const Tpl = getTemplate('custom');
    return (
        <div ref={boxRef} className="md-mini">
            <div style={{ width: W, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                <Tpl data={{ ...SAMPLE_INVITATION, templateConfig: config }} preview />
            </div>
        </div>
    );
}

const MD_CSS = `
.md-thumb { padding: 0; overflow: hidden; }
.md-mini { position: absolute; inset: 0; overflow: hidden; background: #fff; }
.md-spin { animation: md-spin .9s linear infinite; }
@keyframes md-spin { to { transform: rotate(360deg); } }
`;
