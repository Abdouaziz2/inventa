import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { mockJewelry } from '@/data/mock';
import { JewelryStatus } from '@/types';
import { cn } from '@/lib/utils';

const JewelryPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JewelryStatus | 'all'>('all');

  const filtered = mockJewelry.filter(j => {
    const matchSearch = j.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses: { key: JewelryStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'available', label: 'Disponible' },
    { key: 'reserved', label: 'Réservé' },
    { key: 'sold', label: 'Vendu' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bijoux</h1>
          <p className="text-muted-foreground text-sm">{mockJewelry.length} pièces au catalogue</p>
        </div>
        <Button asChild size="sm" className="gold-gradient text-accent-foreground hover:opacity-90">
          <a href="/jewelry/add">+ Ajouter un Bijou</a>
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un bijou..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1 bg-card rounded-lg p-1 card-shadow">
          {statuses.map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                statusFilter === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-card rounded-xl card-shadow hover:card-shadow-hover transition-all overflow-hidden group">
            <div className="aspect-square bg-muted flex items-center justify-center">
              <span className="text-4xl">💎</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold leading-tight">{item.name}</h3>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-xs text-muted-foreground capitalize">{item.category} · {item.weight}g</p>
              <p className="text-lg font-bold">{item.salePrice.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">MAD</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JewelryPage;
