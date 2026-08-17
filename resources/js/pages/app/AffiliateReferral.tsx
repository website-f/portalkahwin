import { useEffect, useState } from 'react';
import { Share2, Copy, Check, Users, LayoutGrid, ShoppingCart, Wallet, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, dict } from '../../context/LangContext';

interface Affiliate {
    referral_code: string;
    referral_url: string;
    referred_users: number;
    sales_count: number;
    templates_sold: number;
    revenue: number;
    commission?: number;
    commission_percent?: number;
}

// Copy to clipboard with a legacy fallback for non-secure contexts (http LAN,
// in-app webviews) where navigator.clipboard is unavailable. Kept local to this
// page rather than shared, per the brief.
async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* fall through to legacy path */
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

// Small inline Copy -> Check button that reverts after ~1.6s.
function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
    const [ok, setOk] = useState(false);
    useEffect(() => {
        if (!ok) return;
        const t = setTimeout(() => setOk(false), 1600);
        return () => clearTimeout(t);
    }, [ok]);
    return (
        <button
            type="button"
            className={ok ? 'btn btn-gold' : 'btn btn-primary'}
            style={{ flex: '0 0 auto' }}
            onClick={async () => {
                if (await copyText(value)) setOk(true);
            }}
        >
            {ok ? <Check size={16} /> : <Copy size={16} />}
            {ok ? copiedLabel : label}
        </button>
    );
}

