import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, LogOut, Sparkles, Menu, X, CreditCard, Lock, HardDrive, Building2, ShoppingCart, Heart, ReceiptText, UserCog, PanelLeftClose, PanelLeftOpen, Handshake, Wallet } from 'lucide-react';
import { useAuth, can } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';
import { useCart } from '../../context/CartContext';
import { LangToggle } from '../../components/LangToggle';
import { BrandLogo } from '../../components/BrandLogo';
import { useSidebarCollapsed } from '../../lib/sidebar';

export function AppLayout() {
    const { user, logout } = useAuth();
    const { lang } = useLang();
    const { count } = useCart();
    const nav = useNavigate();
    const [open, setOpen] = useState(false);

    const [collapsed, toggleCollapsed] = useSidebarCollapsed();

    async function doLogout() { await logout(); nav('/', { replace: true }); }
    const close = () => setOpen(false);

    const C = dict({
        bm: { cards: 'Kad Saya', templates: 'Rekaan', saved: 'Disimpan', cart: 'Troli', purchases: 'Pembelian', payments: 'Bayaran', affiliate: 'Program Affiliate', subscription: 'Langganan', storage: 'Simpanan', company: 'Profil Syarikat', account: 'Profil Saya', logout: 'Log Keluar', free: 'Percuma', collapseMenu: 'Kecilkan menu', expandMenu: 'Kembangkan menu' },
        en: { cards: 'My Cards', templates: 'Templates', saved: 'Saved', cart: 'Cart', purchases: 'Purchases', payments: 'Payments', affiliate: 'Affiliate', subscription: 'Subscription', storage: 'Storage', company: 'Company Profile', account: 'My Profile', logout: 'Log Out', free: 'Free', collapseMenu: 'Collapse menu', expandMenu: 'Expand menu' },
        zh: { cards: '我的请柬', templates: '请柬设计', saved: '已收藏', cart: '购物车', purchases: '购买记录', payments: '收款', affiliate: '联盟计划', subscription: '订阅', storage: '存储空间', company: '公司资料', account: '我的资料', logout: '退出登录', free: '免费', collapseMenu: '收起菜单', expandMenu: '展开菜单' },
    }, lang);

    const active = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
    const roleLabel = { vendor: 'Vendor', affiliate: 'Affiliate', admin: 'Admin', superadmin: 'Superadmin', user: '' }[user?.role ?? 'user'];
    // A pending/rejected account is locked to a single screen — hide the whole nav so
    // the sidebar can't tease pages the route guard would just bounce them back from.
    const locked = user?.status === 'pending' || user?.status === 'rejected';

    return (
        <div className={`shell${collapsed ? ' is-collapsed' : ''}`}>
            <div className="mobile-bar">
                <Link to="/" className="brand" onClick={close}><BrandLogo height={32} /></Link>
                <button className="nav-burger" style={{ color: 'var(--plum)' }} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {open && <div className="sidebar-backdrop" onClick={close} />}

            <aside className={`sidebar${open ? ' open' : ''}`}>
                {/* Collapse to an icon rail. Desktop only — on mobile the sidebar
                    is a full drawer, so the CSS ignores the collapsed state. */}
                <button
                    type="button"
                    className="sidebar-collapse"
                    aria-label={collapsed ? C.expandMenu : C.collapseMenu}
                    aria-expanded={!collapsed}
                    title={collapsed ? C.expandMenu : C.collapseMenu}
                    onClick={toggleCollapsed}
                >
                    {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                </button>
                <Link to="/" className="brand" onClick={close}><BrandLogo height={32} /></Link>

                {!locked && (
                <nav>
                    <NavLink to="/panel" end className={active} onClick={close}><LayoutGrid size={17} /> {C.cards}</NavLink>
                    <NavLink to="/panel/templates" className={active} onClick={close}><Sparkles size={17} /> {C.templates}</NavLink>
                    <NavLink to="/panel/saved" className={active} onClick={close}><Heart size={17} /> {C.saved}</NavLink>
                    <NavLink to="/panel/cart" className={active} onClick={close}>
                        <ShoppingCart size={17} /> <span className="grow">{C.cart}</span>
                        {count > 0 && <span className="sidebar-count" style={cartBadge}>{count}</span>}
                    </NavLink>
                    <NavLink to="/panel/purchases" className={active} onClick={close}><ReceiptText size={17} /> {C.purchases}</NavLink>
                    {user?.can_pay_per_entry && <NavLink to="/panel/payments" className={active} onClick={close}><Wallet size={17} /> {C.payments}</NavLink>}
                    {user?.role === 'affiliate' && <NavLink to="/panel/affiliate" className={active} onClick={close}><Handshake size={17} /> {C.affiliate}</NavLink>}
                    {/* Always visible — even with no packages yet, the page shows the
                        current plan, usage and the role-upgrade request. */}
                    <NavLink to="/panel/subscription" className={active} onClick={close}><CreditCard size={17} /> {C.subscription}</NavLink>
                    {(user?.role === 'vendor' || user?.role === 'affiliate') && <NavLink to="/panel/profile" className={active} onClick={close}><Building2 size={17} /> {C.company}</NavLink>}
                    <NavLink to="/panel/storage" className={active} onClick={close}><HardDrive size={17} /> {C.storage}</NavLink>
                    <NavLink to="/panel/account" className={active} onClick={close}><UserCog size={17} /> {C.account}</NavLink>
                </nav>
                )}
                <div className="sidebar-foot">
                    <Link to="/panel/account" className="collapse-hide" onClick={close} style={{ display: 'block', marginBottom: 10, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.name}
                        </div>
                        <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email}
                        </div>
                        <span style={{ display: 'inline-block', marginTop: 5 }}>
                            {roleLabel
                                ? <span className="badge badge-gold" style={{ fontSize: 10 }}>{roleLabel}</span>
                                : user?.has_paid_access
                                    ? <span className="badge badge-ok" style={{ fontSize: 10 }}>Aktif</span>
                                    : <span className="badge" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Lock size={9} /> {C.free}</span>}
                        </span>
                    </Link>
                    {/* Language sits directly above log-out: both are account-level
                        controls, and it keeps the nav list to navigation alone. */}
                    <div className="collapse-hide" style={{ marginBottom: 8 }}>
                        <LangToggle block />
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
