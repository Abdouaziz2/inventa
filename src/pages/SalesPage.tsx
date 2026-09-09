import { useMemo, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import ClientCombobox from '@/components/ClientCombobox';
import { useAddClient, useClients } from '@/features/clients';
import { getSellableJewelry, useJewelry, type Jewelry } from '@/features/jewelry';
import { useAddSale, buildSaleReceipt } from '@/features/transactions';
import { toast } from 'sonner';
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown, CirclePlus, ReceiptText, ShoppingCart, Trash2 } from 'lucide-react';
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
import { useBusiness } from '@/hooks/useBusiness';
import { formatBusinessAttribute } from '@/lib/business';

type CartLine = {
  id: string;
  jewelry: Jewelry;
  quantity: number;
  weight: number;
  unitPrice: number;
};

const PAYMENT_METHODS = ['Espèces', 'Mobile Money', 'Carte', 'Virement bancaire', 'Chèque', 'Mixte', 'Crédit client', 'Autre'];
const parseMoney = (value: string) => Number(value.replace(/\D/g, '') || 0);
const formatMoneyInput = (value: string) => (value ? Number(value).toLocaleString('fr-FR') : '');

const SalesPage = () => {
  const { type: businessType } = useBusiness();
  const isJewelry = businessType === 'jewelry';
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [selectedJewelryId, setSelectedJewelryId] = useState('');
  const [jewelryPickerOpen, setJewelryPickerOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [selectedUnitPrice, setSelectedUnitPrice] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [useBalance, setUseBalance] = useState(true);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [creditApproved, setCreditApproved] = useState(false);
  const [showCreditConfirmation, setShowCreditConfirmation] = useState(false);
  const checkoutRef = useRef<HTMLElement>(null);

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
        return sum + line.weight * line.unitPrice * line.quantity;
      }, 0),
    [cart],
  );
  const draftLineTotal =
    Math.max(0, Number(selectedWeight || 0)) *
    Math.max(0, Number(selectedUnitPrice || 0)) *
    Math.max(1, Number(selectedQuantity || 1));

  const balanceUsed = client && useBalance ? Math.min(client.balance, totalInvoice) : 0;
  const amountReceived = parseMoney(paidAmount);
  const paidTotal = balanceUsed + amountReceived;
  const remaining = Math.max(0, totalInvoice - paidTotal);
  const overpaid = Math.max(0, paidTotal - totalInvoice);
  const changeAmount = overpaid;
  const externalPaymentApplied = Math.min(
    amountReceived,
    Math.max(0, totalInvoice - balanceUsed),
  );
  const paidAmountError = paidAmount ? validatePositiveAmount(paidAmount, 'Le montant remis') : '';
  const cartIsValid = cart.every(
    (line) =>
      line.quantity >= 1 &&
      line.quantity <= line.jewelry.quantity &&
      line.weight > 0 &&
      line.unitPrice > 0,
  );

  const resetForm = () => {
    setClientMode('existing');
    setClientId('');
    setNewClientName('');
    setNewClientPhone('');
    setSelectedJewelryId('');
    setSelectedQuantity('1');
    setSelectedWeight('');
    setSelectedUnitPrice('');
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
    const weight = Number(selectedWeight);
    const unitPrice = Number(selectedUnitPrice);

    if (quantity > selectedJewelry.quantity) {
      toast.error('Quantité supérieure au stock disponible.');
      return;
    }
    if (weight <= 0 || unitPrice <= 0) {
      toast.error(isJewelry ? 'Saisissez le poids réel et le prix par gramme.' : 'Saisissez le prix unitaire.');
      return;
    }

    setCart((current) => {
      const quantityAlreadyAdded = current
        .filter((line) => line.jewelry.id === selectedJewelry.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      if (quantityAlreadyAdded + quantity > selectedJewelry.quantity) {
        toast.error('Quantité supérieure au stock disponible.');
        return current;
      }

      return [...current, {
        id: `${selectedJewelry.id}-${Date.now()}`,
        jewelry: selectedJewelry,
        quantity,
        weight,
        unitPrice,
      }];
    });
    setSelectedJewelryId('');
    setSelectedQuantity('1');
    setSelectedWeight('');
    setSelectedUnitPrice('');
  };

  const updateLineQuantity = (lineId: string, quantity: number) => {
    setCart((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;
        const otherQuantity = current
          .filter((candidate) => candidate.id !== lineId && candidate.jewelry.id === line.jewelry.id)
          .reduce((sum, candidate) => sum + candidate.quantity, 0);
        const nextQuantity = Math.min(Math.max(1, quantity), line.jewelry.quantity - otherQuantity);
        return { ...line, quantity: nextQuantity };
      }),
    );
  };

  const updateLineValue = (lineId: string, field: 'weight' | 'unitPrice', value: number) => {
    setCart((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, [field]: Math.max(0, value) } : line,
      ),
    );
  };

  const removeLine = (lineId: string) => {
    setCart((current) => current.filter((line) => line.id !== lineId));
  };

  const completeSale = async () => {
    if (cart.length === 0) return;

    try {
      const saleClient =
        clientMode === 'existing'
          ? existingClient
          : clientMode === 'new'
            ? await addClient.mutateAsync({
              name: newClientName.trim(),
              phone: newClientPhone.trim(),
            })
            : null;

      const sale = await addSale.mutateAsync({
        client_id: saleClient?.id ?? null,
        items: cart.map((line) => ({
          jewelry_id: line.jewelry.id,
          quantity: line.quantity,
          weight: line.weight,
          unit_price: line.unitPrice,
        })),
        use_balance: clientMode === 'existing' && !!existingClient && useBalance,
        paid_amount: externalPaymentApplied,
        payment_method: paymentMethod,
      });

      setReceiptData(
        buildSaleReceipt(saleClient ?? {
          id: 'walk-in',
          code: 'COMPTOIR',
          name: 'Client comptoir',
          phone: '',
          balance: 0,
          created_at: sale.created_at,
        }, cart[0].jewelry, {
          ...sale,
          amount_received: amountReceived,
          change_amount: changeAmount,
        }),
      );
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
    cartIsValid &&
    !addSale.isPending &&
    !addClient.isPending &&
    !paidAmountError &&
    (remaining === 0 || creditApproved) &&
    (clientMode === 'existing' || !!newClientName.trim() && !!newClientPhone.trim());

  const hasIdentifiedClient = clientMode === 'new' || !!existingClient;

  return (
    <div className="page-shell animate-fade-in pb-20 lg:pb-0">
      <div>
        <div>
          <h1 className="page-title">Nouvelle vente</h1>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="space-y-6">
          <section className="space-y-5 rounded-xl bg-card p-4 card-shadow sm:p-6">
            <div className="space-y-2">
              <div>
                <h2 className="font-semibold">Client facultatif</h2>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <Button
                  type="button"
                  variant={clientMode === 'existing' ? 'default' : 'ghost'}
                  className="h-10"
                  onClick={() => setClientMode('existing')}
                >
                  Rechercher
                </Button>
                <Button
                  type="button"
                  variant={clientMode === 'new' ? 'default' : 'ghost'}
                  className="h-10"
                  onClick={() => setClientMode('new')}
                >
                  Créer un client
                </Button>
              </div>

              {clientMode === 'existing' ? (
                <ClientCombobox clients={clients} value={clientId} onValueChange={setClientId} />
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
                    placeholder="Téléphone du client"
                    className="h-12"
                    required
                  />
                </div>
              )}

              {!hasIdentifiedClient ? (
                <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Client comptoir actif
                </div>
              ) : null}

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
              <h2 className="text-base font-semibold">Ajouter des produits</h2>
            </div>

            <div className={`grid gap-3 md:grid-cols-2 ${isJewelry ? 'xl:grid-cols-[minmax(200px,1fr)_110px_140px_110px]' : 'xl:grid-cols-[minmax(240px,1fr)_160px_110px]'}`}>
              <Popover open={jewelryPickerOpen} onOpenChange={setJewelryPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={jewelryPickerOpen}
                    className="h-12 w-full justify-between px-3 font-normal"
                  >
                    <span className={selectedJewelry ? 'truncate' : 'truncate text-muted-foreground'}>
                      {selectedJewelry?.name ?? 'Rechercher un produit...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Nom ou référence..." />
                    <CommandList>
                      <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                  {sellableJewelry.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.name} ${item.code}`}
                          onSelect={() => {
                            setSelectedJewelryId(item.id);
                            setSelectedWeight(isJewelry ? String(item.weight || '') : '1');
                            setSelectedUnitPrice(String(isJewelry ? item.price_per_gram || (item.weight > 0 ? item.sale_price / item.weight : 0) : item.sale_price || ''));
                            setJewelryPickerOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedJewelryId === item.id ? 'opacity-100' : 'opacity-0'}`} />
                          <span className="truncate">{item.name}</span>
                        </CommandItem>
                  ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {isJewelry ? (
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={selectedWeight}
                  onChange={(event) => setSelectedWeight(event.target.value)}
                  className="h-12"
                  placeholder="Poids (g)"
                />
              ) : null}
              <Input
                type="number"
                min="1"
                value={selectedUnitPrice}
                onChange={(event) => setSelectedUnitPrice(event.target.value)}
                className="h-12"
                placeholder={isJewelry ? 'Prix / gramme' : 'Prix unitaire'}
              />
              <Input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(event) => setSelectedQuantity(event.target.value)}
                className="h-12"
                placeholder="Qté"
              />
            </div>

            <div className="flex justify-end">
              {draftLineTotal > 0 ? (
                <div className="mr-auto rounded-lg bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Total de cette ligne</p>
                  <p className="font-bold">{formatCFA(draftLineTotal)}</p>
                </div>
              ) : null}
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedJewelry || Number(selectedWeight) <= 0 || Number(selectedUnitPrice) <= 0}
                className="h-11 w-full gold-gradient text-accent-foreground hover:opacity-90 sm:w-auto"
              >
                <CirclePlus className="mr-2 h-4 w-4" />
                Ajouter au panier
              </Button>
            </div>

            {selectedJewelry ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <StatusBadge status={selectedJewelry.status} />
                <span>{formatBusinessAttribute(businessType, selectedJewelry.material_type)}</span>
                <span>Stock {selectedJewelry.quantity}</span>
              </div>
            ) : null}

            <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {cart.length === 0
                ? 'Le panier est vide.'
                : `${cart.reduce((sum, line) => sum + line.quantity, 0)} article(s) dans le panier · ${formatCFA(totalInvoice)}`}
            </div>
          </section>
        </div>

        <aside ref={checkoutRef} className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="space-y-5 rounded-xl bg-card p-4 card-shadow sm:p-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-base font-semibold">Panier et paiement</h2>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border">
              {cart.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Ajoutez un produit pour commencer.
                </div>
              ) : (
                <div className="divide-y">
                  {cart.map((line) => (
                    <div key={line.id} className="space-y-3 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{line.jewelry.name}</p>
                          <p className="text-xs text-muted-foreground">{line.jewelry.code}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(line.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className={`grid gap-2 ${isJewelry ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {isJewelry ? <div>
                          <Label className="text-[11px] text-muted-foreground">Poids (g)</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.weight}
                            onChange={(event) => updateLineValue(line.id, 'weight', Number(event.target.value))}
                            className="h-9 px-2"
                          />
                        </div> : null}
                        <div>
                          <Label className="text-[11px] text-muted-foreground">{isJewelry ? 'Prix / g' : 'Prix unitaire'}</Label>
                          <Input
                            type="number"
                            min="1"
                            value={line.unitPrice}
                            onChange={(event) => updateLineValue(line.id, 'unitPrice', Number(event.target.value))}
                            className="h-9 px-2"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Quantité</Label>
                          <Input
                            type="number"
                            min="1"
                            max={line.jewelry.quantity}
                            value={line.quantity}
                            onChange={(event) => updateLineQuantity(line.id, Number(event.target.value || 1))}
                            className="h-9 px-2"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold">{formatCFA(line.weight * line.unitPrice * line.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && !cartIsValid ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {isJewelry ? 'Vérifiez le poids, le prix par gramme et la quantité de chaque ligne.' : 'Vérifiez le prix unitaire et la quantité de chaque ligne.'}
              </p>
            ) : null}

            <div className="space-y-4 rounded-2xl border border-[#ead7a5] bg-[#fffaf0] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total à payer</p>
                  <p className="mt-1 text-3xl font-extrabold leading-none text-foreground">
                    {formatCFA(totalInvoice)}
                  </p>
                </div>
                <ReceiptText className="h-6 w-6 text-[#C9972A]" />
              </div>

              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="paid-amount">Montant remis</Label>
                  <Input
                    id="paid-amount"
                    inputMode="numeric"
                    value={formatMoneyInput(paidAmount)}
                    onChange={handleMoneyChange(setPaidAmount)}
                    aria-invalid={!!paidAmountError}
                    aria-describedby={paidAmountError ? 'paid-amount-error' : undefined}
                    className="h-14 text-lg font-semibold"
                    placeholder="0"
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
                    <SelectTrigger className="h-12 bg-white">
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

              <div className="rounded-xl bg-white p-4 shadow-sm">
                {remaining > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">Reste à payer</span>
                    <span className="text-xl font-extrabold text-warning">{formatCFA(remaining)}</span>
                  </div>
                ) : changeAmount > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">Monnaie à rendre</span>
                    <span className="text-xl font-extrabold text-success">{formatCFA(changeAmount)}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">Statut</span>
                    <span className="text-base font-bold text-success">Prêt à encaisser</span>
                  </div>
                )}
              </div>

              <details className="group rounded-xl border bg-white px-4 py-3 text-sm">
                <summary className="cursor-pointer list-none font-semibold text-muted-foreground">
                  Voir le détail comptable
                </summary>
                <div className="mt-3 space-y-2 border-t pt-3">
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
                    <span className="text-muted-foreground">Montant encaissé</span>
                    <span className="font-semibold">{formatCFA(balanceUsed + externalPaymentApplied)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Reste à payer</span>
                    <span className="font-semibold">{formatCFA(remaining)}</span>
                  </div>
                  {changeAmount > 0 ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Monnaie à rendre</span>
                      <span className="font-semibold">{formatCFA(changeAmount)}</span>
                    </div>
                  ) : null}
                </div>
              </details>
            </div>

            {remaining > 0 && hasIdentifiedClient ? (
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

            {remaining > 0 && !hasIdentifiedClient ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                Une vente sans client identifié doit être entièrement payée. Identifiez le client pour autoriser un crédit.
              </p>
            ) : null}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || (!hasIdentifiedClient && remaining > 0)}
              className="min-h-14 w-full whitespace-normal gold-gradient px-3 py-3 text-sm font-bold leading-tight text-accent-foreground hover:opacity-90 sm:text-base"
            >
              {addSale.isPending || addClient.isPending ? (
                'Enregistrement...'
              ) : remaining === 0 ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5 shrink-0" />
                  {changeAmount > 0 ? (
                    <span className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:gap-2">
                      <span>Encaisser {formatCFA(totalInvoice)}</span>
                      <span className="text-xs font-semibold opacity-85 sm:text-base">Rendre {formatCFA(changeAmount)}</span>
                    </span>
                  ) : (
                    <span>Encaisser {formatCFA(totalInvoice)}</span>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-5 w-5" /> Enregistrer avec {formatCFA(remaining)} à payer
                </>
              )}
            </Button>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-30 rounded-xl border bg-card p-2 shadow-lg lg:hidden">
        <Button
          type="button"
          className="h-12 w-full justify-between gold-gradient px-4 text-accent-foreground"
          onClick={() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <span>{cart.reduce((sum, line) => sum + line.quantity, 0)} article(s)</span>
          <span className="font-bold">{formatCFA(totalInvoice)}</span>
        </Button>
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
