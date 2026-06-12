import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/features/clients';
import { useJewelry, getReservableJewelry, getJewelryTotalPrice } from '@/features/jewelry';
import {
  useAddReservation,
  useCancelReservation,
  useReservations,
  buildReservationReceipt,
  calculateRemainingAmount,
  type ReservationWithRelations,
} from '@/features/transactions';
import { toast } from 'sonner';
import { BookmarkCheck, CalendarClock, XCircle } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { getErrorMessage } from '@/lib/errors';
import { formatJewelryMaterial } from '@/features/jewelry';
import { validatePositiveAmount } from '@/lib/validation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const getDefaultExpirationDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const reservationStatusConfig = {
  active: { label: 'Active', className: 'bg-warning/10 text-warning border-warning/20' },
  cancelled: { label: 'Annulée', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  completed: { label: 'Terminée', className: 'bg-success/10 text-success border-success/20' },
  expired: { label: 'Expirée', className: 'bg-muted text-muted-foreground border-border' },
} as const;

const ReservationsPage = () => {
  const [clientId, setClientId] = useState('');
  const [jewelryId, setJewelryId] = useState('');
  const [deposit, setDeposit] = useState('');
  const [expiresAt, setExpiresAt] = useState(getDefaultExpirationDate);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ReservationWithRelations | null>(null);

  const { data: clients = [] } = useClients();
  const { data: jewelryList = [] } = useJewelry();
  const { data: reservations = [], isLoading: reservationsLoading } = useReservations();
  const addReservation = useAddReservation();
  const cancelReservation = useCancelReservation();

  const client = clients.find(c => c.id === clientId);
  const jewelry = jewelryList.find(j => j.id === jewelryId);
  const reservableJewelry = getReservableJewelry(jewelryList);
  const jewelryTotalPrice = jewelry ? getJewelryTotalPrice(jewelry) : 0;
  const remaining = jewelry ? calculateRemainingAmount(jewelryTotalPrice, Number(deposit || 0)) : 0;
  const depositError = deposit
    ? validatePositiveAmount(deposit, "Le montant de l'acompte", jewelry ? jewelryTotalPrice : undefined)
    : '';
  const activeReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === 'active'),
    [reservations],
  );

  const handleSubmit = async () => {
    if (!client || !jewelry || !deposit || depositError || !expiresAt) return;
    try {
      const reservation = await addReservation.mutateAsync({
        client_id: client.id,
        jewelry_id: jewelry.id,
        deposit_amount: Number(deposit),
        expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
      });

      setReceiptData(buildReservationReceipt(client, jewelry, reservation));
      setShowReceipt(true);
      toast.success('Réservation enregistrée');
      setClientId('');
      setJewelryId('');
      setDeposit('');
      setExpiresAt(getDefaultExpirationDate());
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancelReservation = async () => {
    if (!cancelTarget) return;

    try {
      await cancelReservation.mutateAsync(cancelTarget.id);
      toast.success('Réservation annulée et stock restauré');
      setCancelTarget(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="page-shell animate-fade-in">
      <div>
        <h1 className="page-title">Réservations</h1>
        <p className="text-sm text-muted-foreground">
          Réservez un bijou et retrouvez immédiatement les dossiers en cours.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-5 rounded-xl bg-card p-4 card-shadow sm:p-6">
        <div>
          <h2 className="font-semibold">Réserver un bijou</h2>
          <p className="text-sm text-muted-foreground">Le stock et le reste à payer sont calculés automatiquement.</p>
        </div>
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bijou</Label>
          <Select value={jewelryId} onValueChange={setJewelryId}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un bijou..." /></SelectTrigger>
            <SelectContent>
              {reservableJewelry.map(j => (
                <SelectItem key={j.id} value={j.id}>{j.name} — {formatJewelryMaterial(j.material_type)} — stock {j.quantity} — {formatCFA(getJewelryTotalPrice(j))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservation-deposit">Montant de l'acompte (FCFA)</Label>
          <Input
            id="reservation-deposit"
            type="number"
            min="1"
            max={jewelryTotalPrice || undefined}
            value={deposit}
            onChange={e => setDeposit(e.target.value)}
            placeholder="500000"
            className="h-12 text-lg font-semibold"
            aria-invalid={!!depositError}
            aria-describedby={depositError ? 'reservation-deposit-error' : undefined}
          />
          {depositError ? (
            <p id="reservation-deposit-error" className="text-sm font-medium text-destructive">
              {depositError}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservation-expiration">Date limite</Label>
          <Input
            id="reservation-expiration"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">La réservation devra être traitée avant cette date.</p>
        </div>

        {jewelry && deposit && (
          <div className="bg-muted rounded-xl p-5 space-y-2">
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Matiere:</span><span className="text-right font-semibold">{formatJewelryMaterial(jewelry.material_type)}</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Prix total:</span><span className="text-right font-semibold">{formatCFA(jewelryTotalPrice)}</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Prix unitaire:</span><span className="text-right font-semibold">{formatCFA(jewelry.price_per_gram)}</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Poids:</span><span className="text-right font-semibold">{jewelry.weight.toFixed(2)} g</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Stock restant avant reservation:</span><span className="text-right font-semibold">{jewelry.quantity}</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Acompte:</span><span className="text-right font-semibold text-success">{formatCFA(Number(deposit))}</span></div>
            <div className="flex flex-col gap-1 border-t border-border pt-3 text-lg font-bold sm:flex-row sm:justify-between"><span>Reste à payer:</span><span>{formatCFA(remaining)}</span></div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!clientId || !jewelryId || !deposit || !!depositError || !expiresAt || addReservation.isPending} className="w-full h-14 gold-gradient text-accent-foreground hover:opacity-90 font-bold text-lg">
          <BookmarkCheck className="h-5 w-5 mr-2" /> {addReservation.isPending ? 'Enregistrement...' : 'Confirmer la Réservation'}
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl bg-card card-shadow">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold">Suivi des réservations</h2>
            <p className="text-sm text-muted-foreground">{activeReservations.length} réservation(s) active(s)</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            Triées de la plus récente à la plus ancienne
          </div>
        </div>

        {reservationsLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chargement des réservations...</div>
        ) : reservations.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucune réservation enregistrée.</div>
        ) : (
          <div className="divide-y">
            {reservations.map((reservation) => {
              const status = reservationStatusConfig[reservation.status];
              return (
                <div key={reservation.id} className="grid gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_150px_140px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{reservation.jewelry?.name || 'Bijou'}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {reservation.clients?.name || 'Client'} · {reservation.document_number}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Acompte</p>
                    <p className="font-semibold">{formatCFA(reservation.deposit_amount)}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Date limite</p>
                    <p className="font-medium">
                      {reservation.expires_at
                        ? new Date(reservation.expires_at).toLocaleDateString('fr-FR')
                        : 'Non définie'}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    {reservation.status === 'active' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelTarget(reservation)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Annuler
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      </div>

      <ReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} data={receiptData} />

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              La réservation {cancelTarget?.document_number} sera annulée et une unité de stock sera immédiatement
              restaurée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver la réservation</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleCancelReservation()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelReservation.isPending ? 'Annulation...' : 'Annuler et restaurer le stock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReservationsPage;
