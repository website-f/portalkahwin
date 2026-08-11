import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, Lock, Sparkles, CalendarClock, LayoutGrid, Send, Users, Infinity as InfinityIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../context/LangContext';

interface Feature { key: string; label: string; enabled: boolean; }
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
    const [loading, setLoading] = useState(true);

    const { lang } = useLang();
    const C = ({
        bm: {
            loadFail: 'Tidak dapat memuatkan langganan.',
            title: 'Langganan Saya',
            subtitle: 'Semak pelan, penggunaan dan ciri anda',
            premium: 'Premium',
            free: 'Percuma',
            active: 'Aktif',
            basicPlan: 'Pelan Asas',
            premiumBlurb: 'Anda menikmati semua ciri PortalKahwin.',
            freeBlurb: 'Naik taraf untuk membuka templat premium, susunan meja dan banyak lagi.',
            validUntil: 'Sah sehingga',
            upgrade: 'Naik Taraf',
            upgradeToPremium: 'Naik Taraf ke Premium',
            usage: 'Penggunaan',
            usageSub: 'Ringkasan aktiviti akaun anda',
            cardsCreated: 'Kad dicipta',
            limitReached: 'Anda telah mencapai had pelan percuma.',
            published: 'Diterbitkan',
            totalRsvp: 'Jumlah RSVP',
            guestLimit: 'Had tetamu / kad',
            planFeatures: 'Ciri Pelan',
            planFeaturesSub: 'Apa yang anda boleh dan tidak boleh gunakan',
            included: 'Termasuk',
            unlockAll: 'Buka semua ciri',
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
            planFeaturesSub: "What you can and can't use",
            included: 'Included',
            unlockAll: 'Unlock all features',
        },
    })[lang];

    useEffect(() => {
        api.get<Sub>('/me/subscription').then((r) => setSub(r.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!sub) return <div className="panel">{C.loadFail}</div>;

    const premium = sub.plan === 'premium';
    const cardLimit = sub.limits.cards; // 0 = unlimited
    const unlimitedCards = cardLimit === 0;
    const pct = unlimitedCards ? 100 : Math.min(100, Math.round((sub.usage.cards / Math.max(1, cardLimit)) * 100));
    const expiry = fmtDate(sub.plan_expires_at);

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <div style={{ maxWidth: 820, display: 'grid', gap: 18 }}>
                {/* Plan header */}
                <div className="panel" style={premium ? planPremium : planFree}>
                    <div className="spread" style={{ alignItems: 'flex-start' }}>
                        <div>
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
                        </div>
                        {!premium && (
                            <Link to="/app/upgrade" className="btn btn-gold hide-mobile">
                                <Sparkles size={16} /> {C.upgrade}
                            </Link>
                        )}
                    </div>

                    {!premium && (
                        <Link to="/app/upgrade" className="btn btn-gold btn-block" style={{ marginTop: 18 }}>
                            <Sparkles size={16} /> {C.upgradeToPremium} (RM{sub.premium_price_myr})
                        </Link>
                    )}
                </div>

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
                                    {f.label}
                                </span>
                                <span style={{ marginLeft: 'auto' }}>
                                    {f.enabled
                                        ? <span className="badge badge-ok">{C.included}</span>
                                        : <span className="badge badge-bad">{C.premium}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {!premium && (
                        <Link to="/app/upgrade" className="btn btn-primary" style={{ marginTop: 18 }}>
                            <Crown size={16} /> {C.unlockAll}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

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
