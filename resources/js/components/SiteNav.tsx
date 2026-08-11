import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { LangToggle } from './LangToggle';

export function SiteNav() {
    const { user } = useAuth();
    const { lang } = useLang();
    const [open, setOpen] = useState(false);

    const C = {
        bm: { templates: 'Rekaan', features: 'Keistimewaan', pricing: 'Harga', login: 'Masuk', start: 'Mula Percuma', dash: 'Ruang Kerja', admin: 'Panel Admin' },
        en: { templates: 'Templates', features: 'Features', pricing: 'Pricing', login: 'Log In', start: 'Start Free', dash: 'Dashboard', admin: 'Admin' },
    }[lang];

    const links = (
        <>
            <Link to="/templates" onClick={() => setOpen(false)}>{C.templates}</Link>
            <a href="/#features" onClick={() => setOpen(false)}>{C.features}</a>
            <a href="/#pricing" onClick={() => setOpen(false)}>{C.pricing}</a>
            <LangToggle />
            {user ? (
                <Link to={user.role === 'admin' ? '/admin' : '/app'} className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                    {user.role === 'admin' ? C.admin : C.dash}
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
                <Link to="/" className="brand">Portal<span style={{ color: 'var(--gold)' }}>Kahwin</span></Link>
                <div className="nav-links">{links}</div>
                <button className="nav-burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>
            {open && <div className="nav-drawer">{links}</div>}
        </nav>
    );
}
