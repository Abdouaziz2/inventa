import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BookmarkCheck,
  CalendarClock,
  FileText,
  Gem,
  Plus,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJewelry } from '@/features/jewelry';
import { useBuybacks } from '@/features/operations';
import {
  buildReceiptOperations,
  useCustomerOrders,
  useDeposits,
  useReservations,
  useSales,
} from '@/features/transactions';
import { formatCFA } from '@/lib/format';
import { useMemo, useState } from 'react';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { calculateDashboardFinancials } from '@/lib/dashboard';
import { useBusiness } from '@/hooks/useBusiness';

type DashboardPeriod = '1day' | '7days' | '30days' | '90days' | '180days' | '365days';

const dashboardPeriods: { value: DashboardPeriod; label: string; days: number }[] = [
  { value: '1day', label: '1 jour', days: 1 },
  { value: '7days', label: '7 jours', days: 7 },
  { value: '30days', label: '30 jours', days: 30 },
  { value: '90days', label: '3 mois', days: 90 },
  { value: '180days', label: '6 mois', days: 180 },
  { value: '365days', label: '1 an', days: 365 },
];

const getPeriodDays = (period: DashboardPeriod) =>
  dashboardPeriods.find((item) => item.value === period)?.days ?? 7;

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const getPeriodBounds = (period: DashboardPeriod) => {
  const now = new Date();
  const end = new Date(now);
  const days = getPeriodDays(period);
  const start = startOfDay(now);
  start.setDate(start.getDate() - (days - 1));
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = startOfDay(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));

  return { start, end, previousStart, previousEnd };
};

const isWithin = (value: string, start: Date, end: Date) => {
  const date = new Date(value);
  return date >= start && date <= end;
};

const getTrend = (current: number, previous: number) => {
  if (previous <= 0) return current > 0 ? { value: 'Nouvelle activité', positive: true } : { value: 'Stable', positive: null };
  const percent = Math.round(((current - previous) / previous) * 100);
  return { value: `${Math.abs(percent)} % vs période précédente`, positive: percent >= 0 };
};

