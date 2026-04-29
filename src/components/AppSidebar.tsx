import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import {
  LayoutDashboard, Users, Gem, PlusCircle, Wallet,
  BookmarkCheck, ShoppingBag, Receipt, LogOut, Diamond, ShieldCheck, UserCog, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AppSidebar = ({ open, onOpenChange }: AppSidebarProps) => {
  const location = useLocation();
  const { user, logout, isSuperAdmin } = useAuth();
  const { data: profile } = useProfileSettings();

  const businessName = profile?.business_name || user?.fullName || 'Ma boutique';
  const businessLogo = profile?.logo ?? '';

  const navItems = [
    { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Bijoux', path: '/jewelry', icon: Gem },
    { label: 'Ajouter Bijou', path: '/jewelry/add', icon: PlusCircle },
    { label: 'Dépôt Libre', path: '/deposits', icon: Wallet },
    { label: 'Réservation', path: '/reservations', icon: BookmarkCheck },
    { label: 'Vente', path: '/sales', icon: ShoppingBag },
    { label: 'Reçus', path: '/receipts', icon: Receipt },
    { label: 'Profil', path: '/profile', icon: UserCog },
    ...(isSuperAdmin ? [
      { label: 'Utilisateurs', path: '/admin/users', icon: ShieldCheck },
    ] : []),
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={() => onOpenChange(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(82vw,280px)] min-h-screen flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:w-[260px] lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        {businessLogo ? (
          <img src={businessLogo} alt={businessName} className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <Diamond className="h-7 w-7 text-sidebar-primary" />
        )}
        <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight truncate">
          {businessName}
        </span>
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => onOpenChange(false)}
          className="ml-auto rounded-md p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
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
              onClick={() => onOpenChange(false)}
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
    </>
  );
};

export default AppSidebar;
