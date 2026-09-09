import { ChevronDown, LogOut, Menu, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import UniversalSearch from '@/components/UniversalSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppHeaderProps {
  onMenuClick: () => void;
}

const AppHeader = ({ onMenuClick }: AppHeaderProps) => {
  const { isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.fullName
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
  const userLabel =
    user?.role === 'super_admin'
      ? 'Super Admin'
      : user?.role === 'vendeur'
        ? 'Vendeur'
        : 'Administrateur';

  return (
    <header
      data-testid="app-header"
      className="relative z-30 flex h-16 min-w-0 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-3 shadow-sm backdrop-blur sm:px-5 lg:px-6"
    >
      <button
        type="button"
        aria-label="Ouvrir le menu"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <UniversalSearch />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex shrink-0 items-center gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-muted"
            aria-label="Ouvrir le menu utilisateur"
          >
            <span className="gold-gradient flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-primary">
              {initials}
            </span>
            <span className="hidden max-w-40 leading-tight md:block">
              <span className="block truncate text-sm font-semibold">{user?.fullName}</span>
              <span className="block truncate text-xs text-muted-foreground">{userLabel}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block truncate text-sm">{user?.fullName}</span>
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
              {user?.username ?? user?.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin ? (
            <>
              <DropdownMenuItem className="min-h-10 cursor-pointer" onSelect={() => navigate('/profile')}>
                <UserCog className="mr-2 h-4 w-4" />
                Profil de la boutique
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            className="min-h-10 cursor-pointer text-destructive focus:text-destructive"
            onSelect={() => void logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AppHeader;
