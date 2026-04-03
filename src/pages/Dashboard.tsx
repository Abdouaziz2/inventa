import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Wallet, Gem, BookmarkCheck, Plus, ShoppingBag } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { useJewelry, useDeposits, useSales, useReservations, type DepositWithClient, type SaleWithRelations } from '@/hooks/useDatabase';
import { formatCFA } from '@/lib/format';

const Dashboard = () => {
  const { data: jewelry = [] } = useJewelry();
  const { data: deposits = [] } = useDeposits();
  const { data: sales = [] } = useSales();
  const { data: reservations = [] } = useReservations();

  const totalStock = jewelry.filter(j => j.status === 'available').reduce((s, j) => s + j.sale_price, 0);
  const totalDeposits = deposits.reduce((s: number, d: DepositWithClient) => s + d.amount, 0);
  const totalSales = sales.reduce((s: number, d: SaleWithRelations) => s + d.total_price, 0);
  const reserved = jewelry.filter(j => j.status === 'reserved').length;

  // Build simple daily chart from sales data
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const dailySalesData = days.map((day, i) => {
    const dayTotal = sales
      .filter((sale: SaleWithRelations) => new Date(sale.created_at).getDay() === i)
      .reduce((sum: number, sale: SaleWithRelations) => sum + sale.total_price, 0);
    return { day, amount: dayTotal };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/deposits"><Plus className="h-4 w-4 mr-1" /> Nouveau Dépôt</Link>
          </Button>
          <Button asChild size="sm" className="gold-gradient text-accent-foreground hover:opacity-90">
            <Link to="/sales"><ShoppingBag className="h-4 w-4 mr-1" /> Nouvelle Vente</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Ventes" value={formatCFA(totalSales)} icon={TrendingUp} variant="gold" trend={{ value: `${sales.length} ventes`, positive: true }} />
        <StatCard title="Total Dépôts" value={formatCFA(totalDeposits)} icon={Wallet} trend={{ value: `${deposits.length} dépôts`, positive: true }} />
        <StatCard title="Valeur du Stock" value={formatCFA(totalStock)} icon={Gem} subtitle={`${jewelry.filter(j => j.status === 'available').length} pièces disponibles`} />
        <StatCard title="Réservations" value={String(reserved)} icon={BookmarkCheck} variant="dark" subtitle={`${reservations.length} en cours`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl p-5 card-shadow">
          <h3 className="text-sm font-semibold mb-4">Ventes par jour</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => v > 0 ? `${(v / 1000000).toFixed(1)}M` : '0'} />
                <Tooltip formatter={(v: number) => [formatCFA(v), 'Ventes']} />
                <Bar dataKey="amount" fill="hsl(43 100% 50%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 card-shadow">
          <h3 className="text-sm font-semibold mb-4">Derniers dépôts</h3>
          <div className="space-y-3">
            {deposits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun dépôt</p>
            ) : (
              deposits.slice(0, 5).map((d: DepositWithClient) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.clients?.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className="text-sm font-semibold text-success">+{formatCFA(d.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
