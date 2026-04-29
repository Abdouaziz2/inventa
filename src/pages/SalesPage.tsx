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

type CartLine = {
  jewelry: Jewelry;
  quantity: number;
};

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
  const [paidCash, setPaidCash] = useState('');
  const [paidMobileMoney, setPaidMobileMoney] = useState('');
  const [paidCard, setPaidCard] = useState('');
  const [paidOther, setPaidOther] = useState('');
  const [addChangeToBalance, setAddChangeToBalance] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

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
  const cashAmount = parseMoney(paidCash);
  const mobileMoneyAmount = parseMoney(paidMobileMoney);
  const cardAmount = parseMoney(paidCard);
  const otherAmount = parseMoney(paidOther);
  const paidTotal = balanceUsed + cashAmount + mobileMoneyAmount + cardAmount + otherAmount;
  const remaining = Math.max(0, totalInvoice - paidTotal);
  const overpaid = Math.max(0, paidTotal - totalInvoice);
  const changeAmount = addChangeToBalance ? 0 : overpaid;
  const changeToBalance = addChangeToBalance ? overpaid : 0;

  const resetForm = () => {
    setClientMode('existing');
    setClientId('');
    setNewClientName('');
    setNewClientPhone('');
    setSelectedJewelryId('');
    setSelectedQuantity('1');
    setCart([]);
    setUseBalance(true);
    setPaidCash('');
    setPaidMobileMoney('');
    setPaidCard('');
    setPaidOther('');
    setAddChangeToBalance(false);
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

  const handleSubmit = async () => {
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
        paid_cash: cashAmount,
        paid_mobile_money: mobileMoneyAmount,
        paid_card: cardAmount,
        paid_other: otherAmount,
        add_change_to_balance: addChangeToBalance,
      });

      setReceiptData(buildSaleReceipt(saleClient, cart[0].jewelry, sale));
      setShowReceipt(true);
      toast.success('Vente enregistrée avec succès');
      resetForm();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const canSubmit =
    cart.length > 0 &&
    !addSale.isPending &&
    !addClient.isPending &&
    (clientMode === 'existing' ? !!clientId : !!newClientName.trim() && !!newClientPhone.trim());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle vente</h1>
          <p className="text-sm text-muted-foreground">Caisse multi-bijoux avec paiement mixte.</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Total facture</p>
          <p className="text-2xl font-bold">{formatCFA(totalInvoice)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
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

            <div className="grid gap-3 lg:grid-cols-[1fr_120px_auto]">
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
                        className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_120px_150px_44px] md:items-center"
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

        <aside className="space-y-6">
          <section className="space-y-4 rounded-xl bg-card p-4 card-shadow sm:p-6">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">Paiement</h2>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Montant reçu en espèces</Label>
                <Input inputMode="numeric" value={formatMoneyInput(paidCash)} onChange={handleMoneyChange(setPaidCash)} />
              </div>
              <div className="space-y-2">
                <Label>Mobile money</Label>
                <Input inputMode="numeric" value={formatMoneyInput(paidMobileMoney)} onChange={handleMoneyChange(setPaidMobileMoney)} />
              </div>
              <div className="space-y-2">
                <Label>Carte</Label>
                <Input inputMode="numeric" value={formatMoneyInput(paidCard)} onChange={handleMoneyChange(setPaidCard)} />
              </div>
              <div className="space-y-2">
                <Label>Autre</Label>
                <Input inputMode="numeric" value={formatMoneyInput(paidOther)} onChange={handleMoneyChange(setPaidOther)} />
              </div>
            </div>

            {overpaid > 0 ? (
              <label className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={addChangeToBalance}
                  onChange={(event) => setAddChangeToBalance(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  Ajouter le surplus de {formatCFA(overpaid)} au solde client au lieu de rendre la monnaie.
                </span>
              </label>
            ) : null}

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
                <span className="text-muted-foreground">Payé total</span>
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
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Surplus au solde</span>
                    <span className="font-semibold">{formatCFA(changeToBalance)}</span>
                  </div>
                </>
              ) : null}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-14 w-full gold-gradient text-lg font-bold text-accent-foreground hover:opacity-90"
            >
              {addSale.isPending || addClient.isPending ? (
                'Enregistrement...'
              ) : remaining === 0 ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Valider la vente
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-5 w-5" /> Valider avec reste
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
    </div>
  );
};

export default SalesPage;
