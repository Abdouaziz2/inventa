import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddClient, useClients } from '@/features/clients';
import { formatJewelryMaterial, getJewelryTotalPrice, getSellableJewelry, useJewelry, type Jewelry } from '@/features/jewelry';
import { useAddSale, buildSaleReceipt } from '@/features/transactions';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, CirclePlus, ReceiptText, ShoppingBag, Trash2 } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { getErrorMessage } from '@/lib/errors';
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
import { validatePositiveAmount } from '@/lib/validation';

type CartLine = {
  jewelry: Jewelry;
  quantity: number;
};

const PAYMENT_METHODS = ['Espèces', 'Mobile Money', 'Carte', 'Virement bancaire', 'Chèque', 'Mixte', 'Crédit client', 'Autre'];
const parseMoney = (value: string) => Number(value.replace(/\D/g, '') || 0);
const formatMoneyInput = (value: string) => (value ? Number(value).toLocaleString('fr-FR') : '');

const SalesPage = () => {
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [selectedJewelryId, setSelectedJewelryId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [useBalance, setUseBalance] = useState(true);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [creditApproved, setCreditApproved] = useState(false);
  const [showCreditConfirmation, setShowCreditConfirmation] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: jewelryList = [] } = useJewelry();
  const addClient = useAddClient();
  const addSale = useAddSale();

  const existingClient = clients.find((client) => client.id === clientId);
  const client = clientMode === 'existing' ? existingClient : null;
  const sellableJewelry = getSellableJewelry(jewelryList);
  const selectedJewelry = sellableJewelry.find((item) => item.id === selectedJewelryId);

  const totalInvoice = useMemo(
    () =>
      cart.reduce((sum, line) => {
        return sum + getJewelryTotalPrice(line.jewelry) * line.quantity;
      }, 0),
    [cart],
  );

  const balanceUsed = client && useBalance ? Math.min(client.balance, totalInvoice) : 0;
  const amountReceived = parseMoney(paidAmount);
  const paidTotal = balanceUsed + amountReceived;
  const remaining = Math.max(0, totalInvoice - paidTotal);
  const overpaid = Math.max(0, paidTotal - totalInvoice);
  const changeAmount = overpaid;
  const paidAmountError = paidAmount ? validatePositiveAmount(paidAmount, 'Le montant remis') : '';

  const resetForm = () => {
    setClientMode('existing');
    setClientId('');
    setNewClientName('');
    setNewClientPhone('');
    setSelectedJewelryId('');
    setSelectedQuantity('1');
    setCart([]);
    setUseBalance(true);
    setPaidAmount('');
    setPaymentMethod('Espèces');
    setCreditApproved(false);
  };

  const handleMoneyChange = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value.replace(/\D/g, ''));
  };

  const handleAddToCart = () => {
    if (!selectedJewelry) return;
    const quantity = Math.max(1, Number(selectedQuantity || 1));

    if (quantity > selectedJewelry.quantity) {
      toast.error('Quantite superieure au stock disponible.');
      return;
    }

    setCart((current) => {
      const existing = current.find((line) => line.jewelry.id === selectedJewelry.id);
      if (existing) {
        const nextQuantity = existing.quantity + quantity;
        if (nextQuantity > selectedJewelry.quantity) {
          toast.error('Quantite superieure au stock disponible.');
          return current;
        }

        return current.map((line) =>
          line.jewelry.id === selectedJewelry.id ? { ...line, quantity: nextQuantity } : line,
        );
      }

      return [...current, { jewelry: selectedJewelry, quantity }];
    });
    setSelectedJewelryId('');
    setSelectedQuantity('1');
  };

  const updateLineQuantity = (jewelryId: string, quantity: number) => {
    setCart((current) =>
      current.map((line) => {
        if (line.jewelry.id !== jewelryId) return line;
        const nextQuantity = Math.min(Math.max(1, quantity), line.jewelry.quantity);
        return { ...line, quantity: nextQuantity };
      }),
    );
  };

  const removeLine = (jewelryId: string) => {
    setCart((current) => current.filter((line) => line.jewelry.id !== jewelryId));
  };

  const completeSale = async () => {
    if (cart.length === 0) return;

    try {
      const saleClient =
        clientMode === 'existing'
          ? existingClient
          : await addClient.mutateAsync({
              name: newClientName.trim(),
              phone: newClientPhone.trim(),
            });

      if (!saleClient) return;

      const sale = await addSale.mutateAsync({
        client_id: saleClient.id,
        items: cart.map((line) => ({
          jewelry_id: line.jewelry.id,
          quantity: line.quantity,
        })),
        use_balance: clientMode === 'existing' && useBalance,
        paid_amount: amountReceived,
        payment_method: paymentMethod,
      });

      setReceiptData(buildSaleReceipt(saleClient, cart[0].jewelry, sale));
      setShowReceipt(true);
      toast.success('Vente enregistrée avec succès');
      resetForm();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSubmit = () => {
    if (remaining > 0) {
      setShowCreditConfirmation(true);
      return;
    }

    void completeSale();
  };

  const canSubmit =
    cart.length > 0 &&
    !addSale.isPending &&
    !addClient.isPending &&
    !paidAmountError &&
    (remaining === 0 || creditApproved) &&
    (clientMode === 'existing' ? !!clientId : !!newClientName.trim() && !!newClientPhone.trim());

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Nouvelle vente</h1>
          <p className="text-sm text-muted-foreground">Sélectionnez le client, ajoutez les bijoux et encaissez.</p>
        </div>
        <div className="sticky top-[84px] z-20 rounded-xl border bg-card px-4 py-3 shadow-sm sm:static">
          <p className="text-xs text-muted-foreground">Total facture</p>
          <p className="text-2xl font-bold">{formatCFA(totalInvoice)}</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <div className="space-y-6">
          <section className="space-y-5 rounded-xl bg-card p-4 card-shadow sm:p-6">
            <div className="space-y-2">
              <Label>Client</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg bg-muted p-1 sm:grid-cols-2">
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
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Sélectionner un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} - {item.name} ({formatCFA(item.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={newClientName}
                    onChange={(event) => setNewClientName(event.target.value)}
                    placeholder="Nom du client"
                    className="h-12"
                  />
                  <Input
                    value={newClientPhone}
                    onChange={(event) => setNewClientPhone(event.target.value)}
                    placeholder="Telephone du client"
                    className="h-12"
                    required
                  />
                </div>
              )}

              {clientMode === 'existing' && client ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Solde disponible</p>
                    <p className={`text-sm font-bold ${client.balance > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                      {formatCFA(client.balance)}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={useBalance}
                      onChange={(event) => setUseBalance(event.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Utiliser le solde
                  </label>
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 rounded-xl bg-card p-4 card-shadow sm:p-6">
            <div>
              <h2 className="text-base font-semibold">Ajouter un bijou</h2>
              <p className="text-sm text-muted-foreground">Seuls les bijoux disponibles et en stock apparaissent.</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_auto]">
              <Select value={selectedJewelryId} onValueChange={setSelectedJewelryId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Sélectionner un bijou disponible..." />
                </SelectTrigger>
                <SelectContent>
                  {sellableJewelry.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code} - {item.name} - Stock {item.quantity} - {formatCFA(getJewelryTotalPrice(item))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(event) => setSelectedQuantity(event.target.value)}
                className="h-12"
                placeholder="Qté"
              />
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedJewelry}
                className="h-12 gold-gradient text-accent-foreground hover:opacity-90"
              >
                <CirclePlus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>

            {selectedJewelry ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <StatusBadge status={selectedJewelry.status} />
                <span>{formatJewelryMaterial(selectedJewelry.material_type)}</span>
                <span>Poids {selectedJewelry.weight.toFixed(2)} g</span>
                <span>Prix/g {formatCFA(selectedJewelry.price_per_gram)}</span>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border">
              {cart.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucun bijou dans le panier.
                </div>
              ) : (
                <div className="divide-y">
                  {cart.map((line) => {
                    const unitTotal = getJewelryTotalPrice(line.jewelry);
                    const lineTotal = unitTotal * line.quantity;

                    return (
                      <div
                        key={line.jewelry.id}
                        className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_112px_140px_44px] md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold">{line.jewelry.name}</p>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {line.jewelry.code}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {line.jewelry.weight.toFixed(2)} g x {formatCFA(line.jewelry.price_per_gram)} / g
                          </p>
                        </div>
                        <Input
                          type="number"
                          min="1"
                          max={line.jewelry.quantity}
                          value={line.quantity}
                          onChange={(event) => updateLineQuantity(line.jewelry.id, Number(event.target.value || 1))}
                          className="h-10"
                        />
                        <div className="flex justify-between gap-3 text-sm md:block md:text-right">
                          <span className="text-muted-foreground md:hidden">Total ligne</span>
                          <span className="font-semibold">{formatCFA(lineTotal)}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.jewelry.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="space-y-4 rounded-xl bg-card p-4 card-shadow sm:p-6">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">Paiement</h2>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Montant remis par le client</Label>
                <Input
                  id="paid-amount"
                  inputMode="numeric"
                  value={formatMoneyInput(paidAmount)}
                  onChange={handleMoneyChange(setPaidAmount)}
                  aria-invalid={!!paidAmountError}
                  aria-describedby={paidAmountError ? 'paid-amount-error' : undefined}
                />
                {paidAmountError ? (
                  <p id="paid-amount-error" className="text-sm font-medium text-destructive">
                    {paidAmountError}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-muted p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Total facture</span>
                <span className="font-semibold">{formatCFA(totalInvoice)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Solde utilisé</span>
                <span className="font-semibold">{formatCFA(balanceUsed)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Montant remis</span>
                <span className="font-semibold">{formatCFA(amountReceived)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Montant payé</span>
                <span className="font-semibold">{formatCFA(paidTotal)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-bold">
                <span>Reste à payer</span>
                <span className={remaining > 0 ? 'text-warning' : 'text-success'}>{formatCFA(remaining)}</span>
              </div>
              {overpaid > 0 ? (
                <>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Monnaie à rendre</span>
                    <span className="font-semibold">{formatCFA(changeAmount)}</span>
                  </div>
                </>
              ) : null}
            </div>

            {remaining > 0 ? (
              <label className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={creditApproved}
                  onChange={(event) => setCreditApproved(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  <strong className="block">Autoriser une vente à crédit</strong>
                  Je confirme que {formatCFA(remaining)} restera dû par le client après cette vente.
                </span>
              </label>
            ) : null}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-14 w-full gold-gradient text-base font-bold text-accent-foreground hover:opacity-90 sm:text-lg"
            >
              {addSale.isPending || addClient.isPending ? (
                'Enregistrement...'
              ) : remaining === 0 ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Encaisser {formatCFA(totalInvoice)}
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-5 w-5" /> Enregistrer avec {formatCFA(remaining)} à payer
                </>
              )}
            </Button>
          </section>

          <section className="rounded-xl border border-dashed bg-card p-4 text-sm shadow-sm sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Résumé panier</h2>
            </div>
            <div className="space-y-2">
              {cart.length === 0 ? (
                <p className="text-muted-foreground">Ajoutez des bijoux pour préparer la facture.</p>
              ) : (
                cart.map((line) => (
                  <div key={line.jewelry.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {line.quantity} x {line.jewelry.name}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {formatCFA(getJewelryTotalPrice(line.jewelry) * line.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <ReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} data={receiptData} />

      <AlertDialog open={showCreditConfirmation} onOpenChange={setShowCreditConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la vente à crédit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette opération créera une créance de {formatCFA(remaining)} pour le client. Vérifiez le montant avant
              de continuer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revenir au paiement</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void completeSale()}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Confirmer la créance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SalesPage;
