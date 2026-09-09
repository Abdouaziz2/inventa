import { Link, Navigate, useParams } from 'react-router-dom';
import { BookmarkCheck, RotateCcw, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import SalesPage from '@/pages/SalesPage';
import ReservationsPage from '@/pages/ReservationsPage';
import BuybacksPage from '@/pages/BuybacksPage';

const operationTypes = [
  { id: 'sale', label: 'Vente', icon: ShoppingBag },
  { id: 'reservation', label: 'Réservation', icon: BookmarkCheck },
  { id: 'return', label: 'Retour', icon: RotateCcw },
] as const;

const OperationsPage = () => {
  const { type } = useParams();
  if (!type) return <Navigate to="/operations/sale" replace />;
  const selected = operationTypes.find((item) => item.id === type);
  if (!selected) return <Navigate to="/operations/sale" replace />;

  return (
    <div className="animate-fade-in space-y-4">
      <nav className="flex max-w-full gap-1 overflow-x-auto rounded-xl border bg-card p-1 card-shadow">
        {operationTypes.map((item) => {
          const Icon = item.icon;
          const active = item.id === selected.id;
          return (
            <Link
              key={item.id}
              to={`/operations/${item.id}`}
              className={cn(
                'flex min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                active ? 'gold-gradient text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="[&_.page-shell]:p-0 [&_.page-shell]:gap-6">
        {selected.id === 'sale' ? <SalesPage /> : null}
        {selected.id === 'reservation' ? <ReservationsPage /> : null}
        {selected.id === 'return' ? <BuybacksPage /> : null}
      </div>
    </div>
  );
};

export default OperationsPage;
