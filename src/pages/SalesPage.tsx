import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddClient, useClients, useUpdateClientBalance } from '@/features/clients';
import { formatJewelryMaterial, useJewelry, getSellableJewelry } from '@/features/jewelry';
import { useAddSale, buildSaleReceipt, calculateBalanceUsed, calculateRemainingAmount } from '@/features/transactions';
import { toast } from 'sonner';
import { ShoppingBag, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { getErrorMessage } from '@/lib/errors';

const SalesPage = () => {
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [jewelryId, setJewelryId] = useState('');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: jewelryList = [] } = useJewelry();
  const addClient = useAddClient();
  const addSale = useAddSale();
  const updateBalance = useUpdateClientBalance();

  const existingClient = clients.find(c => c.id === clientId);
  const jewelry = jewelryList.find(j => j.id === jewelryId);
  const client = clientMode === 'existing' ? existingClient : null;

  const balanceUsed = client && jewelry ? calculateBalanceUsed(client.balance, jewelry.sale_price) : 0;
  const remaining = jewelry ? calculateRemainingAmount(jewelry.sale_price, balanceUsed) : 0;
  const sellableJewelry = getSellableJewelry(jewelryList);

  const resetForm = () => {
    setClientMode('existing');
    setClientId('');
    setNewClientName('');
    setNewClientPhone('');
    setJewelryId('');
  };

  const handleSubmit = async () => {
    if (!jewelry) return;
    try {
      const saleClient =
        clientMode === 'existing'
          ? existingClient
          : await addClient.mutateAsync({
              name: newClientName.trim(),
              phone: newClientPhone.trim(),
            });

      if (!saleClient) return;

      const saleBalanceUsed = calculateBalanceUsed(saleClient.balance, jewelry.sale_price);
      const saleRemaining = calculateRemainingAmount(jewelry.sale_price, saleBalanceUsed);

      await addSale.mutateAsync({
        client_id: saleClient.id,
        jewelry_id: jewelry.id,
        total_price: jewelry.sale_price,
        paid_from_balance: saleBalanceUsed,
        paid_cash: saleRemaining,
      });
      await updateBalance.mutateAsync({ id: saleClient.id, balance: saleClient.balance - saleBalanceUsed });

      setReceiptData(buildSaleReceipt(saleClient, jewelry, saleBalanceUsed, saleRemaining));
      setShowReceipt(true);
      toast.success('Vente enregistrée avec succès');
      resetForm();
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
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={clientMode === 'existing' ? 'default' : 'ghost'}
              className="h-10"
              onClick={() => setClientMode('existing')}
            >
              Client existant
            </Button>
            <Button
              type="button"
              variant={clientMode === 'new' ? 'default' : 'ghost'}
              className="h-10"
              onClick={() => setClientMode('new')}
            >
              Nouveau client
            </Button>
          </div>

          {clientMode === 'existing' ? (
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name} ({formatCFA(c.balance)})</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nom du client"
                className="h-12"
              />
              <Input
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Telephone du client"
                className="h-12"
                required
              />
            </div>
          )}

          {clientMode === 'existing' && client && (
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-xs text-muted-foreground">Solde disponible:</span>
              <span className={`text-sm font-bold ${client.balance > 0 ? 'text-success' : 'text-destructive'}`}>{formatCFA(client.balance)}</span>
            </div>
          )}
          {clientMode === 'new' && (
            <p className="px-1 text-xs text-muted-foreground">
              Le client sera cree automatiquement dans la liste clients au moment de la validation de la vente. Le telephone est obligatoire.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Bijou</Label>
          <Select value={jewelryId} onValueChange={setJewelryId}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un bijou..." /></SelectTrigger>
            <SelectContent>
              {sellableJewelry.map(j => (
                <SelectItem key={j.id} value={j.id}>{j.code} — {j.name} · {formatJewelryMaterial(j.material_type)} · Stock {j.quantity} · {formatCFA(j.sale_price)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {jewelry && (
            <div className="flex items-center gap-2 mt-1 px-1">
              <StatusBadge status={jewelry.status} />
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-semibold text-muted-foreground">{formatJewelryMaterial(jewelry.material_type)}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-semibold text-muted-foreground">Stock {jewelry.quantity}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-sm font-bold">{formatCFA(jewelry.sale_price)}</span>
            </div>
          )}
        </div>

        {jewelry && (
          <div className="bg-muted rounded-xl p-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Prix du bijou:</span><span className="font-semibold">{formatCFA(jewelry.sale_price)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Solde client:</span><span className="font-semibold">{formatCFA(clientMode === 'existing' && client ? client.balance : 0)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payé via solde:</span><span className="font-semibold text-success">-{formatCFA(clientMode === 'existing' ? balanceUsed : 0)}</span></div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-3">
              <span>Reste à régler:</span>
              <span className="flex items-center gap-2">
                {(clientMode === 'existing' ? remaining : jewelry.sale_price) === 0 ? (
                  <><CheckCircle2 className="h-5 w-5 text-success" /><span className="text-success">{formatCFA(clientMode === 'existing' ? remaining : jewelry.sale_price)}</span></>
                ) : (
                  <><AlertCircle className="h-5 w-5 text-warning" /><span>{formatCFA(clientMode === 'existing' ? remaining : jewelry.sale_price)}</span></>
                )}
              </span>
            </div>
            {clientMode === 'new' && (
              <p className="text-xs text-muted-foreground">
                Vente comptant: le client sera ajoute avec un solde initial de 0 FCFA.
              </p>
            )}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={
            !jewelryId ||
            addSale.isPending ||
            addClient.isPending ||
            (clientMode === 'existing' ? !clientId : !newClientName.trim() || !newClientPhone.trim())
          }
          className="w-full h-14 gold-gradient text-accent-foreground hover:opacity-90 font-bold text-lg"
        >
          <ShoppingBag className="h-5 w-5 mr-2" /> {addSale.isPending || addClient.isPending ? 'Enregistrement...' : 'Valider la Vente'}
        </Button>
      </div>

      <ReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} data={receiptData} />
    </div>
  );
};

export default SalesPage;
