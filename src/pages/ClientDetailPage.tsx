import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockClients, mockDeposits, mockSales } from '@/data/mock';
import { formatCFA } from '@/lib/format';

const ClientDetailPage = () => {
  const { id } = useParams();
  const client = mockClients.find(c => c.id === id);
  const deposits = mockDeposits.filter(d => d.clientId === id);
  const sales = mockSales.filter(s => s.clientId === id);

  if (!client) return <div className="p-6">Client introuvable</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/clients"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground text-sm">Code: {client.code} · {client.phone}</p>
        </div>
      </div>

      {/* Balance highlight */}
      <div className="bg-card rounded-xl p-6 card-shadow flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl gold-gradient">
            <Wallet className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Solde disponible</p>
            <p className="text-3xl font-bold">{formatCFA(client.balance)}</p>
          </div>
        </div>
        <Button asChild size="sm" className="gold-gradient text-accent-foreground hover:opacity-90">
          <Link to="/deposits"><Plus className="h-4 w-4 mr-1" /> Nouveau Dépôt</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposits */}
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Historique des Dépôts</h3>
          </div>
          {deposits.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucun dépôt</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">DATE</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2">MONTANT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">NOTE</th>
              </tr></thead>
              <tbody>
                {deposits.map(d => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-sm">{d.date}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-right text-success">+{formatCFA(d.amount)}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{d.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Sales */}
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Historique des Achats</h3>
          </div>
          {sales.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucun achat</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">DATE</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">BIJOU</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2">MONTANT</th>
              </tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-sm">{s.date}</td>
                    <td className="px-5 py-3 text-sm font-medium">{s.jewelryName}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-right">{formatCFA(s.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailPage;
