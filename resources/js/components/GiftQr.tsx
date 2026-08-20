import { mediaUrl } from '../lib/base';
import { useLang, dict } from '../context/LangContext';

/**
 * A DuitNow / e-wallet QR block for the Salam Kaut (cash-gift) section. The
 * couple uploads their QR once and every template renders it the same way: a
 * white plate (a QR must sit on white to stay scannable, even on dark cards)
 * with a short, language-aware caption. Colours come from the host template so
 * the caption matches the card; the plate itself is always white by design.
 */
export function GiftQr({ url, color }: { url: string; color?: string }) {
    const { lang } = useLang();
    const C = dict({
        bm: { scan: 'Imbas untuk salam kaut' },
        en: { scan: 'Scan to send your gift' },
        zh: { scan: '扫码送上您的心意' },
    }, lang);
    const src = mediaUrl(url) ?? url;
    return (
        <div style={{ display: 'grid', placeItems: 'center', gap: 9, marginTop: 16 }}>
            <div style={{ background: '#fff', padding: 10, borderRadius: 16, boxShadow: '0 10px 26px -14px rgba(0,0,0,0.4)' }}>
                <img src={src} alt="DuitNow QR" style={{ width: 168, height: 168, objectFit: 'contain', display: 'block' }} />
            </div>
            <div style={{ fontSize: 12.5, letterSpacing: '0.04em', color: color ?? 'inherit', opacity: 0.85 }}>{C.scan}</div>
        </div>
    );
}
