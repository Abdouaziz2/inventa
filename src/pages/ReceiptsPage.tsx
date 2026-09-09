import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  buildDepositReceipt,
  buildCustomerOrderReceipt,
  buildBuybackReceipt,
  buildReceiptOperations,
  buildReservationReceipt,
  buildSaleReceipt,
  useDeposits,
  useCustomerOrders,
  useReservations,
  useSales,
  useWalletTransactions,
  type ReceiptOperation,
} from '@/features/transactions';
import { useBuybacks } from '@/features/operations';
import { useClients } from '@/features/clients';
import { useJewelry } from '@/features/jewelry';
import ReceiptModal, { type ReceiptData } from '@/components/ReceiptModal';
import { Eye, FilterX, Printer, Receipt, Search } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import type { Client } from '@/hooks/useDatabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import FilterBar from '@/components/FilterBar';
import { EmptyState } from '@/components/DataState';

type ReceiptTypeFilter = 'all' | ReceiptOperation['type'];

const receiptTone: Record<ReceiptOperation['type'], string> = {
  deposit: 'bg-success/10 text-success',
  sale: 'bg-info/10 text-info',
  reservation: 'bg-warning/10 text-warning',
  order: 'bg-[#c9972a]/10 text-[#8f6810]',
  buyback: 'bg-violet-500/10 text-violet-700',
  return: 'bg-destructive/10 text-destructive',
};

const ReceiptsPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter] = useState<ReceiptTypeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data: deposits = [] } = useDeposits();
  const { data: sales = [] } = useSales();
  const { data: reservations = [] } = useReservations();
  const { data: orders = [] } = useCustomerOrders();
  const { data: buybacks = [] } = useBuybacks();
  const { data: walletTransactions = [] } = useWalletTransactions();
  const { data: clients = [] } = useClients();
  const { data: jewelry = [] } = useJewelry();

  useEffect(() => {
    const requestedSearch = searchParams.get('search');
    if (requestedSearch !== null) setSearch(requestedSearch);
  }, [searchParams]);

  const allOps = useMemo(
    () => buildReceiptOperations(deposits, sales, reservations, orders, buybacks),
    [buybacks, deposits, orders, reservations, sales],
  );
  const filteredOps = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('fr');
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return allOps.filter((operation) => {
      const matchesSearch =
        !normalizedSearch ||
        `${operation.documentNumber} ${operation.client} ${operation.label}`
          .toLocaleLowerCase('fr')
          .includes(normalizedSearch);
      const matchesType = typeFilter === 'all' || operation.type === typeFilter;
      const date = new Date(operation.date);
      const matchesFrom = !from || date >= from;
      const matchesTo = !to || date <= to;
      return matchesSearch && matchesType && matchesFrom && matchesTo;
    });
  }, [allOps, dateFrom, dateTo, search, typeFilter]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const openReceipt = (operation: ReceiptOperation) => {
    const clientId =
      operation.type === 'deposit'
        ? deposits.find((item) => item.id === operation.id)?.client_id
        : operation.type === 'sale'
          ? sales.find((item) => item.id === operation.id)?.client_id
          : operation.type === 'reservation'
            ? reservations.find((item) => item.id === operation.id)?.client_id
            : operation.type === 'order'
              ? orders.find((item) => item.id === operation.id)?.client_id
              : buybacks.find((item) => item.id === operation.id)?.client_id;
    const client = clients.find((item) => item.id === clientId);
    const walkInClient: Client = {
      id: 'walk-in',
      code: 'COMPTOIR',
      name: 'Client comptoir',
      phone: '',
      email: null,
      balance: 0,
      created_at: new Date().toISOString(),
      created_by: null,
    };
    const receiptClient = client ?? walkInClient;

    if (operation.type === 'deposit') {
      const deposit = deposits.find((item) => item.id === operation.id);
      if (!deposit || !client) return;
      const walletEntry = walletTransactions.find(
        (item) => item.operation_id === deposit.id || item.document_number === deposit.document_number,
      );
      setSelectedReceipt(buildDepositReceipt(client, deposit, walletEntry?.balance_before ?? 0));
      return;
    }

    if (operation.type === 'sale') {
      const sale = sales.find((item) => item.id === operation.id);
      const saleJewelry = jewelry.find((item) => item.id === sale?.items[0]?.jewelry_id);
      if (!sale || !saleJewelry) return;
      setSelectedReceipt(buildSaleReceipt(receiptClient, saleJewelry, sale));
      return;
    }

    if (operation.type === 'order') {
      const order = orders.find((item) => item.id === operation.id);
      if (!order) return;
      if (!client) return;
      setSelectedReceipt(buildCustomerOrderReceipt(client, order));
      return;
    }

    if (operation.type === 'buyback') {
      const buyback = buybacks.find((item) => item.id === operation.id);
      if (!buyback) return;
      if (!client) return;
      setSelectedReceipt(buildBuybackReceipt(client, buyback));
      return;
    }

    const reservation = reservations.find((item) => item.id === operation.id);
    const reservedJewelry = jewelry.find((item) => item.id === reservation?.jewelry_id);
    if (!reservation || !reservedJewelry) return;
    if (!client) return;
    setSelectedReceipt(buildReservationReceipt(client, reservedJewelry, reservation));
  };

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title="Reçus & Factures"
        description="Cliquez sur un document pour l’afficher et le réimprimer."
      />

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_160px_160px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Client ou numéro de document..."
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ReceiptTypeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Type de document" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les documents</SelectItem>
              <SelectItem value="sale">Ventes</SelectItem>
              <SelectItem value="deposit">Dépôts</SelectItem>
              <SelectItem value="reservation">Réservations</SelectItem>
              <SelectItem value="order">Commandes</SelectItem>
              <SelectItem value="buyback">Achats retour</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date de début" />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date de fin" />
          <Button type="button" variant="outline" onClick={clearFilters}>
            <FilterX className="mr-2 h-4 w-4" />
            Effacer
          </Button>
        </div>
      </FilterBar>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        {filteredOps.length === 0 ? (
          <EmptyState title="Aucun document trouvé" description="Modifiez la recherche ou effacez les filtres." />
        ) : (
          <>
          <table className="hidden min-w-[760px] w-full xl:table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">TYPE</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">DOCUMENT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">CLIENT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">PAIEMENT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">DATE</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">MONTANT</th>
                <th className="w-24 px-5 py-3 text-right text-xs font-semibold text-muted-foreground">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredOps.map(op => (
                <tr
                  key={`${op.type}-${op.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openReceipt(op)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openReceipt(op);
                    }
                  }}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                >
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${receiptTone[op.type]}`}>
                      <Receipt className="h-3 w-3" /> {op.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono">{op.documentNumber}</td>
                  <td className="px-5 py-3.5 text-sm font-medium">{op.client}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{op.paymentMethod || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(op.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-right">{formatCFA(op.amount)}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center justify-end gap-2 text-xs font-semibold text-[#9a7112]">
                      <Eye className="h-4 w-4" /> Voir
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y xl:hidden">
            {filteredOps.map(op => (
              <button
                type="button"
                key={`${op.type}-${op.id}`}
                onClick={() => openReceipt(op)}
                className="block w-full px-4 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${receiptTone[op.type]}`}>
                      <Receipt className="h-3 w-3" /> {op.label}
                    </span>
                    <p className="mt-2 truncate text-sm font-semibold">{op.client}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{op.documentNumber}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{op.paymentMethod || '—'}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatCFA(op.amount)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{new Date(op.date).toLocaleDateString('fr-FR')}</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#9a7112]">
                    <Printer className="h-3.5 w-3.5" /> Voir et réimprimer
                  </span>
                </div>
              </button>
            ))}
          </div>
          </>
        )}
      </div>

      <ReceiptModal
        open={selectedReceipt !== null}
        onClose={() => setSelectedReceipt(null)}
        data={selectedReceipt}
      />
    </div>
  );
};

export default ReceiptsPage;
