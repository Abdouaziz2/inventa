import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useDatabase';
import { useNavigate } from 'react-router-dom';
import { formatCFA } from '@/lib/format';

interface AppHeaderProps {
  onMenuClick: () => void;
}

const AppHeader = ({ onMenuClick }: AppHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data: clients = [] } = useClients();

  const results = query.length >= 1 ? clients.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.code.includes(query) ||
    c.phone.replace(/\s/g, '').includes(query.replace(/\s/g, ''))
  ).slice(0, 6) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectClient = (clientId: string) => {
    setQuery('');
    setShowResults(false);
    navigate(`/clients/${clientId}`);
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5 lg:px-6">
      <button
        type="button"
        aria-label="Ouvrir le menu"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div ref={wrapperRef} className="relative min-w-0 flex-1 lg:max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder="Rechercher client par nom, code ou téléphone..."
          className="pl-9 bg-muted border-0 h-10"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => query.length >= 1 && setShowResults(true)}
        />
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
            {results.map(c => (
              <button
                key={c.id}
                onClick={() => selectClient(c.id)}
                className="w-full px-4 py-3 text-left hover:bg-muted flex items-center justify-between gap-3 text-sm transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{c.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.code} · {c.phone}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-success">{formatCFA(c.balance)}</span>
              </button>
            ))}
          </div>
        )}
        {showResults && query.length >= 1 && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
            Aucun client trouvé
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full" />
        </button>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground">{user?.username ?? user?.email}</p>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
