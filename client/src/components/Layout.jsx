import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/',              label: 'Dashboard',     icon: '📊', perm: 'dashboard.view' },
  { to: '/aod',           label: 'AOD',           icon: '📄', perm: 'aod.view' },
  { to: '/invoices',      label: 'Invoices',      icon: '🧾', perm: 'invoice.view' },
  { to: '/second-copy',   label: 'Second Copy',   icon: '🔒', perm: 'secondcopy.view' },
  { to: '/returns',       label: 'Returns',       icon: '↩️', perm: 'return.view' },
  { to: '/qc',            label: 'QC Inspection', icon: '🔍', perm: 'qc.view' },
  { to: '/replacements',  label: 'Replacements',  icon: '🔁', perm: 'replacement.view' },
  { to: '/pipeline',      label: 'Pipeline View', icon: '🔗', perm: 'pipeline.view' },
  { to: '/users',         label: 'Users',         icon: '👥', perm: 'users.view' },
  { to: '/permissions',   label: 'Permissions',   icon: '🔐', perm: 'users.edit' },
];

export default function Layout() {
  const { user, logout, can } = useAuth();
  const nav = useNavigate();

  const visible = navItems.filter((n) => can(n.perm));

  const handleLogout = () => {
    if (!confirm('Sign out?')) return;
    logout();
    nav('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold leading-tight">AOD & Invoice</h1>
          <p className="text-xs text-slate-400 mt-1">Full Tracking System</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {visible.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold">
              {(user?.FullName || user?.Username || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.FullName || user?.Username}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                {user?.Role || 'User'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
}