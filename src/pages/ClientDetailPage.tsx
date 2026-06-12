import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClient } from '@/features/clients';
import {
  useDeposits,
  useSales,
  useWalletTransactions,
  type DepositWithClient,
  type SaleWithRelations,
  type WalletTransactionWithClient,
} from '@/features/transactions';
import { formatCFA } from '@/lib/format';

const getWalletOperationLabel = (operationType: WalletTransactionWithClient['operation_type']) => {
  switch (operationType) {
    case 'deposit_credit':
      return 'Depot';
    case 'sale_balance_debit':
      return 'Achat via solde';
    case 'balance_adjustment_credit':
      return 'Ajustement +';
    case 'balance_adjustment_debit':
      return 'Ajustement -';
    default:
      return 'Mouvement';
  }
};

const ClientDetailPage = () => {
  const { id } = useParams();
  const { data: client, isLoading } = useClient(id);
  const { data: deposits = [] } = useDeposits(id);
  const { data: sales = [] } = useSales(id);
  const { data: walletTransactions = [] } = useWalletTransactions(id);

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>;
  if (!client) return <div className="p-6">Client introuvable</div>;

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/clients"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="min-w-0">
          <h1 className="page-title">{client.name}</h1>
          <p className="break-words text-sm text-muted-foreground">Code: {client.code} · {client.phone}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-card p-5 card-shadow sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="p-3 rounded-xl gold-gradient">
            <Wallet className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Solde disponible</p>
            <p className="break-words text-2xl font-bold sm:text-3xl">{formatCFA(client.balance)}</p>
          </div>
        </div>
        <Button asChild size="sm" className="w-full justify-center gold-gradient text-accent-foreground hover:opacity-90 sm:w-auto">
          <Link to="/deposits"><Plus className="h-4 w-4 mr-1" /> Dépôt client</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold">Historique des Dépôts</h3></div>
          {deposits.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucun dépôt</p>
          ) : (
            <>
            <table className="hidden w-full md:table">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">DATE</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2">MONTANT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">NOTE</th>
              </tr></thead>
              <tbody>
                {deposits.map((d: DepositWithClient) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-sm">{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-right text-success">+{formatCFA(d.amount)}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{d.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="divide-y md:hidden">
              {deposits.map((d: DepositWithClient) => (
                <div key={d.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                    <span className="text-sm font-semibold text-success">+{formatCFA(d.amount)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{d.note || '—'}</p>
                </div>
              ))}
            </div>
            </>
          )}
        </div>

        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold">Historique des Achats</h3></div>
          {sales.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucun achat</p>
          ) : (
            <>
            <table className="hidden w-full md:table">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">DATE</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">BIJOU</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2">MONTANT</th>
              </tr></thead>
              <tbody>
                {sales.map((s: SaleWithRelations) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-sm">{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3 text-sm font-medium">{s.jewelry?.name}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-right">{formatCFA(s.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="divide-y md:hidden">
              {sales.map((s: SaleWithRelations) => (
                <div key={s.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                    <span className="text-sm font-semibold">{formatCFA(s.total_price)}</span>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">{s.jewelry?.name}</p>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Ledger du Portefeuille</h3>
        </div>
        {walletTransactions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucun mouvement de portefeuille</p>
        ) : (
          <>
          <table className="hidden w-full md:table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">DATE</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">DOCUMENT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2">OPERATION</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2">MONTANT</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2">SOLDE APRES</th>
              </tr>
            </thead>
            <tbody>
              {walletTransactions.map((transaction: WalletTransactionWithClient) => (
                <tr key={transaction.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-sm">{new Date(transaction.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3 text-sm font-mono">{transaction.document_number}</td>
                  <td className="px-5 py-3 text-sm">{getWalletOperationLabel(transaction.operation_type)}</td>
                  <td
                    className={`px-5 py-3 text-sm font-semibold text-right ${
                      transaction.amount >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {transaction.amount >= 0 ? '+' : '-'}
                    {formatCFA(Math.abs(transaction.amount))}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-right">{formatCFA(transaction.balance_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y md:hidden">
            {walletTransactions.map((transaction: WalletTransactionWithClient) => (
              <div key={transaction.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm">{transaction.document_number}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR')} · {getWalletOperationLabel(transaction.operation_type)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      transaction.amount >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {transaction.amount >= 0 ? '+' : '-'}
                    {formatCFA(Math.abs(transaction.amount))}
                  </span>
                </div>
                <div className="mt-3 flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Solde après</span>
                  <span className="font-semibold">{formatCFA(transaction.balance_after)}</span>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientDetailPage;
