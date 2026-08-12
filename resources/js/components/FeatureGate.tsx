import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth, can, type FeatureKey } from '../context/AuthContext';
import { useLang, dict } from '../context/LangContext';

/**
 * Renders `children` only when the signed-in account may use `feature`,
 * otherwise an explanatory panel.
 *
 * Hiding the nav link is not enough — a bookmarked or typed URL would still
 * reach the page. The API refuses either way, but the user deserves a sentence
 * rather than a wall of failed requests.
 */
export function FeatureGate({
    feature,
    backTo,
    children,
}: {
    feature: FeatureKey;
    /** Where the "go back" button leads. */
    backTo: string;
    children: ReactNode;
}) {
    const { user } = useAuth();
    const { lang } = useLang();

    if (can(user, feature)) return <>{children}</>;

    const C = dict({
        bm: {
            title: 'Ciri ini tidak tersedia untuk akaun anda',
            body: 'Pengurusan meja, daftar masuk dan pas QR tersedia untuk akaun Vendor dan Affiliate. Hubungi kami jika anda ingin menaik taraf akaun.',
            back: 'Kembali',
        },
        en: {
            title: 'This feature is not available on your account',
            body: 'Table management, check-in and QR passes are available to Vendor and Affiliate accounts. Contact us if you would like to upgrade.',
            back: 'Go back',
        },
        zh: {
            title: '您的账户暂无此功能',
            body: '桌位管理、签到与二维码入场证仅向商家与联盟伙伴账户开放。如需升级请联系我们。',
            back: '返回',
        },
    }, lang);

    return (
        <div className="panel center" style={{ maxWidth: 480, margin: '40px auto', padding: 48 }}>
            <div
                style={{
                    width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                    display: 'grid', placeItems: 'center', background: 'var(--cream)', color: 'var(--gold)',
                }}
            >
                <Lock size={24} />
            </div>
            <h2 style={{ margin: '0 0 10px' }}>{C.title}</h2>
            <p className="muted" style={{ margin: '0 0 22px', lineHeight: 1.55 }}>{C.body}</p>
            <Link to={backTo} className="btn btn-primary">{C.back}</Link>
        </div>
    );
}
