import { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle, ClipboardCheck, ChevronDown, X } from 'lucide-react';
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

const QUICK_AMOUNTS = [10_000, 25_000, 50_000, 100_000];
const HIGH_AMOUNT_THRESHOLD = 1_000_000;

const DepositsPage = () => {
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showHighAmountConfirmation, setShowHighAmountConfirmation] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfileSettings();
  const addDeposit = useAddDeposit();
  const businessName = profile?.business_name || profile?.full_name || 'Ma boutique';
  const amountError = amount ? validatePositiveAmount(amount, 'Le montant') : '';
  const amountNumber = Number(amount || 0);
  const newBalance = selectedClient ? selectedClient.balance + amountNumber : 0;
 
  useEffect(() => { searchRef.current?.focus(); }, []);

  const searchResults = clientSearch.length > 0 ? filterClients(clients, clientSearch) : [];

  const resetForm = () => {
    setSelectedClient(null);
    setAmount('');
    setNote('');
    setClientSearch('');
  };

  const saveDeposit = async () => {
    if (!selectedClient || !amount || amountError) return;
    try {
      const deposit = await addDeposit.mutateAsync({
        client_id: selectedClient.id,
        amount: amountNumber,
        note: note || null,
      });

      setReceiptData(buildDepositReceipt(selectedClient, deposit, selectedClient.balance));
      setShowReceipt(true);
      toast.success(`Dépôt de ${formatCFA(amountNumber)} enregistré pour ${selectedClient.name}`);
      resetForm();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleValidate = () => {
    if (!selectedClient || !amount || amountError) return;

    if (amountNumber >= HIGH_AMOUNT_THRESHOLD) {
      setShowHighAmountConfirmation(true);
      return;
    }

    void saveDeposit();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmount(raw);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Dépôt client</h1>
        <p className="text-sm text-muted-foreground">
          Ajoutez de l'argent au compte d'un client en trois étapes simples.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-5 rounded-xl bg-card p-4 card-shadow sm:p-6 xl:col-span-3">
          <div className="relative space-y-2">
            <Label htmlFor="deposit-client-search" className="text-base">Client</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="deposit-client-search"
                ref={searchRef}
                placeholder="Nom, code ou numéro de téléphone..."
                value={selectedClient ? `${selectedClient.code} - ${selectedClient.name}` : clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                className="pl-9 h-12 text-base"
              />
              {selectedClient ? (
                <button
                  type="button"
                  aria-label="Changer de client"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientSearch('');
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
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
            {selectedClient ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-success/20 bg-success/5 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{selectedClient.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedClient.code} · {selectedClient.phone}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">Solde actuel</p>
                  <p className="font-bold">{formatCFA(selectedClient.balance)}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit-amount" className="text-base">Montant à ajouter</Label>
            <Input
              id="deposit-amount"
              type="text"
              inputMode="numeric"
              value={amount ? Number(amount).toLocaleString('fr-FR') : ''}
              onChange={handleAmountChange}
              placeholder="Tapez le montant..."
              className="text-2xl font-bold h-14 text-center"
              aria-invalid={!!amountError}
              aria-describedby={amountError ? 'deposit-amount-error' : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && selectedClient && amount && !amountError) {
                  event.preventDefault();
                  handleValidate();
                }
              }}
            />
            {amountError ? (
              <p id="deposit-amount-error" className="text-sm font-medium text-destructive">
                {amountError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Saisissez un montant strictement supérieur à zéro.</p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant={amountNumber === quickAmount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(String(quickAmount))}
                >
                  {quickAmount.toLocaleString('fr-FR')}
                </Button>
              ))}
            </div>
          </div>

          <details className="group rounded-xl border bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              Plus d'options
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-2 border-t px-4 py-3">
              <Label htmlFor="deposit-note">Note facultative</Label>
              <Textarea
                id="deposit-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Exemple : acompte pour une bague"
                rows={2}
              />
            </div>
          </details>

          <Button onClick={handleValidate} disabled={!selectedClient || !amount || !!amountError || addDeposit.isPending} className="w-full h-14 gold-gradient text-accent-foreground hover:opacity-90 font-bold text-lg">
            <CheckCircle className="h-5 w-5 mr-2" />
            {addDeposit.isPending
              ? 'Enregistrement...'
              : selectedClient && amountNumber > 0
                ? `Confirmer le dépôt de ${formatCFA(amountNumber)}`
                : 'Confirmer le dépôt'}
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-4 card-shadow sm:p-6 xl:col-span-2">
          <div className="mb-5">
            <h2 className="font-semibold">Récapitulatif</h2>
            <p className="text-sm text-muted-foreground">Le solde est calculé avant l'enregistrement.</p>
          </div>
          {selectedClient && amount ? (
            <div className="space-y-5 text-sm">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">Client sélectionné</p>
                <p className="mt-1 font-semibold">{selectedClient.name}</p>
                <p className="text-xs text-muted-foreground">{selectedClient.code}</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Solde actuel</span>
                  <span className="font-semibold">{formatCFA(selectedClient.balance)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Dépôt ajouté</span>
                  <span className="font-semibold text-success">+{formatCFA(amountNumber)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t pt-3 text-base">
                  <span className="font-semibold">Nouveau solde</span>
                  <span className="text-lg font-bold">{formatCFA(newBalance)}</span>
                </div>
              </div>
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Un reçu de {businessName} sera proposé après la confirmation.
              </div>
              {note ? <p className="text-xs text-muted-foreground italic">Note : {note}</p> : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Le récapitulatif apparaîtra ici</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choisissez un client puis saisissez le montant.
              </p>
            </div>
          )}
        </div>
      </div>

      <ReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} data={receiptData} />

      <AlertDialog open={showHighAmountConfirmation} onOpenChange={setShowHighAmountConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer ce dépôt important ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez ajouter {formatCFA(amountNumber)} au compte de {selectedClient?.name}. Son nouveau solde sera
              de {formatCFA(newBalance)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vérifier le montant</AlertDialogCancel>
            <AlertDialogAction onClick={() => void saveDeposit()}>
              Confirmer {formatCFA(amountNumber)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepositsPage;
