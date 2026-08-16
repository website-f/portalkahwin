import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { TemplateThumb } from './TemplateThumb';
import { useLang, dict } from '../context/LangContext';

/** Minimum a design needs for the "use it" create flow. */
export interface UseTemplateTarget {
    key: string;
    name: string;
    category: string;
    kind?: string | null;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
    base_key?: string | null;
}

/**
 * The one-step "Use this design" create modal, shared by the Templates gallery and
 * the Saved page. The design is already chosen (no re-pick) — the host just enters
 * the couple's names, then a card is created (consuming a credit for a paid design)
 * and the editor opens.
 */
export function UseTemplateModal({ template, onClose }: { template: UseTemplateTarget | null; onClose: () => void }) {
    const nav = useNavigate();
    const { lang } = useLang();
    const [groom, setGroom] = useState('');
    const [bride, setBride] = useState('');
    const [eventName, setEventName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset the form whenever a different design is opened.
    useEffect(() => { setGroom(''); setBride(''); setEventName(''); setError(null); }, [template?.key]);

    const C = dict({
        bm: { title: 'Cipta kad', groom: 'Nama pengantin lelaki', bride: 'Nama pengantin perempuan', groomPh: 'cth. Adam', bridePh: 'cth. Hawa', create: 'Cipta Kad', creating: 'Mencipta…', cancel: 'Batal', failed: 'Kad belum berjaya dicipta. Sila cuba lagi.', hint: 'Setiap kad untuk satu majlis. Masukkan nama pasangan untuk mula.', evName: 'Nama acara', evPh: 'cth. Malam Muzik Nusantara', evHint: 'Setiap kad untuk satu acara. Masukkan nama acara untuk mula.' },
        en: { title: 'Create a card', groom: "Groom's name", bride: "Bride's name", groomPh: 'e.g. Adam', bridePh: 'e.g. Hawa', create: 'Create card', creating: 'Creating…', cancel: 'Cancel', failed: 'Failed to create card. Please try again.', hint: "Each card is for one event. Enter the couple's names to start.", evName: 'Event name', evPh: 'e.g. Nusantara Music Night', evHint: 'Each card is for one event. Enter the event name to start.' },
        zh: { title: '创建请柬', groom: '男方姓名', bride: '女方姓名', groomPh: '例如 Adam', bridePh: '例如 Hawa', create: '创建请柬', creating: '创建中…', cancel: '取消', failed: '请柬创建失败，请重试。', hint: '每张请柬用于一个婚礼。输入新人姓名即可开始。', evName: '活动名称', evPh: '例如 群岛音乐之夜', evHint: '每张请柬用于一个活动。输入活动名称即可开始。' },
    }, lang);

    if (!template) return null;
    const tpl = template;
    const isEvent = tpl.kind === 'event';

    async function create() {
        setCreating(true);
        setError(null);
        try {
            const body = isEvent
                ? { template_key: tpl.key, event_name: eventName }
                : { template_key: tpl.key, groom_name: groom, bride_name: bride };
            const r = await api.post<{ id: string }>('/invitations', body);
            nav(`/panel/cards/${r.data.id}/edit`);
        } catch (err) {
            // A paid design with no credit can't be created directly — send them to buy it.
            const e = err as { response?: { status?: number; data?: { requires_upgrade?: boolean } } };
            if (e?.response?.status === 403 && e.response?.data?.requires_upgrade) { onClose(); nav('/panel/cart'); return; }
            setError(C.failed);
        } finally {
            setCreating(false);
        }
    }

    return (
        <div style={overlay} role="dialog" aria-modal="true" onClick={() => { if (!creating) onClose(); }}>
            <div className="panel" style={{ maxWidth: 400, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: 12 }}>{C.title}</h3>
                <div className="row" style={{ gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
                    <span className="gal-device" style={{ width: 78, flexShrink: 0 }}>
                        <span className="gal-notch" aria-hidden="true" />
                        <span className="gal-screen">
                            <TemplateThumb name={tpl.name} category={tpl.category} palette={tpl.palette} thumbnail={tpl.thumbnail} templateKey={tpl.key} baseKey={tpl.base_key} />
                        </span>
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{tpl.name}</div>
                        <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 0', lineHeight: 1.5 }}>{isEvent ? C.evHint : C.hint}</p>
                    </div>
                </div>
                {isEvent ? (
                    <div className="field"><label>{C.evName}</label><input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder={C.evPh} autoFocus /></div>
                ) : (
                    <>
                        <div className="field"><label>{C.groom}</label><input value={groom} onChange={(e) => setGroom(e.target.value)} placeholder={C.groomPh} autoFocus /></div>
                        <div className="field"><label>{C.bride}</label><input value={bride} onChange={(e) => setBride(e.target.value)} placeholder={C.bridePh} /></div>
                    </>
                )}
                {error && <p className="form-err">{error}</p>}
                <div className="row" style={{ gap: 10, marginTop: 8 }}>
                    <button type="button" className="btn btn-ghost grow" onClick={onClose} disabled={creating}>{C.cancel}</button>
                    <button type="button" className="btn btn-primary grow" onClick={create} disabled={creating || (isEvent ? !eventName.trim() : (!groom.trim() || !bride.trim()))}>
                        <Sparkles size={16} /> {creating ? C.creating : C.create}
                    </button>
                </div>
            </div>
        </div>
    );
}

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 250, display: 'grid', placeItems: 'center', padding: 16,
    background: 'rgba(24, 18, 33, 0.62)', backdropFilter: 'blur(4px)',
};
