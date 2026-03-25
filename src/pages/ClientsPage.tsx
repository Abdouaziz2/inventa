import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { mockClients } from '@/data/mock';

const ClientsPage = () => {
  const [search, setSearch] = useState('');
  const filtered = mockClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm">{mockClients.length} clients enregistrés</p>
        </div>
        <Button size="sm" className="gold-gradient text-accent-foreground hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" /> Nouveau Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom ou code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">CODE</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">NOM</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">TÉLÉPHONE</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">SOLDE</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(client => (
              <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-5 py-3.5 text-sm font-mono font-medium">{client.code}</td>
                <td className="px-5 py-3.5 text-sm font-medium">{client.name}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {client.phone}
                </td>
                <td className="px-5 py-3.5 text-sm font-semibold text-right">
                  <span className={client.balance > 0 ? 'text-success' : 'text-muted-foreground'}>
                    {client.balance.toLocaleString()} MAD
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/clients/${client.id}`}>Détails</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsPage;
