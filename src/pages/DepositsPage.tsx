import { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useClients, filterClients, type Client } from '@/features/clients';
import { useAddDeposit, buildDepositReceipt } from '@/features/transactions';
import { toast } from 'sonner';
import { formatCFA } from '@/lib/format';
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
      const deposit = await addDeposit.mutateAsync({
        client_id: selectedClient.id,
        amount: amountNum,
        note: note || null,
      });

      setReceiptData(buildDepositReceipt(selectedClient, deposit, selectedClient.balance));
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
    <div className="mx-auto w-full max-w-5xl space-y-6 animate-fade-in">
      <h1 className="page-title">Dépôt Libre</h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-5 rounded-xl bg-card p-4 card-shadow sm:p-6 xl:col-span-3">
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
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{c.name.charAt(0)}</div>
                      <div className="min-w-0">
                        <span className="block truncate font-medium">{c.name}</span>
                        <p className="truncate text-xs text-muted-foreground">{c.code} · {c.phone}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-success">{formatCFA(c.balance)}</span>
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
          </div>

          <div className="space-y-2">
            <Label>Note (optionnel)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Acompte pour bague..." rows={2} />
          </div>

          <Button onClick={handleValidate} disabled={!selectedClient || !amount || addDeposit.isPending} className="w-full h-14 gold-gradient text-accent-foreground hover:opacity-90 font-bold text-lg">
            <CheckCircle className="h-5 w-5 mr-2" /> {addDeposit.isPending ? 'Enregistrement...' : 'Valider le Dépôt'}
          </Button>
        </div>

        <div className="rounded-xl border-2 border-dashed border-border bg-card p-4 card-shadow sm:p-6 xl:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Aperçu du Reçu</h3>
          {selectedClient && amount ? (
            <div className="space-y-4 text-sm">
              <div className="text-center border-b border-border pb-3">
                <p className="font-display text-lg font-bold">{businessName}</p>
                <p className="text-xs text-muted-foreground">Reçu de Dépôt</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Client:</span><span className="text-right font-medium">{selectedClient.name}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Code:</span><span className="font-mono">{selectedClient.code}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Date:</span><span>{new Date().toLocaleDateString('fr-FR')}</span></div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex flex-col gap-1 text-lg font-bold sm:flex-row sm:justify-between">
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
