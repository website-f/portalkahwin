import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, LogOut, Sparkles, Crown, Menu, X, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { LangToggle } from '../../components/LangToggle';

export function AppLayout() {
    const { user, logout } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();
    const [open, setOpen] = useState(false);

    async function doLogout() { await logout(); nav('/', { replace: true }); }
    const close = () => setOpen(false);

    const C = {
        bm: { cards: 'Kad Saya', templates: 'Rekaan', subscription: 'Langganan', upgrade: 'Naik Taraf', logout: 'Log Keluar', free: 'Percuma' },
        en: { cards: 'My Cards', templates: 'Templates', subscription: 'Subscription', upgrade: 'Upgrade', logout: 'Log Out', free: 'Free' },
    }[lang];

    const active = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');

    return (
        <div className="shell">
            <div className="mobile-bar">
                <Link to="/" className="brand" onClick={close}>PortalKahwin</Link>
                <button className="nav-burger" style={{ color: '#fff' }} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {open && <div className="sidebar-backdrop" onClick={close} />}

            <aside className={`sidebar${open ? ' open' : ''}`}>
                <Link to="/" className="brand" onClick={close}>PortalKahwin</Link>
                <nav>
                    <NavLink to="/app" end className={active} onClick={close}><LayoutGrid size={17} /> {C.cards}</NavLink>
                    <NavLink to="/app/templates" className={active} onClick={close}><Sparkles size={17} /> {C.templates}</NavLink>
                    <NavLink to="/app/subscription" className={active} onClick={close}><CreditCard size={17} /> {C.subscription}</NavLink>
                    <NavLink to="/app/upgrade" className={active} onClick={close}><Crown size={17} /> {C.upgrade}</NavLink>
                </nav>
                <div style={{ position: 'absolute', bottom: 20, left: 16, right: 16 }}>
                    <div className="spread" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 13, opacity: 0.85 }}>
                            {user?.name}{' '}
                            {(user?.plan === 'premium' || user?.role === 'admin')
                                ? <span className="badge badge-gold" style={{ fontSize: 10 }}>Premium</span>
                                : <span className="badge" style={{ fontSize: 10 }}>{C.free}</span>}
                        </span>
                        <LangToggle light />
                    </div>
                    <button className="btn btn-ghost btn-sm btn-block" onClick={doLogout}
                        style={{ color: '#e7d4c8', borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}>
                        <LogOut size={15} /> {C.logout}
                    </button>
                </div>
            </aside>

            <main className="shell-main"><Outlet /></main>
        </div>
    );
}
