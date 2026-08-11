import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, LayoutGrid, BarChart3, Settings,
    LogOut, Menu, X, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { LangToggle } from '../../components/LangToggle';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; }
interface NavGroup { title: string; items: NavItem[]; }

export function AdminLayout() {
    const { user, logout } = useAuth();
    const { lang } = useLang();
    const nav = useNavigate();
    const [open, setOpen] = useState(false);
    async function doLogout() { await logout(); nav('/', { replace: true }); }
    const close = () => setOpen(false);

    const C = {
        bm: {
            dashboard: 'Dashboard', users: 'Pengguna', templates: 'Templat', traffic: 'Trafik Web', settings: 'Tetapan',
            gMain: 'Utama', gUsers: 'Pengguna', gContent: 'Kandungan', gAnalytics: 'Analitik', gSettings: 'Tetapan',
            logout: 'Log Keluar',
        },
        en: {
            dashboard: 'Dashboard', users: 'Users', templates: 'Templates', traffic: 'Web Traffic', settings: 'Settings',
            gMain: 'Main', gUsers: 'Users', gContent: 'Content', gAnalytics: 'Analytics', gSettings: 'Settings',
            logout: 'Log Out',
        },
    }[lang];

    const groups: NavGroup[] = [
        { title: C.gMain, items: [{ to: '/admin', label: C.dashboard, icon: LayoutDashboard, end: true }] },
        { title: C.gUsers, items: [{ to: '/admin/users', label: C.users, icon: Users }] },
        { title: C.gContent, items: [{ to: '/admin/templates', label: C.templates, icon: LayoutGrid }] },
        { title: C.gAnalytics, items: [{ to: '/admin/traffic', label: C.traffic, icon: BarChart3 }] },
        { title: C.gSettings, items: [{ to: '/admin/settings', label: C.settings, icon: Settings }] },
    ];

    const active = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');

    return (
        <div className="shell">
            <div className="mobile-bar">
                <Link to="/admin" className="brand" onClick={close}>Portal<span style={{ color: 'var(--gold)' }}>Admin</span></Link>
                <button className="nav-burger" style={{ color: '#fff' }} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {open && <div className="sidebar-backdrop" onClick={close} />}

            <aside className={`sidebar${open ? ' open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
                <Link to="/admin" className="brand" onClick={close}>Portal<span style={{ color: 'var(--gold)' }}>Admin</span></Link>

                <nav style={{ flex: 1, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>
                    {groups.map((g) => (
                        <div key={g.title} style={{ marginBottom: 6 }}>
                            <div style={sectionTitle}>{g.title}</div>
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

                <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="spread" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 13, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.name} · admin
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

const sectionTitle: React.CSSProperties = {
    fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase',
    color: 'rgba(231,212,200,0.42)', fontWeight: 700, margin: '16px 13px 6px',
};
