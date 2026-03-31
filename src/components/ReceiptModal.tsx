import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X, CheckCircle2 } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import { useRef, useEffect } from 'react';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import JsBarcode from 'jsbarcode';

export interface ReceiptData {
  type: 'deposit' | 'sale' | 'reservation';
  clientName: string;
  clientCode: string;
  amount: number;
  date: string;
  receiptId?: string;
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

const generateReceiptId = () => {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.floor(1000 + Math.random() * 9000);
  return `${y}${m}${d}-${r}`;
};

const ReceiptModal = ({ open, onClose, data }: ReceiptModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const { data: company } = useCompanySettings();
  const companyName = company?.name || 'JewelStock';
  const companyPhone = company?.phone || '';
  const companyAddress = company?.address || '';

  const receiptId = useRef(generateReceiptId());

  // Reset receipt ID when new data comes in
  useEffect(() => {
    if (open && data) {
      receiptId.current = data.receiptId || generateReceiptId();
    }
  }, [open, data]);

  // Generate barcode
  useEffect(() => {
    if (open && barcodeRef.current && receiptId.current) {
      try {
        JsBarcode(barcodeRef.current, receiptId.current, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 11,
          margin: 5,
          textMargin: 2,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [open, data]);

  if (!data) return null;

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    // Generate barcode SVG string for print
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try {
      JsBarcode(svgEl, receiptId.current, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 11,
        margin: 5,
        textMargin: 2,
      });
    } catch (e) { /* ignore */ }
    const barcodeSvg = svgEl.outerHTML;

    const w = window.open('', '_blank', 'width=400,height=700');
    if (!w) return;
    w.document.write(`
      <html><head><title>${typeLabels[data.type]}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; padding: 24px; color: #111; }
        .receipt { max-width: 350px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 16px; margin-bottom: 16px; }
        .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .company-info { font-size: 11px; color: #666; margin-top: 6px; }
        .type { font-size: 12px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .receipt-num { font-size: 10px; color: #888; margin-top: 4px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .row .label { color: #666; }
        .row .val { font-weight: 600; }
        .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
        .total { font-size: 18px; font-weight: 800; text-align: center; padding: 12px 0; }
        .note { font-size: 11px; color: #888; font-style: italic; margin-top: 8px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
        .barcode { text-align: center; margin-top: 16px; }
        .barcode svg { max-width: 100%; }
      </style></head><body>
      <div class="receipt">
        <div class="header">
          <div class="logo">${companyName}</div>
          ${companyPhone || companyAddress ? `<div class="company-info">${[companyPhone, companyAddress].filter(Boolean).join(' · ')}</div>` : ''}
          <div class="type">${typeLabels[data.type]}</div>
          <div class="receipt-num">N° ${receiptId.current}</div>
        </div>
        <div class="row"><span class="label">Client:</span><span class="val">${data.clientName}</span></div>
        <div class="row"><span class="label">Code:</span><span class="val">${data.clientCode}</span></div>
        <div class="row"><span class="label">Date:</span><span class="val">${data.date}</span></div>
        ${data.details?.map(d => `<div class="row"><span class="label">${d.label}:</span><span class="val">${d.value}</span></div>`).join('') || ''}
        <div class="divider"></div>
        <div class="total">${formatCFA(data.amount)}</div>
        ${data.note ? `<div class="note">Note: ${data.note}</div>` : ''}
        <div class="barcode">${barcodeSvg}</div>
        <div class="footer">Merci pour votre confiance · ${companyName}</div>
      </div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handleExportPDF = () => {
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
            <p className="font-display text-xl font-bold">{companyName}</p>
            {(companyPhone || companyAddress) && (
              <p className="text-xs text-muted-foreground mt-0.5">{[companyPhone, companyAddress].filter(Boolean).join(' · ')}</p>
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{typeLabels[data.type]}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">N° {receiptId.current}</p>
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
          {/* Barcode */}
          <div className="flex justify-center pt-2">
            <svg ref={barcodeRef}></svg>
          </div>
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
