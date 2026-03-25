import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X, CheckCircle2 } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import { useRef } from 'react';

export interface ReceiptData {
  type: 'deposit' | 'sale' | 'reservation';
  clientName: string;
  clientCode: string;
  amount: number;
  date: string;
  details?: { label: string; value: string }[];
  note?: string;
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

const typeLabels = {
  deposit: 'Reçu de Dépôt',
  sale: 'Facture de Vente',
  reservation: 'Reçu de Réservation',
};

const ReceiptModal = ({ open, onClose, data }: ReceiptModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>${typeLabels[data.type]}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; padding: 24px; color: #111; }
        .receipt { max-width: 350px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 16px; margin-bottom: 16px; }
        .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .logo span { color: #d4af37; }
        .type { font-size: 12px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .row .label { color: #666; }
        .row .val { font-weight: 600; }
        .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
        .total { font-size: 18px; font-weight: 800; text-align: center; padding: 12px 0; }
        .note { font-size: 11px; color: #888; font-style: italic; margin-top: 8px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
      </style></head><body>
      <div class="receipt">
        <div class="header">
          <div class="logo">Jewel<span>Stock</span></div>
          <div class="type">${typeLabels[data.type]}</div>
        </div>
        <div class="row"><span class="label">Client:</span><span class="val">${data.clientName}</span></div>
        <div class="row"><span class="label">Code:</span><span class="val">${data.clientCode}</span></div>
        <div class="row"><span class="label">Date:</span><span class="val">${data.date}</span></div>
        ${data.details?.map(d => `<div class="row"><span class="label">${d.label}:</span><span class="val">${d.value}</span></div>`).join('') || ''}
        <div class="divider"></div>
        <div class="total">${formatCFA(data.amount)}</div>
        ${data.note ? `<div class="note">Note: ${data.note}</div>` : ''}
        <div class="footer">Merci pour votre confiance · JewelStock</div>
      </div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handleExportPDF = () => {
    // Uses print to PDF as a simple approach
    handlePrint();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <DialogTitle className="text-lg">Opération validée !</DialogTitle>
              <p className="text-sm text-muted-foreground">{typeLabels[data.type]} généré</p>
            </div>
          </div>
        </DialogHeader>

        {/* Receipt preview */}
        <div ref={receiptRef} className="border border-border rounded-xl p-5 space-y-3 bg-muted/30">
          <div className="text-center border-b border-border pb-3">
            <p className="font-display text-xl font-bold">Jewel<span className="gold-text">Stock</span></p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{typeLabels[data.type]}</p>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{data.clientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span className="font-mono font-medium">{data.clientCode}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{data.date}</span></div>
            {data.details?.map((d, i) => (
              <div key={i} className="flex justify-between"><span className="text-muted-foreground">{d.label}:</span><span className="font-medium">{d.value}</span></div>
            ))}
          </div>
          <div className="border-t border-border pt-3 text-center">
            <p className="text-2xl font-bold">{formatCFA(data.amount)}</p>
          </div>
          {data.note && <p className="text-xs text-muted-foreground italic">Note: {data.note}</p>}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleExportPDF} className="flex-1">
            <Download className="h-4 w-4 mr-2" /> Exporter PDF
          </Button>
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" /> Imprimer
          </Button>
          <Button onClick={onClose} className="flex-1 gold-gradient text-accent-foreground hover:opacity-90">
            <X className="h-4 w-4 mr-2" /> Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;