export function AffiliateReferral() {
    const { lang } = useLang();
    const [data, setData] = useState<Affiliate | null>(null);
    const [loading, setLoading] = useState(true);

    const C = dict({
        bm: {
            title: 'Program Affiliate',
            subtitle: 'Jana pendapatan dengan merujuk pelanggan yang membeli rekaan kad melalui pautan anda.',
            linkTitle: 'Pautan Rujukan Anda',
            linkHint: 'Kongsi pautan ini — setiap pelanggan yang mendaftar & membeli melalui pautan anda direkodkan di sini.',
            codeLabel: 'Kod rujukan',
            copy: 'Salin Pautan',
            copied: 'Disalin',
            statsTitle: 'Prestasi Rujukan',
            statsSub: 'Ringkasan hasil daripada pelanggan yang anda rujuk.',
            referredUsers: 'Pengguna dirujuk',
            templatesSold: 'Rekaan terjual',
            salesCount: 'Jumlah jualan',
            revenue: 'Hasil (RM)',
            emptyNote: 'Belum ada rujukan lagi — kongsi pautan anda untuk mula menjana hasil.',
            adminNote: 'Superadmin turut melihat angka ini di panel pentadbir.',
            loadFail: 'Maklumat program affiliate belum berjaya dimuatkan.',
            linkAria: 'Pautan rujukan anda',
        },
        en: {
            title: 'Affiliate Program',
            subtitle: 'Earn by referring customers who buy card designs through your link.',
            linkTitle: 'Your Referral Link',
            linkHint: 'Share this link — every customer who signs up & buys through your link is recorded here.',
            codeLabel: 'Referral code',
            copy: 'Copy Link',
            copied: 'Copied',
            statsTitle: 'Referral Performance',
            statsSub: 'A summary of the sales your referrals generate.',
            referredUsers: 'Referred users',
            templatesSold: 'Templates sold',
            salesCount: 'Sales',
            revenue: 'Revenue (RM)',
            emptyNote: 'No referrals yet — share your link to start earning.',
            adminNote: 'Superadmin can also see these figures in the admin panel.',
            loadFail: 'Unable to load the affiliate program.',
            linkAria: 'Your referral link',
        },
        zh: {
            title: '联盟计划',
            subtitle: '通过您的链接推荐购买请柬设计的客户，即可赚取收入。',
            linkTitle: '您的推荐链接',
            linkHint: '分享此链接 — 每位通过您的链接注册并购买的客户都会记录在此。',
            codeLabel: '推荐码',
            copy: '复制链接',
            copied: '已复制',
            statsTitle: '推荐业绩',
            statsSub: '您推荐的客户所带来的销售概览。',
            referredUsers: '推荐用户',
            templatesSold: '售出设计',
            salesCount: '成交笔数',
            revenue: '收入（RM）',
            emptyNote: '暂无推荐 — 分享您的链接即可开始赚取收入。',
            adminNote: '超级管理员也可在管理后台查看这些数据。',
            loadFail: '无法加载联盟计划信息。',
            linkAria: '您的推荐链接',
        },
    }, lang);

    const loc = lang === 'bm' ? 'ms-MY' : lang === 'zh' ? 'zh-CN' : 'en-MY';
    const rm = (n: number) => n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    useEffect(() => {
        api.get<Affiliate>('/me/affiliate')
            .then((r) => setData(r.data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!data) return <div className="panel">{C.loadFail}</div>;

    const isEmpty = data.referred_users === 0 && data.sales_count === 0 && data.templates_sold === 0 && data.revenue === 0;

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>

            <div style={{ maxWidth: 820, display: 'grid', gap: 18 }}>
                {/* Referral link */}
                <div className="panel" style={linkPanel}>
                    <div className="row spread" style={{ alignItems: 'flex-start' }}>
                        <div className="row" style={{ gap: 10 }}>
                            <Share2 size={22} color="var(--plum)" />
                            <h3 style={{ margin: 0, fontSize: 19 }}>{C.linkTitle}</h3>
                        </div>
                        <span style={chip} title={C.codeLabel}>
                            {C.codeLabel}: <strong style={{ fontFamily: 'var(--mono, monospace)', letterSpacing: 0.5 }}>{data.referral_code}</strong>
                        </span>
                    </div>

                    <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                        <input
                            type="text"
                            readOnly
                            value={data.referral_url}
                            aria-label={C.linkAria}
                            onFocus={(e) => e.currentTarget.select()}
                            onClick={(e) => e.currentTarget.select()}
                            style={linkInput}
                        />
                        <CopyButton value={data.referral_url} label={C.copy} copiedLabel={C.copied} />
                    </div>

                    <p className="muted" style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.6 }}>{C.linkHint}</p>
                </div>

                {/* Stats */}
                <div className="panel">
                    <h3 style={{ margin: '0 0 4px' }}>{C.statsTitle}</h3>
                    <p className="muted" style={{ margin: '0 0 18px', fontSize: 13 }}>{C.statsSub}</p>

                    <div className="stat-grid">
                        <div className="stat">
                            <div className="row" style={{ gap: 8 }}><Users size={16} color="var(--gold)" /><span className="l">{C.referredUsers}</span></div>
                            <div className="n">{data.referred_users}</div>
                        </div>
                        <div className="stat">
                            <div className="row" style={{ gap: 8 }}><LayoutGrid size={16} color="var(--gold)" /><span className="l">{C.templatesSold}</span></div>
                            <div className="n">{data.templates_sold}</div>
                        </div>
                        <div className="stat">
                            <div className="row" style={{ gap: 8 }}><ShoppingCart size={16} color="var(--gold)" /><span className="l">{C.salesCount}</span></div>
                            <div className="n">{data.sales_count}</div>
                        </div>
                        <div className="stat" style={{ borderColor: 'var(--gold-soft)' }}>
                            <div className="row" style={{ gap: 8 }}><Wallet size={16} color="var(--gold)" /><span className="l">{C.revenue}</span></div>
                            <div className="n" style={{ color: 'var(--gold)' }}>RM {rm(data.revenue)}</div>
                        </div>
                        {(data.commission_percent ?? 0) > 0 && (
                            <div className="stat" style={{ borderColor: 'var(--gold-soft)' }}>
                                <div className="row" style={{ gap: 8 }}><Wallet size={16} color="var(--gold)" /><span className="l">{dict({ bm: `Komisen (${data.commission_percent}%)`, en: `Commission (${data.commission_percent}%)`, zh: `佣金 (${data.commission_percent}%)` }, lang)}</span></div>
                                <div className="n" style={{ color: 'var(--gold)' }}>RM {rm(data.commission ?? 0)}</div>
                            </div>
                        )}
                    </div>

                    {isEmpty && (
                        <p className="muted" style={{ margin: '16px 0 0', fontSize: 13 }}>{C.emptyNote}</p>
                    )}
                </div>

                {/* Superadmin visibility note */}
                <p className="row" style={{ gap: 7, margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
                    <Info size={14} /> {C.adminNote}
                </p>
            </div>
        </div>
    );
}

const linkPanel: React.CSSProperties = {
    borderColor: 'var(--gold-soft)',
    background: 'linear-gradient(180deg, #fffaf2, #fff)',
};
const chip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, flex: '0 0 auto',
    fontSize: 12.5, fontWeight: 600, padding: '4px 11px', borderRadius: 999,
    background: 'var(--cream)', color: 'var(--plum)', whiteSpace: 'nowrap',
};
const linkInput: React.CSSProperties = {
    flex: '1 1 240px', minWidth: 0,
    padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 10,
    font: 'inherit', fontSize: 14, background: '#fff', color: 'var(--ink)',
};
