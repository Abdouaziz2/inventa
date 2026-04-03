import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients, useJewelry, useAddSale, useUpdateClientBalance, useUpdateJewelryStatus } from '@/hooks/useDatabase';
import { toast } from 'sonner';
import { ShoppingBag, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { getErrorMessage } from '@/lib/errors';

const SalesPage = () => {
  const [clientId, setClientId] = useState('');
  const [jewelryId, setJewelryId] = useState('');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: jewelryList = [] } = useJewelry();
  const addSale = useAddSale();
  const updateBalance = useUpdateClientBalance();
  const updateStatus = useUpdateJewelryStatus();

  const client = clients.find(c => c.id === clientId);
  const jewelry = jewelryList.find(j => j.id === jewelryId);

  const balanceUsed = client && jewelry ? Math.min(client.balance, jewelry.sale_price) : 0;
  const remaining = jewelry ? jewelry.sale_price - balanceUsed : 0;

  const handleSubmit = async () => {
    if (!client || !jewelry) return;
    try {
      await addSale.mutateAsync({
        client_id: client.id,
        jewelry_id: jewelry.id,
        total_price: jewelry.sale_price,
        paid_from_balance: balanceUsed,
        paid_cash: remaining,
      });
      await updateBalance.mutateAsync({ id: client.id, balance: client.balance - balanceUsed });
      await updateStatus.mutateAsync({ id: jewelry.id, status: 'sold' });

      const receipt: ReceiptData = {
        type: 'sale',
        clientName: client.name,
        clientCode: client.code,
        amount: jewelry.sale_price,
        date: new Date().toLocaleDateString('fr-FR'),
        details: [
          { label: 'Bijou', value: jewelry.name },
          { label: 'Poids', value: `${jewelry.weight}g` },
          ...(jewelry.price_per_gram > 0 ? [{ label: 'Prix/gramme', value: formatCFA(jewelry.price_per_gram) }] : []),
          { label: 'Payé via solde', value: formatCFA(balanceUsed) },
          { label: 'Reste payé en espèces', value: formatCFA(remaining) },
        ],
      };
      setReceiptData(receipt);
      setShowReceipt(true);
      toast.success('Vente enregistrée avec succès');
      setClientId(''); setJewelryId('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Nouvelle Vente</h1>

      <div className="bg-card rounded-xl p-6 card-shadow space-y-5">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name} ({formatCFA(c.balance)})</SelectItem>)}
            </SelectContent>
          </Select>
          {client && (
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-xs text-muted-foreground">Solde disponible:</span>
              <span className={`text-sm font-bold ${client.balance > 0 ? 'text-success' : 'text-destructive'}`}>{formatCFA(client.balance)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Bijou</Label>
          <Select value={jewelryId} onValueChange={setJewelryId}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un bijou..." /></SelectTrigger>
            <SelectContent>
              {jewelryList.filter(j => j.status === 'available' || j.status === 'reserved').map(j => (
                <SelectItem key={j.id} value={j.id}>{j.name} — {formatCFA(j.sale_price)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {jewelry && (
            <div className="flex items-center gap-2 mt-1 px-1">
              <StatusBadge status={jewelry.status} />
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-sm font-bold">{formatCFA(jewelry.sale_price)}</span>
            </div>
          )}
        </div>

        {client && jewelry && (
          <div className="bg-muted rounded-xl p-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Prix du bijou:</span><span className="font-semibold">{formatCFA(jewelry.sale_price)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Solde client:</span><span className="font-semibold">{formatCFA(client.balance)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payé via solde:</span><span className="font-semibold text-success">-{formatCFA(balanceUsed)}</span></div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-3">
              <span>Reste à régler:</span>
              <span className="flex items-center gap-2">
                {remaining === 0 ? (
                  <><CheckCircle2 className="h-5 w-5 text-success" /><span className="text-success">{formatCFA(remaining)}</span></>
                ) : (
                  <><AlertCircle className="h-5 w-5 text-warning" /><span>{formatCFA(remaining)}</span></>
                )}
              </span>
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!clientId || !jewelryId || addSale.isPending} className="w-full h-14 gold-gradient text-accent-foreground hover:opacity-90 font-bold text-lg">
          <ShoppingBag className="h-5 w-5 mr-2" /> {addSale.isPending ? 'Enregistrement...' : 'Valider la Vente'}
        </Button>
      </div>

      <ReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} data={receiptData} />
    </div>
  );
};

export default SalesPage;
