import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Wallet, Gem, BookmarkCheck, Plus, ShoppingBag } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { mockDeposits, mockSales, mockJewelry, mockReservations, dailySalesData } from '@/data/mock';

const Dashboard = () => {
  const totalStock = mockJewelry.filter(j => j.status === 'available').reduce((s, j) => s + j.salePrice, 0);
  const totalDeposits = mockDeposits.reduce((s, d) => s + d.amount, 0);
  const reserved = mockJewelry.filter(j => j.status === 'reserved').length;

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventes du jour" value="78 000 MAD" icon={TrendingUp} variant="gold" trend={{ value: '+12%', positive: true }} />
        <StatCard title="Total Dépôts" value={`${totalDeposits.toLocaleString()} MAD`} icon={Wallet} trend={{ value: '+5 aujourd\'hui', positive: true }} />
        <StatCard title="Valeur du Stock" value={`${totalStock.toLocaleString()} MAD`} icon={Gem} subtitle={`${mockJewelry.filter(j => j.status === 'available').length} pièces disponibles`} />
        <StatCard title="Réservations" value={String(reserved)} icon={BookmarkCheck} variant="dark" subtitle={`${mockReservations.length} en cours`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl p-5 card-shadow">
          <h3 className="text-sm font-semibold mb-4">Ventes de la semaine</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} MAD`, 'Ventes']} />
                <Bar dataKey="amount" fill="hsl(43 100% 50%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Operations */}
        <div className="bg-card rounded-xl p-5 card-shadow">
          <h3 className="text-sm font-semibold mb-4">Opérations récentes</h3>
          <div className="space-y-3">
            {mockDeposits.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{d.clientName}</p>
                  <p className="text-xs text-muted-foreground">{d.date}</p>
                </div>
                <span className="text-sm font-semibold text-success">+{d.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
