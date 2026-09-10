import { History, KeyRound, LogOut, ShieldCheck, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { publicAsset } from '@/lib/assets';

const adminLinks = [
  { label: 'Utilisateurs', path: '/admin/users', icon: Users },
  { label: 'Abonnements', path: '/admin/subscriptions', icon: KeyRound },
  { label: 'Journal', path: '/admin/audit', icon: History },
];

const SuperAdminLayout = () => {
  const { logout, user } = useAuth();

  return (
    <div className="h-dvh min-h-0 overflow-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
          <img src={publicAsset('inventa-icon.png')} alt="" className="h-9 w-9 rounded-lg" />
          <div className="min-w-0">
            <p className="font-semibold text-sidebar-accent-foreground">Inventa</p>
            <p className="text-xs text-sidebar-muted">Administration</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {adminLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex h-full min-h-0 flex-col lg:ml-64">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#C9972A]" />
            <span className="font-semibold">Console superadmin</span>
          </div>
          <div className="min-w-0 text-right">
            <p className="max-w-48 truncate text-sm font-semibold">{user?.fullName}</p>
            <p className="max-w-48 truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </header>

        <nav className="grid shrink-0 grid-cols-3 border-b bg-card p-2 lg:hidden">
          {adminLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium',
                  isActive ? 'bg-muted text-foreground' : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
