import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, LayoutGrid, BarChart3, Settings, ShieldCheck,
    Wallet, LogOut, Menu, X, type LucideIcon, PanelLeftClose, PanelLeftOpen, Archive } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang, dict } from '../../context/LangContext';
import { LangToggle } from '../../components/LangToggle';
import { BrandLogo } from '../../components/BrandLogo';
import { useSidebarCollapsed } from '../../lib/sidebar';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; }
interface NavGroup { title: string; items: NavItem[]; }

export function AdminLayout() {
    const { user, logout } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();
    const [open, setOpen] = useState(false);
    const [collapsed, toggleCollapsed] = useSidebarCollapsed();

    async function doLogout() { await logout(); nav('/', { replace: true }); }
    const close = () => setOpen(false);

    const C = dict({
        bm: {
            dashboard: 'Papan Utama', users: 'Pengguna', approvals: 'Kelulusan', templates: 'Rekaan', traffic: 'Trafik Web', finance: 'Kewangan', settings: 'Tetapan',
            archive: 'Arkib',
            gMain: 'Utama', gUsers: 'Pengguna', gContent: 'Kandungan', gAnalytics: 'Analitik', gFinance: 'Kewangan', gSettings: 'Tetapan',
            logout: 'Log Keluar', collapseMenu: 'Kecilkan menu', expandMenu: 'Kembangkan menu',
        },
        en: {
            dashboard: 'Dashboard', users: 'Users', approvals: 'Approvals', templates: 'Templates', traffic: 'Web Traffic', finance: 'Finance', settings: 'Settings',
            archive: 'Archive',
            gMain: 'Main', gUsers: 'Users', gContent: 'Content', gAnalytics: 'Analytics', gFinance: 'Finance', gSettings: 'Settings',
            logout: 'Log Out', collapseMenu: 'Collapse menu', expandMenu: 'Expand menu',
        },
        zh: {
            dashboard: '仪表板', users: '用户', approvals: '审批', templates: '请柬设计', traffic: '网站流量', finance: '财务', settings: '设置',
            archive: '归档',
            gMain: '主要', gUsers: '用户', gContent: '内容', gAnalytics: '数据分析', gFinance: '财务', gSettings: '设置',
            logout: '退出登录', collapseMenu: '收起菜单', expandMenu: '展开菜单',
        },
    }, lang);

    const groups: NavGroup[] = [
        { title: C.gMain, items: [{ to: '/admin', label: C.dashboard, icon: LayoutDashboard, end: true }] },
        { title: C.gUsers, items: [
            { to: '/admin/users', label: C.users, icon: Users },
            { to: '/admin/approvals', label: C.approvals, icon: ShieldCheck },
            { to: '/admin/archive', label: C.archive, icon: Archive },
        ] },
        { title: C.gContent, items: [{ to: '/admin/templates', label: C.templates, icon: LayoutGrid }] },
        { title: C.gAnalytics, items: [{ to: '/admin/traffic', label: C.traffic, icon: BarChart3 }] },
        { title: C.gFinance, items: [{ to: '/admin/finance', label: C.finance, icon: Wallet }] },
        { title: C.gSettings, items: [{ to: '/admin/settings', label: C.settings, icon: Settings }] },
    ];

    const active = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');

    return (
        <div className={`shell${collapsed ? ' is-collapsed' : ''}`}>
            <div className="mobile-bar">
                <Link to="/admin" className="brand" onClick={close}><BrandLogo height={32} /></Link>
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
                <Link to="/admin" className="brand" onClick={close}><BrandLogo height={32} /></Link>

                <nav>
                    {groups.map((g) => (
                        <div key={g.title} style={{ marginBottom: 6 }}>
                            <div className="sidebar-group-title" style={sectionTitle}>{g.title}</div>
                            {g.items.map((it) => {
                                const Icon = it.icon;
                                return (
                                    <NavLink key={it.to} to={it.to} end={it.end} className={active} onClick={close}>
                                        <Icon size={17} /> {it.label}
                                    </NavLink>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-foot">
                    <div className="collapse-hide" style={{ marginBottom: 10, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.name}
                        </div>
                        <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email}
                        </div>
                        <span className="badge badge-gold" style={{ fontSize: 10, marginTop: 5 }}>
                            {user?.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                        </span>
                    </div>
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

const sectionTitle: React.CSSProperties = {
    fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase',
    color: 'var(--muted)', fontWeight: 700, margin: '16px 13px 6px', opacity: 0.7,
};
