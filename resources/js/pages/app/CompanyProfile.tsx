import { ProfileFields } from '../../components/ProfileFields';
import { useLang, dict } from '../../context/LangContext';

/**
 * Vendor/affiliate business profile. The fields themselves are the superadmin-defined
 * "Business & Receipt" group (logo, business name, address, phone, email, tax) plus
 * the "use my business on receipts" opt-in — all rendered by <ProfileFields> so the
 * superadmin controls what's collected. Account name/phone live on the Account page.
 */
export function CompanyProfile() {
    const { lang } = useLang();
    const C = dict({
        bm: {
            title: 'Profil Perniagaan',
            subtitle: 'Logo dan butiran perniagaan yang dipaparkan pada kad jemputan anda dan pada resit pembelian yang berkaitan dengan anda.',
        },
        en: {
            title: 'Business Profile',
            subtitle: 'The logo and business details shown on your invitation cards and on receipts attributed to you.',
        },
        zh: {
            title: '商号资料',
            subtitle: '显示在您的请柬以及归属于您的购买收据上的标志与商号信息。',
        },
    }, lang);

    return (
        <div>
            <div className="page-head">
                <h1>{C.title}</h1>
                <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
            </div>
            <ProfileFields mode="business" />
        </div>
    );
}
