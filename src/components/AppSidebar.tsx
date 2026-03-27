import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, Gem, PlusCircle, Wallet,
  BookmarkCheck, ShoppingBag, Receipt, LogOut, Diamond, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AppSidebar = () => {
  const location = useLocation();
  const { user, logout, isSuperAdmin } = useAuth();

  const navItems = [
    { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Bijoux', path: '/jewelry', icon: Gem },
    { label: 'Ajouter Bijou', path: '/jewelry/add', icon: PlusCircle },
    { label: 'Dépôt Libre', path: '/deposits', icon: Wallet },
    { label: 'Réservation', path: '/reservations', icon: BookmarkCheck },
    { label: 'Vente', path: '/sales', icon: ShoppingBag },
    { label: 'Reçus', path: '/receipts', icon: Receipt },
    ...(isSuperAdmin ? [{ label: 'Utilisateurs', path: '/admin/users', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="w-[260px] min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        <Diamond className="h-7 w-7 text-sidebar-primary" />
        <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
          Jewel<span className="text-sidebar-primary">Stock</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full gold-gradient flex items-center justify-center text-xs font-bold text-primary">
            {user?.fullName?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{user?.fullName}</p>
            <p className="text-xs text-sidebar-muted capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button onClick={logout} className="p-1.5 rounded-md text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
