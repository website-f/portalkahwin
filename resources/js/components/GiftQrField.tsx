import { useRef, useState } from 'react';
import { Upload, X, Loader2, QrCode } from 'lucide-react';
import { mediaUrl } from '../lib/base';
import { api } from '../lib/api';
import { useLang, dict } from '../context/LangContext';

type Gift = { bankName?: string; accountName?: string; accountNo?: string; note?: string; qrUrl?: string } | undefined;

/**
 * DuitNow QR upload for the Salam Kaut tab. Some couples prefer to share a QR
 * their guests scan instead of typing a bank account. This uploads the image,
 * persists it onto the card straight away (like the media panel) and hands the
 * refreshed invitation back through `onSaved` so the live preview updates.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GiftQrField({ invitationId, gift, onSaved }: { invitationId: string; gift: Gift; onSaved: (inv: any) => void }) {
    const { lang } = useLang();
    const C = dict({
        bm: {
            label: 'Kod QR DuitNow',
            hint: 'Muat naik QR DuitNow anda supaya tetamu boleh imbas terus — pilihan selain nombor akaun.',
            upload: 'Muat naik QR',
        },
        en: {
            label: 'DuitNow QR code',
            hint: 'Upload your DuitNow QR so guests can scan it directly — an alternative to bank account details.',
            upload: 'Upload QR',
        },
        zh: {
            label: 'DuitNow 二维码',
            hint: '上传您的 DuitNow 二维码，宾客可直接扫码——银行账号之外的另一选择。',
            upload: '上传二维码',
        },
    }, lang);
    const [busy, setBusy] = useState(false);
    const ref = useRef<HTMLInputElement>(null);

    async function persist(next: Gift) {
        const r = await api.put(`/invitations/${invitationId}`, { gift: next });
        onSaved(r.data);
    }

    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const up = await api.post(`/invitations/${invitationId}/upload`, fd);
            await persist({ ...gift, qrUrl: up.data.url as string });
        } finally {
            setBusy(false);
            if (ref.current) ref.current.value = '';
        }
    }

    return (
        <div className="field" style={{ marginTop: 6 }}>
            <label>{C.label}</label>
            <p className="muted" style={{ margin: '0 0 8px', fontSize: 12.5 }}>{C.hint}</p>
            {gift?.qrUrl ? (
                <div style={{ position: 'relative', width: 132 }}>
                    <img src={mediaUrl(gift.qrUrl)} alt="DuitNow QR" style={{ width: 132, height: 132, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', padding: 6 }} />
                    <button className="btn btn-sm" aria-label="Remove QR" onClick={() => void persist({ ...gift, qrUrl: undefined })} style={remove}><X size={13} /></button>
                </div>
            ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => ref.current?.click()} disabled={busy}>
                    {busy ? <Loader2 size={15} className="spin" /> : <><QrCode size={15} /> <Upload size={13} /></>} {C.upload}
                </button>
            )}
            <input ref={ref} type="file" accept="image/*" hidden onChange={onPick} />
        </div>
    );
}

const remove: React.CSSProperties = {
    position: 'absolute', top: -8, right: -8, width: 24, height: 24, padding: 0, borderRadius: '50%',
    background: 'var(--bad)', color: '#fff', display: 'grid', placeItems: 'center',
};
