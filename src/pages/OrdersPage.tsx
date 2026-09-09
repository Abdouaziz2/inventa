import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Eye, Plus, Search, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useClients } from '@/features/clients';
import {
  useAddCustomerOrder,
  useCustomerOrders,
  useUpdateCustomerOrderStatus,
  type CustomerOrder,
} from '@/features/orders';
import { buildCustomerOrderReceipt } from '@/features/transactions';
import ReceiptModal, { type ReceiptData } from '@/components/ReceiptModal';
import ClientCombobox from '@/components/ClientCombobox';
import PageHeader from '@/components/PageHeader';
import FilterBar from '@/components/FilterBar';
import SectionCard from '@/components/SectionCard';
import { EmptyState, ListSkeleton, QueryErrorState } from '@/components/DataState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCFA } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useBusiness } from '@/hooks/useBusiness';

const getDefaultExpectedDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
};

const statusConfig: Record<CustomerOrder['status'], { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-warning/10 text-warning border-warning/20' },
  in_progress: { label: 'En cours', className: 'bg-info/10 text-info border-info/20' },
  ready: { label: 'Prête', className: 'bg-success/10 text-success border-success/20' },
  delivered: { label: 'Livrée', className: 'bg-muted text-foreground border-border' },
  cancelled: { label: 'Annulée', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const nextStatus: Partial<Record<CustomerOrder['status'], CustomerOrder['status']>> = {
  pending: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
};

type StatusFilter = 'all' | 'active' | CustomerOrder['status'];

const OrdersPage = () => {
  const { type: businessType } = useBusiness();
  const [searchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [estimatedTotal, setEstimatedTotal] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [expectedDate, setExpectedDate] = useState(getDefaultExpectedDate);
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data: clients = [] } = useClients();
  const { data: orders = [], isLoading, isError, refetch } = useCustomerOrders();
  const addOrder = useAddCustomerOrder();
  const updateStatus = useUpdateCustomerOrderStatus();

  useEffect(() => {
    const requestedSearch = searchParams.get('search');
    if (requestedSearch !== null) {
      setSearch(requestedSearch);
      setStatusFilter('all');
    }
  }, [searchParams]);

  const client = clients.find((item) => item.id === clientId);
  const totalValue = Number(estimatedTotal || 0);
  const depositValue = Number(deposit || 0);
  const remaining = Math.max(totalValue - depositValue, 0);
  const invalidAmounts = totalValue <= 0 || depositValue < 0 || depositValue > totalValue;
  const activeCount = useMemo(
    () => orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length,
    [orders],
  );
  const filteredOrders = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('fr');
    return orders.filter((order) => {
      const matchesSearch =
        !normalized ||
        `${order.description} ${order.document_number} ${order.clients?.name ?? ''}`
          .toLocaleLowerCase('fr')
          .includes(normalized);
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? !['delivered', 'cancelled'].includes(order.status)
            : order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const resetForm = () => {
    setClientId('');
    setDescription('');
    setQuantity('1');
    setEstimatedWeight('');
    setEstimatedTotal('');
    setDeposit('0');
    setExpectedDate(getDefaultExpectedDate());
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!client || !description.trim() || invalidAmounts || Number(quantity) < 1) return;
    try {
      const order = await addOrder.mutateAsync({
        client_id: client.id,
        description,
        quantity: Number(quantity),
        estimated_weight: estimatedWeight ? Number(estimatedWeight) : null,
        estimated_total: totalValue,
        deposit_amount: depositValue,
        expected_date: expectedDate || null,
        notes,
      });
      setCreateOpen(false);
      setReceipt(buildCustomerOrderReceipt(client, order));
      toast.success('Commande enregistrée');
      resetForm();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const changeStatus = async (order: CustomerOrder, status: CustomerOrder['status']) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status });
      toast.success(`Commande marquée « ${statusConfig[status].label} »`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const openOrderReceipt = (order: CustomerOrder) => {
    const orderClient = clients.find((item) => item.id === order.client_id);
    if (orderClient) setReceipt(buildCustomerOrderReceipt(orderClient, order));
  };

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        eyebrow={businessType === 'jewelry' ? 'Suivi atelier' : 'Suivi des demandes'}
        title="Commandes clients"
        description="Suivez les produits demandés, personnalisés ou commandés par les clients."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gold-gradient font-bold text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle commande
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 card-shadow">
          <p className="text-xs font-medium text-muted-foreground">À traiter</p>
          <p className="mt-1 text-2xl font-bold">{activeCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 card-shadow">
          <p className="text-xs font-medium text-muted-foreground">Prêtes à livrer</p>
          <p className="mt-1 text-2xl font-bold text-success">{orders.filter((order) => order.status === 'ready').length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 card-shadow">
          <p className="text-xs font-medium text-muted-foreground">Total commandes</p>
          <p className="mt-1 text-2xl font-bold">{orders.length}</p>
        </div>
      </div>

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Client, commande ou numéro..."
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">À traiter</SelectItem>
              <SelectItem value="all">Toutes les commandes</SelectItem>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <SectionCard
        title="Suivi des commandes"
        description="Les commandes les plus récentes apparaissent en premier."
        contentClassName="p-0 sm:p-0"
      >
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <QueryErrorState onRetry={() => void refetch()} title="Impossible de charger les commandes" />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title={orders.length ? 'Aucune commande ne correspond aux filtres' : 'Aucune commande enregistrée'}
            description={orders.length ? 'Modifiez la recherche ou le statut.' : 'Créez la première commande client.'}
            action={!orders.length ? <Button onClick={() => setCreateOpen(true)}>Nouvelle commande</Button> : undefined}
          />
        ) : (
          <div className="divide-y">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status];
              const followingStatus = nextStatus[order.status];
              const isActive = !['delivered', 'cancelled'].includes(order.status);
              const overdue = Boolean(
                isActive &&
                order.expected_date &&
                new Date(`${order.expected_date}T23:59:59`).getTime() < Date.now(),
              );
              return (
                <article key={order.id} className="space-y-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5">
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{order.description}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            <AlertTriangle className="h-3 w-3" /> En retard
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {order.clients?.name || 'Client'} · {order.document_number}
                      </p>
                      <p className={`mt-1 text-xs ${overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                        Date prévue : {order.expected_date ? new Date(`${order.expected_date}T12:00:00`).toLocaleDateString('fr-FR') : 'Non définie'}
                      </p>
                    </div>
                    <div className="shrink-0 md:text-right">
                      <p className="font-semibold">{formatCFA(order.estimated_total)}</p>
                      <p className="text-xs text-muted-foreground">Reste {formatCFA(order.remaining_amount)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openOrderReceipt(order)}>
                      <Eye className="mr-2 h-4 w-4" /> Voir le bon
                    </Button>
                    {followingStatus ? (
                      <Button type="button" size="sm" onClick={() => void changeStatus(order, followingStatus)} disabled={updateStatus.isPending}>
                        Passer à « {statusConfig[followingStatus].label} »
                      </Button>
                    ) : null}
                    {isActive ? (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void changeStatus(order, 'cancelled')} disabled={updateStatus.isPending}>
                        <XCircle className="mr-2 h-4 w-4" /> Annuler
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="max-h-dvh w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="pr-8">
            <SheetTitle>Nouvelle commande</SheetTitle>
            <SheetDescription>Enregistrez la demande et remettez un bon au client.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-5 pb-8">
            <div className="space-y-2">
              <Label>Client</Label>
              <ClientCombobox clients={clients} value={clientId} onValueChange={setClientId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-description">Produit demandé</Label>
              <Textarea id="order-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={businessType === 'jewelry' ? 'Exemple : alliance en or 18K, modèle personnalisé...' : 'Décrivez le produit, le modèle ou les caractéristiques demandées...'} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="order-quantity">Quantité</Label>
                <Input id="order-quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </div>
              {businessType === 'jewelry' ? <div className="space-y-2">
                <Label htmlFor="order-weight">Poids estimé (g)</Label>
                <Input id="order-weight" type="number" min="0" step="0.01" value={estimatedWeight} onChange={(event) => setEstimatedWeight(event.target.value)} placeholder="Facultatif" />
              </div> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="order-total">Prix estimé (FCFA)</Label>
                <Input id="order-total" type="number" min="1" value={estimatedTotal} onChange={(event) => setEstimatedTotal(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order-deposit">Acompte (FCFA)</Label>
                <Input id="order-deposit" type="number" min="0" max={totalValue || undefined} value={deposit} onChange={(event) => setDeposit(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-date">Date prévue</Label>
              <Input id="order-date" type="date" min={new Date().toISOString().slice(0, 10)} value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
            </div>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-semibold">Ajouter des notes</summary>
              <div className="mt-3">
                <Textarea id="order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Mesures, couleur, référence du modèle..." rows={3} />
              </div>
            </details>
            {totalValue > 0 ? (
              <div className="rounded-xl bg-muted p-4">
                <div className="flex justify-between gap-3 text-sm"><span>Prix estimé</span><strong>{formatCFA(totalValue)}</strong></div>
                <div className="mt-2 flex justify-between gap-3 text-sm"><span>Acompte</span><strong>{formatCFA(depositValue)}</strong></div>
                <div className="mt-3 flex justify-between gap-3 border-t pt-3 text-lg font-bold"><span>Reste à payer</span><span>{formatCFA(remaining)}</span></div>
                {depositValue > totalValue ? <p className="mt-2 text-sm text-destructive">L’acompte ne peut pas dépasser le prix estimé.</p> : null}
              </div>
            ) : null}
            <Button
              onClick={handleSubmit}
              disabled={!client || !description.trim() || invalidAmounts || Number(quantity) < 1 || addOrder.isPending}
              className="h-12 w-full gold-gradient font-bold text-accent-foreground hover:opacity-90"
            >
              <ClipboardCheck className="mr-2 h-5 w-5" />
              {addOrder.isPending ? 'Enregistrement...' : 'Enregistrer la commande'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ReceiptModal open={receipt !== null} onClose={() => setReceipt(null)} data={receipt} />
    </div>
  );
};

export default OrdersPage;
