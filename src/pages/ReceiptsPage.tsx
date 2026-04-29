import { useDeposits, useReservations, useSales, buildReceiptOperations } from '@/features/transactions';
import { Receipt } from 'lucide-react';
import { formatCFA } from '@/lib/format';

const ReceiptsPage = () => {
  const { data: deposits = [] } = useDeposits();
  const { data: sales = [] } = useSales();
  const { data: reservations = [] } = useReservations();

  const allOps = buildReceiptOperations(deposits, sales, reservations);

  return (
    <div className="page-shell animate-fade-in">
      <h1 className="page-title">Reçus & Factures</h1>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        {allOps.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucune opération enregistrée</p>
        ) : (
          <>
          <table className="hidden min-w-[760px] w-full lg:table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">TYPE</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">DOCUMENT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">CLIENT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">PAIEMENT</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">DATE</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">MONTANT</th>
              </tr>
            </thead>
            <tbody>
              {allOps.map(op => (
                <tr key={`${op.type}-${op.id}`} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                      op.type === 'deposit'
                        ? 'bg-success/10 text-success'
                        : op.type === 'reservation'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-info/10 text-info'
                    }`}>
                      <Receipt className="h-3 w-3" /> {op.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono">{op.documentNumber}</td>
                  <td className="px-5 py-3.5 text-sm font-medium">{op.client}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{op.paymentMethod || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(op.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-right">{formatCFA(op.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y lg:hidden">
            {allOps.map(op => (
              <div key={`${op.type}-${op.id}`} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                      op.type === 'deposit'
                        ? 'bg-success/10 text-success'
                        : op.type === 'reservation'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-info/10 text-info'
                    }`}>
                      <Receipt className="h-3 w-3" /> {op.label}
                    </span>
                    <p className="mt-2 truncate text-sm font-semibold">{op.client}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{op.documentNumber}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{op.paymentMethod || '—'}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatCFA(op.amount)}</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{new Date(op.date).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReceiptsPage;
