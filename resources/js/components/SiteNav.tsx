import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth, isStaff } from '../context/AuthContext';
import { useLang, dict } from '../context/LangContext';
import { LangToggle } from './LangToggle';
import { BrandLogo } from './BrandLogo';

export function SiteNav() {
    const { user } = useAuth();
    const { lang } = useLang();
    const [open, setOpen] = useState(false);

    const C = dict({
        bm: { templates: 'Rekaan', features: 'Keistimewaan', pricing: 'Harga', login: 'Masuk', start: 'Mula Percuma', dash: 'Ruang Kerja', admin: 'Panel Admin' },
        en: { templates: 'Templates', features: 'Features', pricing: 'Pricing', login: 'Log In', start: 'Start Free', dash: 'Dashboard', admin: 'Admin' },
        zh: { templates: '请柬设计', features: '功能特色', pricing: '价格', login: '登录', start: '免费开始', dash: '工作台', admin: '管理后台' },
    }, lang);

    const links = (
        <>
            <Link to="/" onClick={() => setOpen(false)}>{C.templates}</Link>
            <LangToggle />
            {user ? (
                <Link to={isStaff(user) ? '/admin' : '/panel'} className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                    {isStaff(user) ? C.admin : C.dash}
                </Link>
            ) : (
                <>
                    <Link to="/login" onClick={() => setOpen(false)}>{C.login}</Link>
                    <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>{C.start}</Link>
                </>
            )}
        </>
    );

    return (
        <nav className="site-nav">
            <div className="container">
                <Link to="/" className="brand"><BrandLogo height={34} /></Link>
                <div className="nav-links">{links}</div>
                <button className="nav-burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>
            {open && <div className="nav-drawer">{links}</div>}
        </nav>
    );
}
