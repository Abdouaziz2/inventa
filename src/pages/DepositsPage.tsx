import { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useClients, useUpdateClientBalance, filterClients, type Client } from '@/features/clients';
import { useAddDeposit, buildDepositReceipt } from '@/features/transactions';
import { toast } from 'sonner';
import { formatCFA } from '@/lib/format';
import NumericKeypad from '@/components/NumericKeypad';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { getErrorMessage } from '@/lib/errors';
import { useProfileSettings } from '@/hooks/useProfileSettings';

const DepositsPage = () => {
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfileSettings();
  const addDeposit = useAddDeposit();
  const updateBalance = useUpdateClientBalance();
  const businessName = profile?.business_name || profile?.full_name || 'Ma boutique';

  useEffect(() => { searchRef.current?.focus(); }, []);

  const searchResults = clientSearch.length > 0 ? filterClients(clients, clientSearch) : [];

  const resetForm = () => {
    setSelectedClient(null);
    setAmount('');
    setNote('');
    setClientSearch('');
  };

  const handleValidate = async () => {
    if (!selectedClient || !amount) return;
    const amountNum = Number(amount);
    try {
      await addDeposit.mutateAsync({ client_id: selectedClient.id, amount: amountNum, note: note || null });
      await updateBalance.mutateAsync({ id: selectedClient.id, balance: selectedClient.balance + amountNum });

      setReceiptData(buildDepositReceipt(selectedClient, amountNum, note));
      setShowReceipt(true);
      toast.success(`Dépôt de ${formatCFA(amountNum)} enregistré pour ${selectedClient.name}`);
      resetForm();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmount(raw);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Dépôt Libre</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-card rounded-xl p-6 card-shadow space-y-5">
          <div className="space-y-2 relative">
            <Label>Client</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Nom, code ou numéro de téléphone..."
                value={selectedClient ? `${selectedClient.code} - ${selectedClient.name}` : clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                className="pl-9 h-12 text-base"
              />
            </div>
            {showResults && searchResults.length > 0 && !selectedClient && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                {searchResults.map(c => (
                  <button key={c.id} onClick={() => { setSelectedClient(c); setShowResults(false); }}
                    className="w-full px-4 py-3 text-left hover:bg-muted flex justify-between items-center text-sm transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{c.name.charAt(0)}</div>
                      <div>
                        <span className="font-medium">{c.name}</span>
                        <p className="text-xs text-muted-foreground">{c.code} · {c.phone}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-success">{formatCFA(c.balance)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Montant (FCFA)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={amount ? Number(amount).toLocaleString('fr-FR') : ''}
              onChange={handleAmountChange}
              placeholder="Tapez le montant..."
              className="text-2xl font-bold h-14 text-center"
            />
            <NumericKeypad value={amount} onChange={setAmount} />
          </div>

          <div className="space-y-2">
            <Label>Note (optionnel)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Acompte pour bague..." rows={2} />
          </div>

          <Button onClick={handleValidate} disabled={!selectedClient || !amount || addDeposit.isPending} className="w-full h-14 gold-gradient text-accent-foreground hover:opacity-90 font-bold text-lg">
            <CheckCircle className="h-5 w-5 mr-2" /> {addDeposit.isPending ? 'Enregistrement...' : 'Valider le Dépôt'}
          </Button>
        </div>

        <div className="lg:col-span-2 bg-card rounded-xl p-6 card-shadow border-2 border-dashed border-border">
          <h3 className="text-sm font-semibold mb-4">Aperçu du Reçu</h3>
          {selectedClient && amount ? (
            <div className="space-y-4 text-sm">
              <div className="text-center border-b border-border pb-3">
                <p className="font-display text-lg font-bold">{businessName}</p>
                <p className="text-xs text-muted-foreground">Reçu de Dépôt</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{selectedClient.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span className="font-mono">{selectedClient.code}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{new Date().toLocaleDateString('fr-FR')}</span></div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Montant:</span>
                  <span>{formatCFA(Number(amount))}</span>
                </div>
              </div>
              {note && <p className="text-xs text-muted-foreground italic">Note: {note}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sélectionnez un client et entrez un montant pour voir l'aperçu</p>
          )}
        </div>
      </div>

      <ReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} data={receiptData} />
    </div>
  );
};

export default DepositsPage;
