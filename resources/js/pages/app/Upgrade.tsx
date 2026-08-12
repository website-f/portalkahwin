import { useState } from 'react';
import { Crown, Check, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';

export function Upgrade() {
    const { user } = useAuth();
    const { lang } = useLang();
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const premium = user?.plan === 'premium' || user?.role === 'admin';

    const C = dict({
        bm: {
            perks: [
                'Semua rekaan premium (Grand Reveal, Khat, Songket)',
                'Susunan meja dengan agihan tempat duduk automatik',
                'Daftar masuk QR pada hari majlis',
                'Salam Kasih tanpa had',
                'Tanpa tanda air PortalKahwin',
                'Sokongan diberi keutamaan',
            ],
            payFail: 'Pembayaran belum berjaya dimulakan.',
            title: 'Naik Taraf Premium',
            subtitle: 'Buka semua ciri untuk pengalaman jemputan yang lebih lengkap.',
            premium: 'Premium',
            perYear: ' / setahun',
            alreadyPremium: 'Akaun anda sudah Premium',
            preparing: 'Menyediakan pembayaran…',
            upgradeNow: 'Naik Taraf Sekarang',
            secure: 'Pembayaran selamat melalui ToyyibPay (FPX & e-Wallet)',
            freePlan: 'Pelan Percuma',
            onFreePlan: 'Anda kini menggunakan pelan percuma.',
            freeFeatures: [
                '✓ 1 rekaan percuma (Floral)',
                '✓ RSVP & buku doa',
                '✓ Kira detik & lokasi',
            ],
            lockedFeatures: [
                '✕ Rekaan premium',
                '✕ Susunan meja',
            ],
        },
        en: {
            perks: [
                'All premium templates (Grand Reveal, Khat, Songket)',
                'Seating plan + auto-assigned seats',
                'QR check-in on the event day',
                'Unlimited cash gifts',
                'No PortalKahwin watermark',
                'Priority support',
            ],
            payFail: 'Failed to start payment.',
            title: 'Upgrade to Premium',
            subtitle: 'Unlock every feature for a perfect celebration',
            premium: 'Premium',
            perYear: ' / year',
            alreadyPremium: "You're already Premium",
            preparing: 'Preparing payment…',
            upgradeNow: 'Upgrade now',
            secure: 'Secure payment via ToyyibPay (FPX & e-Wallet)',
            freePlan: 'Free plan',
            onFreePlan: "You're currently on the free plan.",
            freeFeatures: [
                '✓ 1 free template (Floral)',
                '✓ RSVP & wishes',
                '✓ Countdown & location',
            ],
            lockedFeatures: [
                '✕ Premium templates',
                '✕ Seating plan',
            ],
        },
        zh: {
            perks: [
                '全部付费设计（Grand Reveal、Khat、Songket）',
                '座位表与自动排位',
                '婚礼当天二维码签到',
                '礼金功能不限次数',
                '不显示 PortalKahwin 水印',
                '优先客户支持',
            ],
            payFail: '无法启动付款流程。',
            title: '升级为付费方案',
            subtitle: '解锁全部功能，让婚礼更完美',
            premium: '付费方案',
            perYear: ' / 年',
            alreadyPremium: '您已是付费用户',
            preparing: '正在准备付款…',
            upgradeNow: '立即升级',
            secure: '通过 ToyyibPay 安全付款（FPX 与电子钱包）',
            freePlan: '免费方案',
            onFreePlan: '您目前使用的是免费方案。',
            freeFeatures: [
                '✓ 1 款免费设计（Floral）',
                '✓ 出席回复与祝福留言',
                '✓ 倒计时与地点',
            ],
            lockedFeatures: [
                '✕ 付费设计',
                '✕ 座位安排',
            ],
        },
    }, lang);

    async function upgrade() {
        setBusy(true);
        setMsg(null);
        try {
            const r = await api.post('/billing/subscribe');
            if (r.data.url) window.location.href = r.data.url; // → ToyyibPay
        } catch (e: any) { // axios error shape is loosely typed
            setMsg(e?.response?.data?.message ?? C.payFail);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <div className="page-head"><h1>{C.title}</h1><p className="muted" style={{ margin: 0 }}>{C.subtitle}</p></div>

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', maxWidth: 780 }}>
                <div className="panel" style={{ borderColor: 'var(--gold)', boxShadow: 'var(--shadow)' }}>
                    <div className="row"><Crown size={22} color="var(--gold)" /><span className="badge badge-gold">{C.premium}</span></div>
                    <h2 style={{ fontSize: 40, margin: '14px 0 0' }}>RM59<span style={{ fontSize: 15, color: 'var(--muted)' }}>{C.perYear}</span></h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0' }}>
                        {C.perks.map((p) => (
                            <li key={p} className="row" style={{ marginBottom: 10, fontSize: 14 }}>
                                <Check size={16} color="var(--ok)" /> {p}
                            </li>
                        ))}
                    </ul>
                    {premium ? (
                        <div className="badge badge-ok" style={{ padding: '10px 14px' }}><Check size={15} /> {C.alreadyPremium}</div>
                    ) : (
                        <button className="btn btn-gold btn-block" disabled={busy} onClick={upgrade}>
                            <Sparkles size={16} /> {busy ? C.preparing : C.upgradeNow}
                        </button>
                    )}
                    {msg && <p className="form-err" style={{ marginTop: 12 }}>{msg}</p>}
                    <p className="muted center" style={{ fontSize: 12, marginTop: 12 }}>{C.secure}</p>
                </div>

                <div className="panel">
                    <h3>{C.freePlan}</h3>
                    <p className="muted" style={{ fontSize: 14 }}>{C.onFreePlan}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0', color: 'var(--muted)', fontSize: 14, lineHeight: 2 }}>
                        {C.freeFeatures.map((f) => <li key={f}>{f}</li>)}
                        {C.lockedFeatures.map((f) => <li key={f} style={{ opacity: 0.5 }}>{f}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
}
