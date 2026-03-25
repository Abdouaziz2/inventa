import { mockSales, mockDeposits } from '@/data/mock';
import { Receipt, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCFA } from '@/lib/format';

const ReceiptsPage = () => {
  const allOps = [
    ...mockDeposits.map(d => ({ type: 'deposit' as const, id: d.id, client: d.clientName, amount: d.amount, date: d.date, label: 'Dépôt' })),
    ...mockSales.map(s => ({ type: 'sale' as const, id: s.id, client: s.clientName, amount: s.totalPrice, date: s.date, label: 'Vente' })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Reçus & Factures</h1>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">TYPE</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">CLIENT</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">DATE</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">MONTANT</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {allOps.map(op => (
              <tr key={`${op.type}-${op.id}`} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                    op.type === 'deposit' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'
                  }`}>
                    <Receipt className="h-3 w-3" /> {op.label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm font-medium">{op.client}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{op.date}</td>
                <td className="px-5 py-3.5 text-sm font-semibold text-right">{formatCFA(op.amount)}</td>
                <td className="px-5 py-3.5 text-right">
                  <Button variant="ghost" size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceiptsPage;
