import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/features/clients';
import { useJewelry, getReservableJewelry, getJewelryTotalPrice } from '@/features/jewelry';
import { useAddReservation, buildReservationReceipt, calculateRemainingAmount } from '@/features/transactions';
import { toast } from 'sonner';
import { BookmarkCheck } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { getErrorMessage } from '@/lib/errors';

const ReservationsPage = () => {
  const [clientId, setClientId] = useState('');
  const [jewelryId, setJewelryId] = useState('');
  const [deposit, setDeposit] = useState('');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: jewelryList = [] } = useJewelry();
  const addReservation = useAddReservation();

  const client = clients.find(c => c.id === clientId);
  const jewelry = jewelryList.find(j => j.id === jewelryId);
  const reservableJewelry = getReservableJewelry(jewelryList);
  const jewelryTotalPrice = jewelry ? getJewelryTotalPrice(jewelry) : 0;
  const remaining = jewelry ? calculateRemainingAmount(jewelryTotalPrice, Number(deposit || 0)) : 0;

  const handleSubmit = async () => {
    if (!client || !jewelry || !deposit) return;
    try {
      const reservation = await addReservation.mutateAsync({
        client_id: client.id,
        jewelry_id: jewelry.id,
        deposit_amount: Number(deposit),
      });

      setReceiptData(buildReservationReceipt(client, jewelry, reservation));
      setShowReceipt(true);
      toast.success('Réservation enregistrée');
      setClientId(''); setJewelryId(''); setDeposit('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 animate-fade-in">
      <h1 className="page-title">Réservation de Bijou</h1>

      <div className="space-y-5 rounded-xl bg-card p-4 card-shadow sm:p-6">
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
                <SelectItem key={j.id} value={j.id}>{j.name} — {formatCFA(getJewelryTotalPrice(j))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Montant de l'acompte (FCFA)</Label>
          <Input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="500000" className="h-12 text-lg font-semibold" />
        </div>

        {jewelry && deposit && (
          <div className="bg-muted rounded-xl p-5 space-y-2">
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Prix total:</span><span className="text-right font-semibold">{formatCFA(jewelryTotalPrice)}</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Prix unitaire:</span><span className="text-right font-semibold">{formatCFA(jewelry.price_per_gram)}</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Poids:</span><span className="text-right font-semibold">{jewelry.weight.toFixed(2)} g</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Acompte:</span><span className="text-right font-semibold text-success">{formatCFA(Number(deposit))}</span></div>
            <div className="flex flex-col gap-1 border-t border-border pt-3 text-lg font-bold sm:flex-row sm:justify-between"><span>Reste à payer:</span><span>{formatCFA(remaining)}</span></div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!clientId || !jewelryId || !deposit || addReservation.isPending} className="w-full h-14 gold-gradient text-accent-foreground hover:opacity-90 font-bold text-lg">
          <BookmarkCheck className="h-5 w-5 mr-2" /> {addReservation.isPending ? 'Enregistrement...' : 'Confirmer la Réservation'}
        </Button>
      </div>

      <ReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} data={receiptData} />
    </div>
  );
};

export default ReservationsPage;
