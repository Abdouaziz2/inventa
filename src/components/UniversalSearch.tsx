import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileText, Gem, Plus, Search, ShoppingCart, UserRound, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '@/features/clients';
import { useJewelry } from '@/features/jewelry';
import {
  buildReceiptOperations,
  useCustomerOrders,
  useDeposits,
  useReservations,
  useSales,
} from '@/features/transactions';
import { useBuybacks } from '@/features/operations';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';

const UniversalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { data: jewelry = [] } = useJewelry();
  const { data: deposits = [] } = useDeposits();
  const { data: sales = [] } = useSales();
  const { data: reservations = [] } = useReservations();
  const { data: orders = [] } = useCustomerOrders();
  const { data: buybacks = [] } = useBuybacks();
  const documents = useMemo(
    () => buildReceiptOperations(deposits, sales, reservations, orders, buybacks),
    [buybacks, deposits, orders, reservations, sales],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const matchingClients = useMemo(
    () =>
      normalizedQuery
        ? clients
            .filter((client) => `${client.name} ${client.phone} ${client.code}`.toLocaleLowerCase('fr').includes(normalizedQuery))
            .slice(0, 8)
        : [],
    [clients, normalizedQuery],
  );
  const matchingJewelry = useMemo(
    () =>
      normalizedQuery
        ? jewelry
            .filter((item) => `${item.name} ${item.code}`.toLocaleLowerCase('fr').includes(normalizedQuery))
            .slice(0, 8)
        : [],
    [jewelry, normalizedQuery],
  );
  const matchingOrders = useMemo(
    () =>
      normalizedQuery
        ? orders
            .filter((order) =>
              `${order.description} ${order.document_number} ${order.clients?.name ?? ''}`
                .toLocaleLowerCase('fr')
                .includes(normalizedQuery),
            )
            .slice(0, 8)
        : [],
    [normalizedQuery, orders],
  );
  const matchingDocuments = useMemo(
    () =>
      normalizedQuery
        ? documents
            .filter((document) =>
              `${document.documentNumber} ${document.client} ${document.label}`
                .toLocaleLowerCase('fr')
                .includes(normalizedQuery),
            )
            .slice(0, 8)
        : [],
    [documents, normalizedQuery],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const goTo = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 min-w-0 flex-1 justify-start gap-2 border-0 bg-muted px-3 text-muted-foreground shadow-none sm:max-w-lg"
        aria-label="Ouvrir la recherche globale"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Rechercher partout...</span>
        <span className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 text-[11px] font-medium sm:inline">Ctrl K</span>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery('');
        }}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Client, téléphone, produit, commande ou document..."
        />
        <CommandList className="max-h-[min(65vh,520px)]">
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup heading="Actions rapides">
            <CommandItem value="nouvelle vente encaisser" onSelect={() => goTo('/operations/sale')}>
              <ShoppingCart className="mr-3 h-4 w-4 text-[#9a7112]" />
              Nouvelle vente
              <CommandShortcut>Vente</CommandShortcut>
            </CommandItem>
            <CommandItem value="nouveau depot client" onSelect={() => goTo('/deposits')}>
              <Wallet className="mr-3 h-4 w-4" />
              Nouveau dépôt
            </CommandItem>
            <CommandItem value="ajouter produit stock" onSelect={() => goTo('/products/add')}>
              <Plus className="mr-3 h-4 w-4" />
              Ajouter un produit
            </CommandItem>
          </CommandGroup>

          {matchingClients.length ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clients">
                {matchingClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.name} ${client.phone} ${client.code}`}
                    onSelect={() => goTo(`/clients/${client.id}`)}
                  >
                    <UserRound className="mr-3 h-4 w-4" />
                    <span className="truncate font-medium">{client.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{client.phone}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {matchingJewelry.length ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Produits">
                {matchingJewelry.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.code}`}
                    onSelect={() => goTo(`/products?search=${encodeURIComponent(item.name)}`)}
                  >
                    <Gem className="mr-3 h-4 w-4" />
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">Stock {item.quantity}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {matchingOrders.length ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Commandes">
                {matchingOrders.map((order) => (
                  <CommandItem
                    key={order.id}
                    value={`${order.description} ${order.document_number} ${order.clients?.name ?? ''}`}
                    onSelect={() => goTo(`/orders?search=${encodeURIComponent(order.document_number)}`)}
                  >
                    <ClipboardList className="mr-3 h-4 w-4" />
                    <span className="truncate font-medium">{order.description}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{order.document_number}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {matchingDocuments.length ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Documents">
                {matchingDocuments.map((document) => (
                  <CommandItem
                    key={`${document.type}-${document.id}`}
                    value={`${document.documentNumber} ${document.client} ${document.label}`}
                    onSelect={() => goTo(`/receipts?search=${encodeURIComponent(document.documentNumber)}`)}
                  >
                    <FileText className="mr-3 h-4 w-4" />
                    <span className="truncate font-medium">{document.documentNumber}</span>
                    <span className="ml-auto max-w-36 truncate text-xs text-muted-foreground">{document.client}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default UniversalSearch;
