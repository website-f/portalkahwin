import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, LogOut, Sparkles, Menu, X, CreditCard, Lock, HardDrive, Building2, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { useCart } from '../../context/CartContext';
import { LangToggle } from '../../components/LangToggle';

export function AppLayout() {
    const { user, logout } = useAuth();
    const { lang } = useLang();
    const { count } = useCart();
    const nav = useNavigate();
    const [open, setOpen] = useState(false);

    async function doLogout() { await logout(); nav('/', { replace: true }); }
    const close = () => setOpen(false);

    const C = {
        bm: { cards: 'Kad Saya', templates: 'Rekaan', cart: 'Troli', subscription: 'Langganan', storage: 'Simpanan', company: 'Profil Syarikat', logout: 'Log Keluar', free: 'Percuma' },
        en: { cards: 'My Cards', templates: 'Templates', cart: 'Cart', subscription: 'Subscription', storage: 'Storage', company: 'Company Profile', logout: 'Log Out', free: 'Free' },
    }[lang];

    const active = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
    const needsSub = !!user?.needs_subscription; // vendor / affiliate
    const roleLabel = { vendor: 'Vendor', affiliate: 'Affiliate', admin: 'Admin', superadmin: 'Superadmin', user: '' }[user?.role ?? 'user'];

    return (
        <div className="shell">
            <div className="mobile-bar">
                <Link to="/" className="brand" onClick={close}>PortalKahwin</Link>
                <button className="nav-burger" style={{ color: 'var(--plum)' }} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {open && <div className="sidebar-backdrop" onClick={close} />}

            <aside className={`sidebar${open ? ' open' : ''}`}>
                <Link to="/" className="brand" onClick={close}>PortalKahwin</Link>
                <nav>
                    <NavLink to="/panel" end className={active} onClick={close}><LayoutGrid size={17} /> {C.cards}</NavLink>
                    <NavLink to="/panel/templates" className={active} onClick={close}><Sparkles size={17} /> {C.templates}</NavLink>
                    <NavLink to="/panel/cart" className={active} onClick={close}>
                        <ShoppingCart size={17} /> <span className="grow">{C.cart}</span>
                        {count > 0 && <span style={cartBadge}>{count}</span>}
                    </NavLink>
                    {needsSub && <NavLink to="/panel/subscription" className={active} onClick={close}><CreditCard size={17} /> {C.subscription}</NavLink>}
                    {needsSub && <NavLink to="/panel/profile" className={active} onClick={close}><Building2 size={17} /> {C.company}</NavLink>}
                    <NavLink to="/panel/storage" className={active} onClick={close}><HardDrive size={17} /> {C.storage}</NavLink>
                </nav>
                <div style={{ position: 'absolute', bottom: 20, left: 16, right: 16 }}>
                    <div className="spread" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 13, opacity: 0.85 }}>
                            {user?.name}{' '}
                            {roleLabel
                                ? <span className="badge badge-gold" style={{ fontSize: 10 }}>{roleLabel}</span>
                                : user?.has_paid_access
                                    ? <span className="badge badge-ok" style={{ fontSize: 10 }}>Aktif</span>
                                    : <span className="badge" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Lock size={9} /> {C.free}</span>}
                        </span>
                        <LangToggle />
                    </div>
                    <button className="btn btn-ghost btn-sm btn-block" onClick={doLogout}>
                        <LogOut size={15} /> {C.logout}
                    </button>
                </div>
            </aside>

            <main className="shell-main"><Outlet /></main>
        </div>
    );
}

const cartBadge: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999,
    background: 'var(--gold)', color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1,
};
