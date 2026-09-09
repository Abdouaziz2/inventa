import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClient, useUpdateClient } from '@/features/clients';
import { useCustomerOrders, useDeposits, useReservations, useSales } from '@/features/transactions';
import { useBuybacks } from '@/features/operations';
import { formatCFA } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

type HistoryType = 'all' | 'sale' | 'reservation' | 'order' | 'buyback' | 'deposit';

type HistoryItem = {
  id: string;
  type: Exclude<HistoryType, 'all'>;
  label: string;
  title: string;
  document: string;
  amount: number;
  date: string;
  status?: string;
};

const filters: { id: HistoryType; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'sale', label: 'Ventes' },
  { id: 'reservation', label: 'Réservations' },
  { id: 'order', label: 'Commandes' },
  { id: 'buyback', label: 'Retours' },
  { id: 'deposit', label: 'Dépôts' },
];

const typeStyles: Record<HistoryItem['type'], string> = {
  sale: 'bg-info/10 text-info',
  reservation: 'bg-warning/10 text-warning',
  order: 'bg-[#c9972a]/10 text-[#8f6810]',
  buyback: 'bg-violet-500/10 text-violet-700',
  deposit: 'bg-success/10 text-success',
};

const ClientDetailPage = () => {
  const { id } = useParams();
  const [filter, setFilter] = useState<HistoryType>('all');
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();
  const { data: deposits = [] } = useDeposits(id);
  const { data: sales = [] } = useSales(id);
  const { data: reservations = [] } = useReservations();
  const { data: orders = [] } = useCustomerOrders();
  const { data: buybacks = [] } = useBuybacks(id);

  const history = useMemo<HistoryItem[]>(() => {
    if (!id) return [];
    return [
      ...sales.map((item) => ({
        id: item.id,
        type: 'sale' as const,
        label: 'Vente',
        title: item.items.map((line) => line.jewelry_name).join(', ') || 'Vente de bijou',
        document: item.document_number,
        amount: item.total_price,
        date: item.created_at,
      })),
      ...reservations.filter((item) => item.client_id === id).map((item) => ({
        id: item.id,
        type: 'reservation' as const,
        label: 'Réservation',
        title: item.jewelry?.name || 'Bijou réservé',
        document: item.document_number,
        amount: item.deposit_amount,
        date: item.created_at,
        status: item.status,
      })),
      ...orders.filter((item) => item.client_id === id).map((item) => ({
        id: item.id,
        type: 'order' as const,
        label: 'Commande',
        title: item.description,
        document: item.document_number,
        amount: item.estimated_total,
        date: item.created_at,
        status: item.status,
      })),
      ...buybacks.map((item) => ({
        id: item.id,
        type: 'buyback' as const,
        label: 'Retour',
        title: item.description,
        document: item.document_number,
        amount: item.purchase_amount,
        date: item.created_at,
      })),
      ...deposits.map((item) => ({
        id: item.id,
        type: 'deposit' as const,
        label: 'Dépôt',
        title: item.note || 'Dépôt sur le compte client',
        document: item.document_number,
        amount: item.amount,
        date: item.created_at,
      })),
    ].sort((left, right) => right.date.localeCompare(left.date));
  }, [buybacks, deposits, id, orders, reservations, sales]);

  const visibleHistory = filter === 'all' ? history : history.filter((item) => item.type === filter);

  const openEditDialog = () => {
    if (!client) return;
    setEditName(client.name);
    setEditPhone(client.phone);
    setShowEdit(true);
  };

  const handleUpdateClient = async () => {
    if (!client || !editName.trim()) return;
    try {
      await updateClient.mutateAsync({
        id: client.id,
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      toast.success('Client modifié avec succès');
      setShowEdit(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>;
  if (!client) return <div className="p-6">Client introuvable</div>;

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/clients"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="min-w-0 flex-1">
          <h1 className="page-title">{client.name}</h1>
          <p className="break-words text-sm text-muted-foreground">Code : {client.code} · {client.phone}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={openEditDialog}>
          <Pencil className="mr-2 h-4 w-4" />
          Modifier
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-card p-5 card-shadow sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-xl p-3 gold-gradient"><Wallet className="h-6 w-6 text-accent-foreground" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Solde disponible</p>
            <p className="text-2xl font-bold sm:text-3xl">{formatCFA(client.balance)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline"><Link to="/operations/sale">Nouvelle opération</Link></Button>
          <Button asChild className="gold-gradient text-accent-foreground"><Link to="/deposits"><Plus className="mr-1 h-4 w-4" /> Dépôt</Link></Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl bg-card card-shadow">
        <div className="border-b px-4 py-4 sm:px-6">
          <h2 className="font-semibold">Historique du client</h2>
          <p className="text-sm text-muted-foreground">{history.length} opération(s) enregistrée(s)</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === item.id ? 'border-[#c9972a] bg-[#c9972a]/10 text-[#8f6810]' : 'hover:bg-muted',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {visibleHistory.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucune opération dans cette catégorie.</p>
        ) : (
          <div className="divide-y">
            {visibleHistory.map((item) => (
              <div key={`${item.type}-${item.id}`} className="grid gap-3 px-4 py-4 sm:px-6 md:grid-cols-[130px_minmax(0,1fr)_160px] md:items-center">
                <div>
                  <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-semibold', typeStyles[item.type])}>{item.label}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{item.document}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-semibold">{formatCFA(item.amount)}</p>
                  {item.status ? <p className="text-xs capitalize text-muted-foreground">{item.status.replaceAll('_', ' ')}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>Modifiez le nom complet ou le numéro de téléphone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-client-name">Nom complet</Label>
              <Input id="edit-client-name" value={editName} onChange={(event) => setEditName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-phone">Téléphone</Label>
              <Input id="edit-client-phone" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Annuler</Button>
            <Button
              type="button"
              onClick={() => void handleUpdateClient()}
              disabled={!editName.trim() || updateClient.isPending}
              className="gold-gradient text-accent-foreground"
            >
              {updateClient.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetailPage;
