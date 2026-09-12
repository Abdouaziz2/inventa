import { useLocation, Link } from 'react-router-dom';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import {
  LayoutDashboard, Users, Gem, Wallet,
  ClipboardList, Receipt, UserCog, X, KeyRound, Store, ArrowLeftRight, ShoppingCart, Menu, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdaptiveLogo from '@/components/AdaptiveLogo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { publicAsset } from '@/lib/assets';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/hooks/useBusiness';

interface AppSidebarProps {
  open: boolean;
  collapsed: boolean;
  onOpenChange: (open: boolean) => void;
  onCollapsedToggle: () => void;
}

const AppSidebar = ({ open, collapsed, onOpenChange, onCollapsedToggle }: AppSidebarProps) => {
  const location = useLocation();
  const { data: profile } = useProfileSettings();
  const { isAdmin, isSuperAdmin } = useAuth();
  const { config } = useBusiness();
  const businessName = profile?.business_name?.trim() || 'Ma boutique';
  const businessLogo = profile?.logo ?? '';

  const navGroups = [
    {
      label: 'Activité',
      items: [
        { label: 'Accueil', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Opérations', path: '/operations', icon: ArrowLeftRight },
        { label: 'Commandes', path: '/orders', icon: ClipboardList },
      ],
    },
    {
      label: 'Gestion',
      items: [
        { label: 'Clients', path: '/clients', icon: Users },
        {
          label: config.inventoryLabel,
          path: '/products',
          icon: Gem,
        },
        { label: 'Dépôt client', path: '/deposits', icon: Wallet },
        { label: 'Documents', path: '/receipts', icon: Receipt },
      ],
    },
    {
      label: 'Administration',
      items: [
        ...(isAdmin ? [{ label: 'Paramètres', path: '/profile', icon: UserCog }] : []),
        ...(isSuperAdmin ? [{ label: 'Utilisateurs', path: '/users', icon: Users }] : []),
...(isAdmin ? [{ label: 'Abonnement', path: '/subscriptions', icon: KeyRound }] : []),
        ...(!isAdmin ? [{ label: 'Mon abonnement', path: '/subscription', icon: KeyRound }] : []),
        ...(isAdmin ? [{ label: 'Journal', path: '/audit', icon: History }] : []),
      ],
    },
  ].filter((group) => group.items.length > 0);
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
        data-testid="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh min-h-0 w-[min(86vw,290px)] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-200 lg:z-40 lg:translate-x-0",
          collapsed ? "lg:w-[76px]" : "lg:w-[248px] xl:w-[260px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className={cn("flex h-16 shrink-0 items-center border-b border-sidebar-border px-3", collapsed && "lg:px-2")}>
        <div className={cn(
          "flex min-w-0 flex-1 items-center gap-3",
          collapsed && "lg:hidden",
        )}>
          {businessLogo ? (
            <AdaptiveLogo
              src={businessLogo}
              alt={`Logo ${businessName}`}
              className={cn(
                "h-10 w-10 shrink-0 rounded-lg border border-white/10 shadow-sm",
                collapsed && "lg:h-9 lg:w-9",
              )}
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-background">
              <Store className="h-5 w-5 text-sidebar-primary" />
            </div>
          )}
          <div className={cn("min-w-0", collapsed && "lg:hidden")}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-sidebar-muted">{config.typeLabel}</p>
            <p className="truncate text-sm font-semibold leading-tight text-sidebar-accent-foreground" title={businessName}>
              {businessName}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => onOpenChange(false)}
          className="ml-2 rounded-md p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={collapsed ? 'Déployer la navigation' : 'Réduire la navigation'}
          onClick={onCollapsedToggle}
          className={cn(
            "ml-2 hidden rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:inline-flex",
            collapsed && "lg:mx-auto",
          )}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className={cn("shrink-0 px-3 pt-3", collapsed && "lg:px-2")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/operations/sale"
              onClick={() => onOpenChange(false)}
              aria-label="Nouvelle vente"
              className={cn(
                "gold-gradient flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90",
                collapsed && "lg:px-0",
              )}
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>Nouvelle vente</span>
            </Link>
          </TooltipTrigger>
          {collapsed ? <TooltipContent side="right" className="hidden lg:block">Nouvelle vente</TooltipContent> : null}
        </Tooltip>
      </div>

      <nav className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4", collapsed && "lg:px-2")}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className={cn(
              "mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted",
              collapsed && "lg:mx-2 lg:h-px lg:bg-sidebar-border lg:p-0 lg:text-transparent",
            )}>
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        onClick={() => onOpenChange(false)}
                        aria-label={item.label}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          collapsed && "lg:justify-center lg:px-0",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    {collapsed ? <TooltipContent side="right" className="hidden lg:block">{item.label}</TooltipContent> : null}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <footer className={cn("shrink-0 border-t border-sidebar-border p-3", collapsed && "lg:px-2")}>
        <div className="flex items-center justify-center gap-2">
          <img src={publicAsset('inventa-icon.png')} alt="" className="h-6 w-6 rounded" />
          <span className={cn("text-xs font-semibold tracking-wide text-sidebar-muted", collapsed && "lg:hidden")}>Inventa</span>
        </div>
      </footer>
      </aside>
    </>
  );
};

export default AppSidebar;