const getChartData = (period: DashboardPeriod, sales: { created_at: string; total_price: number }[]) => {
  const { start, end } = getPeriodBounds(period);
  const days = getPeriodDays(period);

  if (days <= 30) {
    return Array.from({ length: days }, (_, index) => {
      const current = startOfDay(start);
      current.setDate(current.getDate() + index);
      const next = new Date(current);
      next.setDate(next.getDate() + 1);
      const amount = sales
        .filter((sale) => {
          const date = new Date(sale.created_at);
          return date >= current && date < next;
        })
        .reduce((sum, sale) => sum + sale.total_price, 0);

      return {
        day: days === 1
          ? 'Aujourd’hui'
          : current.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        amount,
      };
    });
  }

  const buckets: { day: string; amount: number; start: Date; end: Date }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    buckets.push({
      day: cursor.toLocaleDateString('fr-FR', { month: 'short' }),
      amount: 0,
      start: bucketStart,
      end: bucketEnd,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets.map((bucket) => ({
    day: bucket.day,
    amount: sales
      .filter((sale) => {
        const date = new Date(sale.created_at);
        return date >= bucket.start && date < bucket.end && date >= start && date <= end;
      })
      .reduce((sum, sale) => sum + sale.total_price, 0),
  }));
};

const Dashboard = () => {
  const [period, setPeriod] = useState<DashboardPeriod>('7days');
  const { data: jewelry = [] } = useJewelry();
  const { data: deposits = [] } = useDeposits();
  const { data: sales = [] } = useSales();
  const { data: reservations = [] } = useReservations();
  const { data: orders = [] } = useCustomerOrders();
  const { data: buybacks = [] } = useBuybacks();
  const { data: profile } = useProfileSettings();
  const { type: businessType, config } = useBusiness();
  const businessName = profile?.business_name?.trim() || config.shopFallback;

  const { start, end, previousStart, previousEnd } = getPeriodBounds(period);
  const currentSales = sales.filter((sale) => isWithin(sale.created_at, start, end));
  const previousSales = sales.filter((sale) => isWithin(sale.created_at, previousStart, previousEnd));
  const currentDeposits = deposits.filter((deposit) => isWithin(deposit.created_at, start, end));
  const currentBuybacks = buybacks.filter((buyback) => isWithin(buyback.created_at, start, end));

  const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.total_price, 0);
  const {
    revenue,
    collections,
    creditGranted,
    returnsPaid,
  } = calculateDashboardFinancials(currentSales, currentDeposits, currentBuybacks);

  const activeReservations = reservations.filter(
    (reservation) =>
      reservation.status === 'active' &&
      (!reservation.expires_at || new Date(reservation.expires_at) >= new Date()),
  );
  const lowStock = jewelry.filter((item) => item.quantity > 0 && item.quantity <= 3);
  const outOfStock = jewelry.filter((item) => item.quantity <= 0);
  const inSevenDays = new Date();
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  const expiringReservations = activeReservations.filter(
    (reservation) => reservation.expires_at && new Date(reservation.expires_at) <= inSevenDays,
  );
  const overdueOrders = orders.filter(
    (order) =>
      !['delivered', 'cancelled'].includes(order.status) &&
      !!order.expected_date &&
      new Date(`${order.expected_date}T23:59:59`) < new Date(),
  );

  const chartData = useMemo(() => getChartData(period, sales), [period, sales]);
  const hasChartActivity = chartData.some((item) => item.amount > 0);

  const alerts = [
    {
      label: 'Stock faible',
      detail: `${lowStock.length} référence(s) à surveiller`,
      href: '/products',
      count: lowStock.length,
      icon: AlertTriangle,
      tone: 'text-warning bg-warning/10',
    },
    {
      label: 'Stock épuisé',
      detail: `${outOfStock.length} référence(s) indisponible(s)`,
      href: '/products',
      count: outOfStock.length,
      icon: Gem,
      tone: 'text-destructive bg-destructive/10',
    },
    {
      label: 'Réservations proches',
      detail: `${expiringReservations.length} échéance(s) sous 7 jours`,
      href: '/operations/reservation',
      count: expiringReservations.length,
      icon: BookmarkCheck,
      tone: 'text-warning bg-warning/10',
    },
    {
      label: 'Commandes en retard',
      detail: `${overdueOrders.length} commande(s) à traiter`,
      href: '/orders',
      count: overdueOrders.length,
      icon: CalendarClock,
      tone: 'text-destructive bg-destructive/10',
    },
  ].filter((alert) => alert.count > 0);
  const recentOperations = useMemo(
    () =>
      buildReceiptOperations(deposits, sales, reservations, orders, buybacks)
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, 6),
    [buybacks, deposits, orders, reservations, sales],
  );
  const availableReferences = jewelry.filter((item) => item.quantity > 0).length;
  const activeOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title={businessName}
        description={config.dashboardDescription}
        actions={
          <>
          <Select value={period} onValueChange={(value) => setPeriod(value as DashboardPeriod)}>
            <SelectTrigger className="h-10 w-full bg-card sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dashboardPeriods.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {businessType === 'jewelry' ? (
            <Button asChild variant="outline" size="sm" className="justify-center">
              <Link to="/deposits"><Plus className="mr-1 h-4 w-4" /> Dépôt client</Link>
            </Button>
          ) : null}
          <Button asChild size="sm" className="justify-center gold-gradient text-accent-foreground hover:opacity-90">
            <Link to="/operations/sale"><ShoppingBag className="mr-1 h-4 w-4" /> Nouvelle vente</Link>
          </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Chiffre d'affaires" value={formatCFA(revenue)} subtitle="Valeur totale des ventes" icon={TrendingUp} variant="gold" trend={getTrend(revenue, previousRevenue)} />
        <StatCard title="Encaissements" value={formatCFA(collections)} subtitle="Paiements conservés et dépôts" icon={Banknote} />
        <StatCard title="Ventes à crédit" value={formatCFA(creditGranted)} subtitle="Reste dû créé sur la période" icon={WalletCards} />
        <StatCard title="Retours payés" value={formatCFA(returnsPaid)} subtitle="Sorties liées aux achats retour" icon={TrendingDown} variant="dark" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)] 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
        <SectionCard
          title="Évolution des ventes"
          description={`${currentSales.length} vente(s) sur la période sélectionnée`}
          actions={<span className="text-sm font-semibold">{formatCFA(revenue)}</span>}
          contentClassName="pt-3"
        >
          <div className="h-64">
            {hasChartActivity ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                    tickFormatter={(value) =>
                      value >= 1_000_000
                        ? `${(value / 1_000_000).toFixed(1)}M`
                        : value >= 1_000
                          ? `${Math.round(value / 1_000)}k`
                          : String(Math.round(value))
                    }
                  />
                  <Tooltip formatter={(value: number) => [formatCFA(value), 'Ventes']} />
                  <Bar dataKey="amount" fill="hsl(43 100% 50%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                Aucune vente sur cette période.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="À traiter"
          description="Les points qui demandent votre attention."
          contentClassName="pt-3"
        >
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun point urgent pour le moment.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <Link
                  key={alert.label}
                  to={alert.href}
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${alert.tone}`}>
                    <alert.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{alert.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{alert.detail}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)] 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
        <SectionCard
          title="Activité récente"
          description={`Les dernières opérations enregistrées dans ${businessName}.`}
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/receipts">Tous les documents <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          }
          contentClassName="p-0 sm:p-0"
        >
          {recentOperations.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucune opération enregistrée.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                      <th className="px-5 py-3">OPÉRATION</th>
                      <th className="px-5 py-3">CLIENT</th>
                      <th className="px-5 py-3">DATE</th>
                      <th className="px-5 py-3 text-right">MONTANT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOperations.map((operation) => (
                      <tr key={`${operation.type}-${operation.id}`} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <FileText className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold">{operation.label}</p>
                              <p className="font-mono text-xs text-muted-foreground">{operation.documentNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm">{operation.client}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {new Date(operation.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm font-semibold">{formatCFA(operation.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y md:hidden">
                {recentOperations.map((operation) => (
                  <Link
                    key={`${operation.type}-${operation.id}`}
                    to={`/receipts?search=${encodeURIComponent(operation.documentNumber)}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-muted/30"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{operation.label} · {operation.client}</span>
                      <span className="block text-xs text-muted-foreground">{operation.documentNumber}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">{formatCFA(operation.amount)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="État de l’activité" description="Vue rapide des dossiers en cours.">
          <div className="space-y-3">
            <Link to="/products" className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <Gem className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-muted-foreground">Références disponibles</span>
                <span className="block text-xl font-bold">{availableReferences}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/operations/reservation" className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <BookmarkCheck className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-muted-foreground">Réservations actives</span>
                <span className="block text-xl font-bold">{activeReservations.length}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/orders" className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
                <CalendarClock className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-muted-foreground">Commandes à traiter</span>
                <span className="block text-xl font-bold">{activeOrders}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default Dashboard;
