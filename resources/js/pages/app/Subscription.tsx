import { useEffect, useState } from 'react';
import { Crown, Check, Lock, Sparkles, CalendarClock, LayoutGrid, Send, Users, Infinity as InfinityIcon, MessageCircle, Mail, Headset } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, dict } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { RoleUpgradeRequest } from '../../components/RoleUpgradeRequest';
import { waLink } from '../../lib/whatsapp';

interface Pkg { id: string; name: string; role_target: string; kind?: 'plan' | 'addon'; price_myr: string | number; interval: string; features: string[] | null; feature_keys?: string[] | null; }
interface Feature { key: string; label: string; enabled: boolean; purchasable?: boolean; }
interface Sub {
    plan: 'free' | 'premium';
    plan_expires_at: string | null;
    premium_price_myr: number;
    usage: { cards: number; published: number; rsvps: number };
    limits: { cards: number; guests: number }; // 0 = unlimited
    features: Feature[];
}

function fmtDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function Subscription() {
    const [sub, setSub] = useState<Sub | null>(null);
    const [packages, setPackages] = useState<Pkg[]>([]);
    const [support, setSupport] = useState<{ phone?: string; email?: string; whatsapp?: string }>({});
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState<string | null>(null);
    // The package awaiting checkout confirmation (order-summary modal before HitPay).
    const [confirmPkg, setConfirmPkg] = useState<Pkg | null>(null);
    const [payErr, setPayErr] = useState<string | null>(null);
    const { user, refresh } = useAuth();
    const { lang } = useLang();
    const payFallbackMsg = dict({
        bm: 'Pembayaran belum berjaya dimulakan. Sila cuba lagi atau hubungi kami.',
        en: 'Could not start the payment. Please try again or contact us.',
        zh: '无法开始付款。请重试或联系我们。',
    }, lang);

    // Buy a plan or add-on: free grants instantly (refresh session), paid hops to HitPay.
    // Only ever called AFTER the user confirms the order summary.
    async function buyPackage(p: Pkg) {
        setBuying(p.id); setPayErr(null);
        try {
            const r = await api.post<{ granted?: boolean; url?: string }>(`/me/packages/${p.id}/checkout`);
            if (r.data?.url) { window.location.href = r.data.url; return; } // → HitPay
            if (r.data?.granted) { await refresh(); setConfirmPkg(null); return; }
            // No url and not granted — surface it rather than failing silently.
            setPayErr(payFallbackMsg);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setPayErr(msg ?? payFallbackMsg);
        } finally { setBuying(null); }
    }

    const C = dict({
        bm: {
            loadFail: 'Maklumat langganan belum berjaya dimuatkan.',
            title: 'Langganan Saya',
            subtitle: 'Semak pelan, penggunaan dan ciri yang tersedia untuk akaun anda.',
            premium: 'Premium',
            free: 'Percuma',
            active: 'Aktif',
            basicPlan: 'Pelan asas',
            premiumBlurb: 'Semua ciri PortalKahwin kini terbuka untuk anda.',
            freeBlurb: 'Naik taraf untuk membuka rekaan premium, susunan meja dan ciri majlis yang lebih lengkap.',
            validUntil: 'Sah sehingga',
            upgrade: 'Naik Taraf',
            upgradeToPremium: 'Naik Taraf ke Premium',
            usage: 'Penggunaan',
            usageSub: 'Ringkasan aktiviti terkini akaun anda',
            cardsCreated: 'Kad dicipta',
            limitReached: 'Had pelan percuma telah dicapai.',
            published: 'Terbit',
            totalRsvp: 'Jumlah RSVP',
            guestLimit: 'Had tetamu / kad',
            planFeatures: 'Ciri Pelan',
            planFeaturesSub: 'Ciri yang aktif untuk akaun anda sekarang, dan yang boleh dibuka.',
            included: 'Aktif',
            lockedAddon: 'Ada dalam tambahan',
            lockedNo: 'Tidak tersedia',
            unlockAll: 'Buka Semua Ciri',
            plans: 'Pelan Langganan',
            plansSub: 'Pilih pelan yang sesuai untuk perniagaan anda. Hubungi kami untuk melanggan atau bayaran bank-in.',
            month: 'sebulan', year: 'setahun', once: 'sekali',
            contactSub: 'Hubungi untuk Langgan',
            currentPlan: 'Pelan semasa anda',
            changeTitle: 'Tukar atau Perbaharui Pelan',
            changeSub: 'Untuk menaik taraf, menukar atau memperbaharui pelan anda, hubungi pasukan kami:',
            callUs: 'Hubungi via WhatsApp', emailUs: 'E-mel',
            waPlanMsg: 'Salam, saya ingin menaik taraf / menukar / memperbaharui pelan PortalKahwin saya.',
            noPackages: 'Tiada pelan atau tambahan untuk dilanggan buat masa ini. Hubungi kami untuk pilihan naik taraf.',
            featureLabels: {
                seating: 'Susunan meja + agihan automatik',
                checkin: 'Daftar masuk QR',
                qr_passes: 'Pas QR tetamu',
                company_branding: 'Penjenamaan syarikat (logo & profil)',
                designer: 'Reka bentuk kad sendiri',
            },
        },
        en: {
            loadFail: 'Unable to load subscription.',
            title: 'My Subscription',
            subtitle: 'Review your plan, usage and features',
            premium: 'Premium',
            free: 'Free',
            active: 'Active',
            basicPlan: 'Basic plan',
            premiumBlurb: "You're enjoying all PortalKahwin features.",
            freeBlurb: 'Upgrade to unlock premium templates, seating and more.',
            validUntil: 'Valid until',
            upgrade: 'Upgrade',
            upgradeToPremium: 'Upgrade to Premium',
            usage: 'Usage',
            usageSub: 'A summary of your account activity',
            cardsCreated: 'Cards created',
            limitReached: "You've reached the free-plan limit.",
            published: 'Published',
            totalRsvp: 'Total RSVP',
            guestLimit: 'Guest limit / card',
            planFeatures: 'Plan features',
            planFeaturesSub: "What's active on your account now, and what you can unlock",
            included: 'Active',
            lockedAddon: 'Available as add-on',
            lockedNo: 'Not available',
            unlockAll: 'Unlock all features',
            plans: 'Subscription Plans',
            plansSub: 'Pick the plan that fits your business. Contact us to subscribe or pay via bank-in.',
            month: 'per month', year: 'per year', once: 'one-time',
            contactSub: 'Contact to Subscribe',
            currentPlan: 'Your current plan',
            changeTitle: 'Change or renew your plan',
            changeSub: 'To upgrade, change or renew your plan, contact our team:',
            callUs: 'Chat on WhatsApp', emailUs: 'Email',
            waPlanMsg: 'Hi, I would like to upgrade / change / renew my PortalKahwin plan.',
            noPackages: 'There are no plans or add-ons to subscribe to right now. Contact us for upgrade options.',
            featureLabels: {
                seating: 'Seating plan + auto-assign',
                checkin: 'QR check-in',
                qr_passes: 'Guest QR passes',
                company_branding: 'Company branding (logo & profile)',
                designer: 'Design your own card',
            },
        },
        zh: {
            loadFail: '无法加载订阅信息。',
            title: '我的订阅',
            subtitle: '查看您的方案、用量与功能权限',
            premium: '付费方案',
            free: '免费方案',
            active: '生效中',
            basicPlan: '基础方案',
            premiumBlurb: '您正在使用 PortalKahwin 的全部功能。',
            freeBlurb: '升级即可解锁付费设计、座位安排等更多功能。',
            validUntil: '有效期至',
            upgrade: '升级',
            upgradeToPremium: '升级为付费方案',
            usage: '使用情况',
            usageSub: '您的账户活动概览',
            cardsCreated: '已创建请柬',
            limitReached: '您已达到免费方案的上限。',
            published: '已发布',
            totalRsvp: '出席回复总数',
            guestLimit: '每张请柬宾客上限',
            planFeatures: '方案功能',
            planFeaturesSub: '您账户当前已启用的功能，以及可解锁的功能',
            included: '已启用',
            lockedAddon: '可通过附加功能获得',
            lockedNo: '暂不提供',
            unlockAll: '解锁全部功能',
            plans: '订阅方案',
            plansSub: '选择适合您业务的方案。欢迎联系我们订阅，或以银行转账付款。',
            month: '每月', year: '每年', once: '一次性',
            contactSub: '联系我们订阅',
            currentPlan: '您当前的套餐',
            changeTitle: '更改或续订套餐',
            changeSub: '如需升级、更改或续订套餐，请联系我们的团队：',
            callUs: '通过 WhatsApp 联系', emailUs: '邮件',
            waPlanMsg: '您好，我想升级/更改/续订我的 PortalKahwin 套餐。',
            noPackages: '目前暂无可订阅的方案或附加功能。如需升级，请联系我们。',
            featureLabels: {
                seating: '座位表与自动排位',
                checkin: '二维码签到',
                qr_passes: '宾客二维码入场证',
                company_branding: '企业品牌（标志与资料）',
                designer: '自行设计请柬',
            },
        },
    }, lang);
    const featureLabels = C.featureLabels as Record<string, string>;

    useEffect(() => {
        Promise.all([api.get<Sub>('/me/subscription'), api.get<Pkg[]>('/packages')])
            .then(([s, p]) => { setSub(s.data); setPackages(p.data); })
            .finally(() => setLoading(false));
        // Support contact for plan changes (editable by superadmin in receipt settings).
        api.get<{ receipt_phone?: string; receipt_email?: string; support_email?: string; support_whatsapp?: string }>('/settings')
            .then((r) => setSupport({ phone: r.data?.receipt_phone, email: r.data?.receipt_email || r.data?.support_email, whatsapp: r.data?.support_whatsapp }))
            .catch(() => { /* contact card just hides its buttons */ });
    }, []);

    const myPackages = packages.filter((p) => p.role_target === 'any' || p.role_target === user?.role);
    const planPkgs = myPackages.filter((p) => (p.kind ?? 'plan') !== 'addon');
    const addonPkgs = myPackages.filter((p) => p.kind === 'addon');
    const entitlements = user?.entitlements ?? [];
    // A package is currently owned if the user holds an ACTIVE entitlement for it
    // (accessPayload only returns active, unexpired grants — an expired one drops
    // out, which is exactly when the buy button should re-enable). A grant with no
    // expiry (a one-off add-on / interval 'once') is owned permanently.
    const entByPkg = new Map(entitlements.filter((e) => e.package_id).map((e) => [e.package_id as string, e]));

    // Trilingual labels for the new package/add-on/entitlement UI (kept inline so the
    // big C dict above doesn't need touching).
    const L = dict({
        bm: { addons: 'Tambahan (Add-on)', addonsSub: 'Hidupkan ciri tambahan bila-bila masa. Setiap tambahan tamat mengikut tempoh dan boleh diperbaharui.', buy: 'Langgan', add: 'Tambah', added: 'Sudah aktif', renew: 'Perbaharui', owned: 'Dimiliki', subscribed: 'Sudah dilanggan', activeUntil: 'Aktif sehingga', activeTitle: 'Langganan Aktif', expires: 'Tamat', expired: 'Tamat tempoh', free: 'Percuma', perMonth: 'sebulan', perYear: 'setahun', oneOff: 'sekali', renewPrompt: 'Tambahan ini telah tamat tempoh. Perbaharui untuk terus menggunakannya, atau pilih pakej lain.',
            coTitle: 'Sahkan Pesanan', coSummary: 'Ringkasan pesanan', coItem: 'Pakej', coInterval: 'Kitaran', coTotal: 'Jumlah', coPayNow: 'Bayar Sekarang', coGrant: 'Aktifkan Percuma', coCancel: 'Batal', coPayHint: 'Anda akan diarahkan ke halaman pembayaran selamat (HitPay). Langganan hanya aktif selepas pembayaran berjaya.', coFreeHint: 'Pakej ini percuma — ia akan diaktifkan serta-merta.' },
        en: { addons: 'Add-ons', addonsSub: 'Switch on extra capabilities anytime. Each add-on expires per its interval and can be renewed.', buy: 'Subscribe', add: 'Add', added: 'Active', renew: 'Renew', owned: 'Owned', subscribed: 'Subscribed', activeUntil: 'Active until', activeTitle: 'Active subscriptions', expires: 'Expires', expired: 'Expired', free: 'Free', perMonth: 'per month', perYear: 'per year', oneOff: 'one-off', renewPrompt: 'This add-on has expired. Renew to keep using it, or pick another package.',
            coTitle: 'Confirm your order', coSummary: 'Order summary', coItem: 'Package', coInterval: 'Billing', coTotal: 'Total', coPayNow: 'Pay Now', coGrant: 'Activate for Free', coCancel: 'Cancel', coPayHint: "You'll be taken to a secure payment page (HitPay). Your subscription is only active once payment succeeds.", coFreeHint: 'This package is free — it will be activated instantly.' },
        zh: { addons: '附加功能', addonsSub: '随时开启额外功能。每项附加功能按周期到期，可续订。', buy: '订阅', add: '添加', added: '已启用', renew: '续订', owned: '已拥有', subscribed: '已订阅', activeUntil: '有效至', activeTitle: '有效订阅', expires: '到期', expired: '已过期', free: '免费', perMonth: '每月', perYear: '每年', oneOff: '一次性', renewPrompt: '该附加功能已过期。续订以继续使用，或选择其他套餐。',
            coTitle: '确认订单', coSummary: '订单摘要', coItem: '套餐', coInterval: '计费', coTotal: '合计', coPayNow: '立即支付', coGrant: '免费启用', coCancel: '取消', coPayHint: '您将被引导至安全支付页面（HitPay）。订阅仅在支付成功后生效。', coFreeHint: '此套餐免费 — 将立即启用。' },
    }, lang);
    const priceLabel = (p: Pkg) => Number(p.price_myr) <= 0
        ? L.free
        : `RM${Number(p.price_myr)} / ${p.interval === 'monthly' ? L.perMonth : p.interval === 'yearly' ? L.perYear : L.oneOff}`;

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!sub) return <div className="panel">{C.loadFail}</div>;

    const premium = sub.plan === 'premium';
    // Show whatever active packages target this role (role_target 'any' or the user's role).
    // No role is hardcoded — an admin decides who has a plan by how they target the package.
    // Plans and add-ons render INDEPENDENTLY: an admin may publish only add-ons (no plan),
    // and those must still appear. (Previously add-ons were hidden whenever no plan existed.)
    const showPlans = planPkgs.length > 0;
    const showAddons = addonPkgs.length > 0;
    const cardLimit = sub.limits.cards; // 0 = unlimited
    const unlimitedCards = cardLimit === 0;
    const pct = unlimitedCards ? 100 : Math.min(100, Math.round((sub.usage.cards / Math.max(1, cardLimit)) * 100));
    const expiry = fmtDate(sub.plan_expires_at);

    return (
        <div>
            <div className="page-head" style={{ maxWidth: 820, margin: '0 auto 24px' }}>
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <div style={{ maxWidth: 820, margin: '0 auto' }}>
                {/* Normal users request a Vendor/Affiliate upgrade here (superadmin reviews). */}
                <RoleUpgradeRequest />
            </div>

            <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 18 }}>
                {/* Plan header */}
                <div className="panel" style={premium ? planPremium : planFree}>
                    <div className="spread" style={{ alignItems: 'flex-start' }}>
                        <div>
                            <div className="muted" style={{ fontSize: 11.5, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>{C.currentPlan}</div>
                            <div className="row" style={{ gap: 10 }}>
                                {premium
                                    ? <Crown size={26} color="var(--gold)" />
                                    : <Sparkles size={24} color="var(--plum)" />}
                                <h2 style={{ margin: 0, fontSize: 30 }}>{premium ? C.premium : C.free}</h2>
                                {premium
                                    ? <span className="badge badge-gold">{C.active}</span>
                                    : <span className="badge">{C.basicPlan}</span>}
                            </div>
                            <p className="muted" style={{ margin: '10px 0 0', fontSize: 14 }}>
                                {premium
                                    ? C.premiumBlurb
                                    : C.freeBlurb}
                            </p>
                            {premium && expiry && (
                                <p className="row" style={{ gap: 7, margin: '12px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                                    <CalendarClock size={15} /> {C.validUntil} {expiry}
                                </p>
                            )}
                            {/* No hardcoded "Upgrade to Premium" CTA: there's no fixed premium plan
                                for a normal user. The real upgrade path is whatever plans/add-ons
                                the admin has published below (or contacting the team). */}
                            {!premium && !showPlans && !showAddons && (
                                <p className="muted" style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55 }}>{C.noPackages}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Change / renew — plan changes are handled by the team (no self-serve billing). */}
                {(support.phone || support.email) && (
                    <div className="panel">
                        <div className="row" style={{ gap: 10, marginBottom: 4 }}>
                            <Headset size={18} color="var(--plum)" />
                            <h3 style={{ margin: 0 }}>{C.changeTitle}</h3>
                        </div>
                        <p className="muted" style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.55 }}>{C.changeSub}</p>
                        <div className="row wrap" style={{ gap: 10 }}>
                            {(support.whatsapp || support.phone) && (
                                <a href={waLink(support.whatsapp || support.phone, C.waPlanMsg)} target="_blank" rel="noreferrer" className="btn btn-primary">
                                    <MessageCircle size={16} /> {C.callUs}
                                </a>
                            )}
                            {support.email && (
                                <a href={`mailto:${support.email}?subject=${encodeURIComponent('Tukar pelan PortalKahwin')}`} className="btn btn-ghost">
                                    <Mail size={16} /> {C.emailUs}: {support.email}
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Active plan + add-on entitlements (with expiry + renew prompt). */}
                {entitlements.length > 0 && (
                    <div className="panel">
                        <h3 style={{ margin: '0 0 12px' }}>{L.activeTitle}</h3>
                        <div style={{ display: 'grid', gap: 10 }}>
                            {entitlements.map((e) => {
                                const exp = fmtDate(e.expires_at);
                                return (
                                    <div key={e.id} className="spread" style={{ background: 'var(--cream)', borderRadius: 12, padding: '12px 14px', gap: 10, flexWrap: 'wrap' }}>
                                        <div className="row" style={{ gap: 10 }}>
                                            {e.kind === 'plan' ? <Crown size={18} color="var(--gold)" /> : <Sparkles size={18} color="var(--plum)" />}
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{e.name}</div>
                                                {exp && <div className="muted" style={{ fontSize: 12.5 }}><CalendarClock size={13} style={{ verticalAlign: 'middle' }} /> {L.expires} {exp}</div>}
                                            </div>
                                        </div>
                                        <span className="badge badge-ok">{L.added}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Subscription plans targeting this role */}
                {showPlans && (
                    <div className="panel">
                        <h3 style={{ margin: '0 0 4px' }}>{C.plans}</h3>
                        <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>{C.plansSub}</p>
                        <div className="tpl-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                            {planPkgs.map((p) => {
                                const ent = entByPkg.get(p.id);
                                // A plan is "owned" if there's a matching entitlement OR the account
                                // is already Premium (e.g. a vendor granted premium on approval, with
                                // no entitlement row) — either way, don't let them subscribe again.
                                const owned = !!ent || premium;
                                const oneOff = (p.interval ?? 'once') === 'once' || (!!ent && !ent.expires_at);
                                const until = fmtDate(ent?.expires_at ?? sub.plan_expires_at ?? null);
                                return (
                                <div key={p.id} className="card" style={{ padding: 18 }}>
                                    <div className="spread">
                                        <h4 style={{ margin: 0, fontSize: 18 }}>{p.name}</h4>
                                        {owned
                                            ? <span className="badge badge-ok">{oneOff ? L.owned : L.added}</span>
                                            : <span className="badge badge-gold" style={{ textTransform: 'capitalize' }}>{p.role_target}</span>}
                                    </div>
                                    <div style={{ margin: '10px 0 4px' }}>
                                        <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--plum)' }}>{priceLabel(p)}</span>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 14px' }}>
                                        {(p.features ?? []).map((f, i) => (
                                            <li key={i} className="row" style={{ gap: 8, fontSize: 13, marginBottom: 6 }}>
                                                <Check size={14} color="var(--ok)" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                    {owned && !oneOff && until && (
                                        <p className="row muted" style={{ gap: 6, margin: '0 0 10px', fontSize: 12.5 }}>
                                            <CalendarClock size={14} /> {L.activeUntil} {until}
                                        </p>
                                    )}
                                    <button type="button" className="btn btn-primary btn-block btn-sm" disabled={buying === p.id || owned} onClick={() => setConfirmPkg(p)}>
                                        {buying === p.id ? '…' : owned ? <><Check size={15} /> {oneOff ? L.owned : L.subscribed}</> : <><Sparkles size={15} /> {L.buy}</>}
                                    </button>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Add-ons targeting this role — an independent panel so they show even
                    when no subscription PLAN has been published for this role. */}
                {showAddons && (
                    <div className="panel">
                        <h3 style={{ margin: '0 0 4px' }}>{L.addons}</h3>
                        <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>{L.addonsSub}</p>
                        <div className="tpl-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                            {addonPkgs.map((p) => {
                                const ent = entByPkg.get(p.id);
                                const owned = !!ent;                       // active + unexpired
                                const oneOff = (p.interval ?? 'once') === 'once' || (!!ent && !ent.expires_at);
                                const until = fmtDate(ent?.expires_at ?? null);
                                return (
                                    <div key={p.id} className="card" style={{ padding: 18 }}>
                                        <div className="spread">
                                            <h4 style={{ margin: 0, fontSize: 17 }}>{p.name}</h4>
                                            {owned && <span className="badge badge-ok">{oneOff ? L.owned : L.added}</span>}
                                        </div>
                                        <div style={{ margin: '10px 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--plum)' }}>{priceLabel(p)}</div>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 14px' }}>
                                            {(p.features ?? []).map((f, i) => (
                                                <li key={i} className="row" style={{ gap: 8, fontSize: 13, marginBottom: 6 }}><Check size={14} color="var(--ok)" /> {f}</li>
                                            ))}
                                        </ul>
                                        {owned && !oneOff && until && (
                                            <p className="row muted" style={{ gap: 6, margin: '0 0 10px', fontSize: 12.5 }}>
                                                <CalendarClock size={14} /> {L.activeUntil} {until}
                                            </p>
                                        )}
                                        <button type="button" className="btn btn-ghost btn-block btn-sm" disabled={buying === p.id || owned} onClick={() => setConfirmPkg(p)}>
                                            {buying === p.id ? '…' : owned ? <><Check size={14} /> {oneOff ? L.owned : L.subscribed}</> : <>+ {L.add}</>}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Usage */}
                <div className="panel">
                    <h3 style={{ margin: '0 0 4px' }}>{C.usage}</h3>
                    <p className="muted" style={{ margin: '0 0 18px', fontSize: 13 }}>{C.usageSub}</p>

                    <div className="row spread" style={{ marginBottom: 8 }}>
                        <span className="row" style={{ gap: 7, fontSize: 14, fontWeight: 600 }}><LayoutGrid size={16} color="var(--plum)" /> {C.cardsCreated}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--plum)' }}>
                            {sub.usage.cards} / {unlimitedCards ? <InfinityIcon size={15} style={{ verticalAlign: -2 }} /> : cardLimit}
                        </span>
                    </div>
                    <div style={barTrack}>
                        <div style={{ ...barFill, width: `${pct}%`, background: unlimitedCards ? 'linear-gradient(90deg, var(--gold), #b98a2f)' : 'var(--plum)' }} />
                    </div>
                    {!unlimitedCards && sub.usage.cards >= cardLimit && (
                        <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>{C.limitReached}</p>
                    )}

                    <div className="stat-grid" style={{ marginTop: 20 }}>
                        <div className="stat">
                            <div className="row" style={{ gap: 8 }}><Send size={16} color="var(--gold)" /><span className="l">{C.published}</span></div>
                            <div className="n">{sub.usage.published}</div>
                        </div>
                        <div className="stat">
                            <div className="row" style={{ gap: 8 }}><Users size={16} color="var(--gold)" /><span className="l">{C.totalRsvp}</span></div>
                            <div className="n">{sub.usage.rsvps}</div>
                        </div>
                        <div className="stat">
                            <div className="row" style={{ gap: 8 }}><Users size={16} color="var(--gold)" /><span className="l">{C.guestLimit}</span></div>
                            <div className="n">{sub.limits.guests === 0 ? '∞' : sub.limits.guests}</div>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="panel">
                    <h3 style={{ margin: '0 0 4px' }}>{C.planFeatures}</h3>
                    <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>{C.planFeaturesSub}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {sub.features.map((f) => (
                            <li key={f.key} className="row" style={{ gap: 12, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
                                <span style={f.enabled ? iconOk : iconOff}>
                                    {f.enabled ? <Check size={15} /> : <Lock size={14} />}
                                </span>
                                <span style={{ fontSize: 14, color: f.enabled ? 'var(--ink)' : 'var(--muted)' }}>
                                    {featureLabels[f.key] ?? f.label}
                                </span>
                                <span style={{ marginLeft: 'auto' }}>
                                    {f.enabled
                                        ? <span className="badge badge-ok">{C.included}</span>
                                        : f.purchasable
                                            ? <span className="badge badge-gold">{C.lockedAddon}</span>
                                            : <span className="badge">{C.lockedNo}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Checkout confirmation — order summary BEFORE any HitPay redirect. */}
            {confirmPkg && (() => {
                const p = confirmPkg;
                const isFree = Number(p.price_myr) <= 0;
                return (
                    <div style={coOverlay} role="dialog" aria-modal="true" onClick={() => { if (!buying) setConfirmPkg(null); }}>
                        <div className="panel" style={{ maxWidth: 420, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ margin: '0 0 14px' }}>{L.coTitle}</h3>
                            <div style={{ background: 'var(--cream)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                                <div className="muted" style={{ fontSize: 11.5, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>{L.coSummary}</div>
                                <div className="spread" style={{ marginBottom: 6 }}><span className="muted">{L.coItem}</span><strong>{p.name}</strong></div>
                                <div className="spread" style={{ marginBottom: 6 }}><span className="muted">{L.coInterval}</span><span style={{ textTransform: 'capitalize' }}>{p.interval === 'monthly' ? L.perMonth : p.interval === 'yearly' ? L.perYear : L.oneOff}</span></div>
                                <div className="spread" style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 8 }}>
                                    <strong>{L.coTotal}</strong>
                                    <strong style={{ fontSize: 18, color: 'var(--plum)' }}>{isFree ? L.free : `RM${Number(p.price_myr).toFixed(2)}`}</strong>
                                </div>
                            </div>
                            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '0 0 16px' }}>{isFree ? L.coFreeHint : L.coPayHint}</p>
                            {payErr && <p style={{ color: 'var(--bad)', fontSize: 13, margin: '0 0 12px' }}>{payErr}</p>}
                            <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setConfirmPkg(null)} disabled={buying === p.id}>{L.coCancel}</button>
                                <button type="button" className="btn btn-primary" onClick={() => void buyPackage(p)} disabled={buying === p.id}>
                                    {buying === p.id ? '…' : (isFree ? L.coGrant : <><Sparkles size={15} /> {L.coPayNow}</>)}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

const coOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 250, display: 'grid', placeItems: 'center', padding: 16,
    background: 'rgba(24, 18, 33, 0.62)', backdropFilter: 'blur(4px)',
};

const planFree: React.CSSProperties = { borderColor: 'var(--line)' };
const planPremium: React.CSSProperties = {
    borderColor: 'var(--gold)', boxShadow: 'var(--shadow)',
    background: 'linear-gradient(180deg, #fffaf0, #fff)',
};
const barTrack: React.CSSProperties = {
    height: 10, borderRadius: 999, background: 'var(--cream)', overflow: 'hidden',
};
const barFill: React.CSSProperties = {
    height: '100%', borderRadius: 999, transition: 'width 0.4s ease',
};
const iconOk: React.CSSProperties = {
    width: 26, height: 26, borderRadius: '50%', background: '#e4f3ec', color: 'var(--ok)',
    display: 'grid', placeItems: 'center', flexShrink: 0,
};
const iconOff: React.CSSProperties = {
    width: 26, height: 26, borderRadius: '50%', background: '#f3ece4', color: 'var(--muted)',
    display: 'grid', placeItems: 'center', flexShrink: 0,
};
