import { Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const AppHeader = () => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 card-shadow">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher clients, bijoux, transactions..."
            className="pl-9 bg-muted border-0 h-10"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full" />
        </button>
        <div className="h-6 w-px bg-border" />
        <span className="text-sm text-muted-foreground">{user?.code}</span>
      </div>
    </header>
  );
};

export default AppHeader;
