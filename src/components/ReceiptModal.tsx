import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Printer, X } from 'lucide-react';
import { formatCFA } from '@/lib/format';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { getErrorMessage } from '@/lib/errors';

export type ReceiptLineItem = {
  description: string;
  quantity?: number;
  weight?: number | null;
  unitPrice: number;
  totalPrice: number;
};

export interface ReceiptData {
  type: 'deposit' | 'sale' | 'reservation';
  invoiceNumber: string;
  clientName: string;
  clientCode: string;
  clientPhone?: string;
  amount: number;
  date: string;
  paymentMethod: string;
  taxRate?: number;
  note?: string;
  items: ReceiptLineItem[];
  details?: { label: string; value: string }[];
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

const documentLabels: Record<ReceiptData['type'], string> = {
  deposit: 'Recu de depot',
  sale: 'Facture de vente',
  reservation: 'Bon de reservation',
};

const partyLabels: Record<ReceiptData['type'], string> = {
  deposit: 'Client deposant',
  sale: 'Client acheteur',
  reservation: 'Client reservataire',
};

const infoPanelTitle: Record<ReceiptData['type'], string> = {
  deposit: 'Details du depot',
  sale: 'Details du paiement',
  reservation: 'Details de la reservation',
};

const totalPanelTitle: Record<ReceiptData['type'], string> = {
  deposit: 'Solde et depot',
  sale: 'Totaux de vente',
  reservation: 'Acompte et reste',
};

const footerMessages: Record<ReceiptData['type'], string> = {
  deposit:
    'Merci. Ce recu confirme le depot effectue sur le compte client et le nouveau solde disponible.',
  sale:
    'Merci pour votre confiance. Cette facture confirme la vente enregistree et peut servir de justificatif client.',
  reservation:
    'Merci. Ce bon confirme la reservation du bijou avec acompte et le montant restant a regler.',
};

const qrLabels: Record<ReceiptData['type'], string> = {
  deposit: 'Verification depot',
  sale: 'Verification facture',
  reservation: 'Verification reservation',
};

const priceColumnLabels: Record<ReceiptData['type'], string> = {
  deposit: 'Prix unitaire',
  sale: 'Prix unitaire',
  reservation: 'Prix / g',
};

const amountLabels: Record<ReceiptData['type'], string> = {
  deposit: 'Montant du depot',
  sale: 'Total facture',
  reservation: 'Acompte verse',
};

const summaryPrimaryLabels: Record<ReceiptData['type'], string> = {
  deposit: 'Montant credite',
  sale: 'Total a payer',
  reservation: 'Montant du bijou',
};

const getDetailValue = (data: ReceiptData, label: string) =>
  data.details?.find((detail) => detail.label === label)?.value;

const getSummaryRows = (data: ReceiptData, subtotal: number, taxAmount: number, totalWithTax: number) => {
  if (data.type === 'deposit') {
    return [
      { label: 'Ancien solde', value: getDetailValue(data, 'Ancien solde') ?? formatCFA(0) },
      { label: 'Depot effectue', value: getDetailValue(data, 'Montant depose') ?? formatCFA(data.amount) },
      {
        label: summaryPrimaryLabels.deposit,
        value: getDetailValue(data, 'Nouveau solde') ?? formatCFA(totalWithTax),
        accent: true,
      },
    ];
  }

  if (data.type === 'reservation') {
    return [
      { label: summaryPrimaryLabels.reservation, value: getDetailValue(data, 'Prix total bijou') ?? formatCFA(subtotal) },
      { label: 'Acompte verse', value: getDetailValue(data, 'Acompte verse') ?? formatCFA(data.amount) },
      {
        label: 'Reste a payer',
        value: getDetailValue(data, 'Reste a payer') ?? formatCFA(Math.max(subtotal - data.amount, 0)),
        accent: true,
      },
    ];
  }

  const rows = [
    { label: 'Sous-total HT', value: formatCFA(subtotal) },
    ...(taxAmount > 0 ? [{ label: `TVA (${((data.taxRate ?? 0) * 100).toFixed(0)}%)`, value: formatCFA(taxAmount) }] : []),
    { label: summaryPrimaryLabels.sale, value: formatCFA(totalWithTax), accent: true },
  ];

  const balanceUsed = getDetailValue(data, 'Paye via solde');
  const paidAmount = getDetailValue(data, 'Montant encaisse');
  const remainingAmount = getDetailValue(data, 'Reste a payer');

  if (balanceUsed) rows.splice(rows.length - 1, 0, { label: 'Paye via solde', value: balanceUsed });
  if (paidAmount) rows.splice(rows.length - 1, 0, { label: 'Montant encaisse', value: paidAmount });
  if (remainingAmount && remainingAmount !== formatCFA(0)) {
    rows.push({ label: 'Reste a payer', value: remainingAmount });
  }

  return rows;
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const sanitizeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildPrintStyles = () => `
  :root {
    color-scheme: light;
    --ink: #1f2937;
    --muted: #6b7280;
    --line: #d1d5db;
    --soft: #f8fafc;
    --accent: #b88917;
    --accent-soft: rgba(184, 137, 23, 0.12);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #eef2f7; color: var(--ink); }
  body {
    font-family: "Georgia", "Times New Roman", serif;
    padding: 24px;
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: white;
    padding: 18mm 16mm;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  }
  .invoice {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    border-bottom: 2px solid var(--accent);
    padding-bottom: 16px;
  }
  .brand {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .brand-logo {
    width: 68px;
    height: 68px;
    border: 1px solid var(--line);
    border-radius: 14px;
    object-fit: cover;
    background: white;
  }
  .brand-name {
    font-size: 29px;
    line-height: 1.1;
    font-weight: 700;
    letter-spacing: 0.2px;
  }
  .brand-meta,
  .meta-card,
  .client-card,
  .summary-card,
  .thank-you {
    font-family: Arial, Helvetica, sans-serif;
  }
  .brand-meta {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.7;
    margin-top: 6px;
  }
  .doc-badge {
    text-align: right;
  }
  .doc-badge-title {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2.4px;
    text-transform: uppercase;
    color: var(--accent);
  }
  .doc-badge-number {
    margin-top: 8px;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.6px;
    white-space: nowrap;
  }
  .doc-badge-date {
    margin-top: 6px;
    color: var(--muted);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 14px;
  }
  .client-card,
  .meta-card,
  .summary-card {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 14px 16px;
    background: white;
  }
  .card-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .client-name {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .kv,
  .summary-line {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    font-size: 13px;
  }
  .kv-label,
  .summary-label {
    color: var(--muted);
  }
  .kv-value,
  .summary-value {
    font-weight: 600;
    text-align: right;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid var(--line);
  }
  thead th {
    background: var(--soft);
    color: #374151;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    text-align: left;
    padding: 12px 14px;
    border-bottom: 1px solid var(--line);
  }
  tbody td {
    padding: 14px;
    border-bottom: 1px solid #e5e7eb;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    vertical-align: top;
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
  .td-right {
    text-align: right;
    white-space: nowrap;
  }
  .summary-wrap {
    display: flex;
    justify-content: flex-end;
  }
  .summary-card {
    width: 92mm;
    background: linear-gradient(180deg, #fffdf7 0%, #ffffff 100%);
  }
  .summary-total {
    margin-top: 6px;
    padding-top: 10px;
    border-top: 2px solid var(--accent);
    font-size: 17px;
    font-weight: 700;
  }
  .footer-grid {
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 14px;
    align-items: end;
  }
  .thank-you {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 14px 16px;
    background: var(--accent-soft);
    color: #4b5563;
    font-size: 13px;
    line-height: 1.7;
  }
  .qr-wrap {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px;
    text-align: center;
    background: white;
  }
  .qr-wrap img {
    width: 92px;
    height: 92px;
    object-fit: contain;
    display: block;
    margin: 0 auto 6px;
  }
  .qr-label {
    font-family: Arial, Helvetica, sans-serif;
    color: var(--muted);
    font-size: 10px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }
  .note {
    margin-top: 10px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: var(--muted);
  }
  @page { size: A4; margin: 10mm; }
  @media print {
    body { background: white; padding: 0; }
    .sheet { box-shadow: none; margin: 0; width: auto; min-height: auto; padding: 0; }
  }
  @media screen and (max-width: 760px) {
    body { padding: 10px; }
    .sheet { width: 100%; min-height: auto; padding: 18px; }
    .topbar,
    .brand,
    .grid,
    .footer-grid {
      display: block;
    }
    .doc-badge { text-align: left; margin-top: 16px; }
    .brand-name { font-size: 24px; }
    .doc-badge-number {
      font-size: 18px;
      white-space: nowrap;
    }
    .grid,
    .footer-grid,
    .invoice {
      gap: 12px;
    }
    .meta-card,
    .summary-card,
    .qr-wrap {
      margin-top: 12px;
      width: 100%;
    }
    table,
    thead,
    tbody,
    tr,
    th,
    td {
      display: block;
    }
    thead { display: none; }
    tbody tr {
      border: 1px solid var(--line);
      border-radius: 12px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    tbody td {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tbody td:nth-child(1)::before { content: "#"; color: var(--muted); }
    tbody td:nth-child(2)::before { content: "Article"; color: var(--muted); }
    tbody td:nth-child(3)::before { content: "Poids"; color: var(--muted); }
    tbody td:nth-child(4)::before { content: "Qte"; color: var(--muted); }
    tbody td:nth-child(5)::before { content: "Prix unitaire"; color: var(--muted); }
    tbody td:nth-child(6)::before { content: "Prix total"; color: var(--muted); }
  }
`;

const buildInvoiceHtml = ({
  documentLabel,
  businessName,
  brandMeta,
  businessLogo,
  data,
  qrCodeUrl,
}: {
  documentLabel: string;
  businessName: string;
  brandMeta: string[];
  businessLogo: string;
  data: ReceiptData;
  qrCodeUrl: string;
}) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = data.taxRate ?? 0;
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;
  const priceColumnLabel = priceColumnLabels[data.type];
  const priceSuffix = data.type === 'reservation' ? ' / g' : '';
  const clientPanelLabel = partyLabels[data.type];
  const infoTitle = infoPanelTitle[data.type];
  const totalTitle = totalPanelTitle[data.type];
  const footerMessage = footerMessages[data.type];
  const qrLabel = qrLabels[data.type];
  const summaryRows = getSummaryRows(data, subtotal, taxAmount, grandTotal);
  const brandMetaHtml = brandMeta.map((line) => `<div>${sanitizeHtml(line)}</div>`).join('');
  const detailsHtml = (data.details ?? [])
    .map(
      (detail) => `
        <div class="kv">
          <span class="kv-label">${sanitizeHtml(detail.label)}</span>
          <span class="kv-value">${sanitizeHtml(detail.value)}</span>
        </div>
      `,
    )
    .join('');
  const itemsHtml = data.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${sanitizeHtml(item.description)}</td>
          <td class="td-right">${item.weight ? `${item.weight.toFixed(2)} g` : '-'}</td>
          <td class="td-right">${item.quantity ?? 1}</td>
          <td class="td-right">${formatCFA(item.unitPrice)}${priceSuffix}</td>
          <td class="td-right">${formatCFA(item.totalPrice)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <html>
      <head>
        <title>${sanitizeHtml(data.invoiceNumber)}</title>
        <meta charset="utf-8" />
        <style>${buildPrintStyles()}</style>
      </head>
      <body>
        <div class="sheet">
          <div class="invoice">
            <div class="topbar">
              <div class="brand">
                ${businessLogo ? `<img class="brand-logo" src="${businessLogo}" alt="${sanitizeHtml(businessName)}" />` : ''}
                <div>
                  <div class="brand-name">${sanitizeHtml(businessName)}</div>
                  <div class="brand-meta">${brandMetaHtml}</div>
                </div>
              </div>
              <div class="doc-badge">
                <div class="doc-badge-title">${sanitizeHtml(documentLabel)}</div>
                <div class="doc-badge-number">${sanitizeHtml(data.invoiceNumber)}</div>
                <div class="doc-badge-date">Date d'emission: ${sanitizeHtml(formatDateTime(data.date))}</div>
              </div>
            </div>

            <div class="grid">
              <div class="client-card">
                <div class="card-title">${sanitizeHtml(clientPanelLabel)}</div>
                <div class="client-name">${sanitizeHtml(data.clientName)}</div>
                <div class="kv">
                  <span class="kv-label">Code client</span>
                  <span class="kv-value">${sanitizeHtml(data.clientCode)}</span>
                </div>
                <div class="kv">
                  <span class="kv-label">Telephone</span>
                  <span class="kv-value">${sanitizeHtml(data.clientPhone || 'Non renseigne')}</span>
                </div>
              </div>

              <div class="meta-card">
                <div class="card-title">${sanitizeHtml(infoTitle)}</div>
                <div class="kv">
                  <span class="kv-label">Date d'operation</span>
                  <span class="kv-value">${sanitizeHtml(formatDateTime(data.date))}</span>
                </div>
                <div class="kv">
                  <span class="kv-label">Mode de reglement</span>
                  <span class="kv-value">${sanitizeHtml(data.paymentMethod)}</span>
                </div>
                <div class="kv">
                  <span class="kv-label">${sanitizeHtml(amountLabels[data.type])}</span>
                  <span class="kv-value">${formatCFA(data.amount)}</span>
                </div>
                ${detailsHtml}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 52px;">#</th>
                  <th>Article</th>
                  <th style="width: 90px; text-align: right;">Poids</th>
                  <th style="width: 80px; text-align: right;">Qté</th>
                  <th style="width: 120px; text-align: right;">${priceColumnLabel}</th>
                  <th style="width: 130px; text-align: right;">Prix total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div class="summary-wrap">
              <div class="summary-card">
                <div class="card-title">${sanitizeHtml(totalTitle)}</div>
                ${summaryRows
                  .map(
                    (row) => `
                      <div class="summary-line ${row.accent ? 'summary-total' : ''}">
                        <span class="summary-label">${sanitizeHtml(row.label)}</span>
                        <span class="summary-value">${sanitizeHtml(row.value)}</span>
                      </div>
                    `,
                  )
                  .join('')}
              </div>
            </div>

            <div class="footer-grid">
              <div>
                <div class="thank-you">
                  ${sanitizeHtml(footerMessage)}
                </div>
                ${data.note ? `<div class="note">Note: ${sanitizeHtml(data.note)}</div>` : ''}
              </div>
              <div class="qr-wrap">
                <img src="${qrCodeUrl}" alt="${sanitizeHtml(qrLabel)}" />
                <div class="qr-label">${sanitizeHtml(qrLabel)}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

const ReceiptModal = ({ open, onClose, data }: ReceiptModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const { data: profile } = useProfileSettings();

  const businessName = profile?.business_name || profile?.full_name || 'Ma boutique';
  const businessLogo = profile?.logo ?? '';
  const brandMeta = useMemo(
    () => [profile?.address, profile?.phone, profile?.secondary_phone].filter(Boolean) as string[],
    [profile?.address, profile?.phone, profile?.secondary_phone],
  );

  useEffect(() => {
    let active = true;
    const payload = data
      ? JSON.stringify({
          invoiceNumber: data.invoiceNumber,
          type: data.type,
          client: data.clientName,
          amount: data.amount,
          date: data.date,
        })
      : '';

    if (!payload) {
      setQrCodeUrl('');
      return () => {
        active = false;
      };
    }

    QRCode.toDataURL(payload, {
      margin: 1,
      width: 144,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrCodeUrl(url);
      })
      .catch((error) => {
        console.error('QR generation error:', getErrorMessage(error));
        if (active) setQrCodeUrl('');
      });

    return () => {
      active = false;
    };
  }, [data]);

  if (!data) return null;

  const subtotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = data.taxRate ?? 0;
  const taxAmount = subtotal * taxRate;
  const totalWithTax = subtotal + taxAmount;
  const documentLabel = documentLabels[data.type];
  const priceColumnLabel = priceColumnLabels[data.type];
  const priceSuffix = data.type === 'reservation' ? ' / g' : '';
  const clientPanelLabel = partyLabels[data.type];
  const infoTitle = infoPanelTitle[data.type];
  const totalTitle = totalPanelTitle[data.type];
  const footerMessage = footerMessages[data.type];
  const qrLabel = qrLabels[data.type];
  const summaryRows = getSummaryRows(data, subtotal, taxAmount, totalWithTax);

  const openReceiptWindow = (autoPrint: boolean) => {
    const popup = window.open('', '_blank', 'width=1200,height=900');
    if (!popup) return;

    popup.document.write(
      buildInvoiceHtml({
        documentLabel,
        businessName,
        brandMeta,
        businessLogo,
        data,
        qrCodeUrl,
      }),
    );
    popup.document.close();
    popup.focus();
    if (autoPrint) {
      popup.print();
    }
  };

  const previewScaleClass =
    data.items.length > 2 ? 'scale-[0.64] md:scale-[0.72]' : 'scale-[0.7] md:scale-[0.78]';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">{documentLabel}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Mise en page optimisee pour impression PDF et papier
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[72vh] overflow-auto rounded-2xl border bg-slate-100 p-3 sm:p-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm md:hidden">
            <div className="border-b-2 border-[#b88917] pb-4">
              <div className="flex items-start gap-3">
                {businessLogo ? (
                  <img src={businessLogo} alt={businessName} className="h-12 w-12 rounded-xl border object-cover" />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-xl font-bold text-slate-900">{businessName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#b88917]">{documentLabel}</p>
                  <p className="mt-1 overflow-x-auto whitespace-nowrap font-mono text-sm font-semibold text-slate-700">
                    {data.invoiceNumber}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-xl border p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{clientPanelLabel}</p>
                <p className="mt-2 font-semibold text-slate-900">{data.clientName}</p>
                <p className="mt-1 text-slate-500">{data.clientCode} · {data.clientPhone || 'Non renseigne'}</p>
              </div>
              <div className="rounded-xl border p-3">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Date d'operation</span>
                  <span className="text-right font-medium">{formatDateTime(data.date)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3">
                  <span className="text-slate-500">Reglement</span>
                  <span className="text-right font-medium">{data.paymentMethod}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3">
                  <span className="text-slate-500">{amountLabels[data.type]}</span>
                  <span className="text-right font-semibold">{formatCFA(data.amount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 divide-y rounded-xl border">
              {data.items.map((item, index) => (
                <div key={`${item.description}-${index}`} className="p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-900">{item.description}</span>
                    <span className="shrink-0 font-semibold">{formatCFA(item.totalPrice)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Qte {item.quantity ?? 1} · {item.weight ? `${item.weight.toFixed(2)} g` : 'poids non renseigne'} · {formatCFA(item.unitPrice)}{priceSuffix}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border bg-[#fffdf7] p-3 text-sm">
              {summaryRows.map((row, index) => (
                <div
                  key={`${row.label}-${row.value}`}
                  className={`flex justify-between gap-3 ${index > 0 ? 'mt-2' : ''} ${
                    row.accent ? 'mt-3 border-t-2 border-[#b88917] pt-3 text-base font-bold' : ''
                  }`}
                >
                  <span className={row.accent ? '' : 'text-slate-500'}>{row.label}</span>
                  <span className="text-right font-semibold">{row.value}</span>
                </div>
              ))}
            </div>

            {data.note ? (
              <div className="mt-4 rounded-xl border border-dashed p-3 text-sm text-slate-600">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Note</p>
                <p className="mt-2">{data.note}</p>
              </div>
            ) : null}
          </div>

          <div className={`mx-auto hidden origin-top md:block ${previewScaleClass}`} style={{ width: '210mm' }}>
            <div className="min-h-[297mm] bg-white p-[18mm_16mm] shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
              <div className="flex flex-col gap-[18px] text-slate-800">
                <div className="flex items-start justify-between gap-6 border-b-2 border-[#b88917] pb-4">
                  <div className="flex items-start gap-4">
                    {businessLogo ? (
                      <img
                        src={businessLogo}
                        alt={businessName}
                        className="h-[68px] w-[68px] rounded-[14px] border object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="text-[29px] font-bold leading-none">{businessName}</p>
                      <div className="mt-2 space-y-1 text-xs leading-relaxed text-slate-500">
                        {brandMeta.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-sans text-[13px] font-bold uppercase tracking-[0.24em] text-[#b88917]">
                      {documentLabel}
                    </p>
                    <p className="mt-2 overflow-hidden whitespace-nowrap text-[28px] font-bold text-ellipsis">
                      {data.invoiceNumber}
                    </p>
                    <p className="mt-1 font-sans text-xs text-slate-500">
                      Date d'emission: {formatDateTime(data.date)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[1.15fr_0.85fr] gap-4">
                  <div className="rounded-[14px] border p-4">
                    <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {clientPanelLabel}
                    </p>
                    <p className="mt-2 text-lg font-bold">{data.clientName}</p>
                    <div className="mt-2 space-y-1.5 font-sans text-[13px]">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Code client</span>
                        <span className="font-semibold">{data.clientCode}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Telephone</span>
                        <span className="font-semibold">{data.clientPhone || 'Non renseigne'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border p-4">
                    <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {infoTitle}
                    </p>
                    <div className="mt-2 space-y-1.5 font-sans text-[13px]">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Date d'operation</span>
                        <span className="font-semibold">{formatDateTime(data.date)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Mode de reglement</span>
                        <span className="font-semibold">{data.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">{amountLabels[data.type]}</span>
                        <span className="font-semibold">{formatCFA(data.amount)}</span>
                      </div>
                      {(data.details ?? []).map((detail) => (
                        <div key={`${detail.label}-${detail.value}`} className="flex justify-between gap-3">
                          <span className="text-slate-500">{detail.label}</span>
                          <span className="font-semibold text-right">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="font-sans text-[11px] uppercase tracking-[0.08em] text-slate-700">
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Article</th>
                        <th className="px-4 py-3 text-right">Poids</th>
                        <th className="px-4 py-3 text-right">Qte</th>
                        <th className="px-4 py-3 text-right">{priceColumnLabel}</th>
                        <th className="px-4 py-3 text-right">Prix total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item, index) => (
                        <tr key={`${item.description}-${index}`} className="border-t font-sans text-[13px]">
                          <td className="px-4 py-4">{index + 1}</td>
                          <td className="px-4 py-4">{item.description}</td>
                          <td className="px-4 py-4 text-right">
                            {item.weight ? `${item.weight.toFixed(2)} g` : '-'}
                          </td>
                          <td className="px-4 py-4 text-right">{item.quantity ?? 1}</td>
                          <td className="px-4 py-4 text-right">{formatCFA(item.unitPrice)}{priceSuffix}</td>
                          <td className="px-4 py-4 text-right">{formatCFA(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-[92mm] rounded-[14px] border bg-[linear-gradient(180deg,#fffdf7_0%,#ffffff_100%)] p-4">
                    <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {totalTitle}
                    </p>
                    <div className="mt-2 space-y-2 font-sans text-[13px]">
                      {summaryRows.map((row) => (
                        <div
                          key={`${row.label}-${row.value}`}
                          className={`flex justify-between gap-3 ${row.accent ? 'border-t-2 border-[#b88917] pt-3 text-[17px] font-bold' : ''}`}
                        >
                          <span className={row.accent ? '' : 'text-slate-500'}>{row.label}</span>
                          <span className="font-semibold">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_120px] items-end gap-4">
                  <div>
                    <div className="rounded-[14px] border bg-[rgba(184,137,23,0.12)] p-4 font-sans text-[13px] leading-relaxed text-slate-600">
                      {footerMessage}
                    </div>
                    {data.note ? (
                      <p className="mt-3 font-sans text-xs text-slate-500">Note: {data.note}</p>
                    ) : null}
                  </div>

                  <div className="rounded-[14px] border bg-white p-3 text-center">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt={qrLabel}
                        className="mx-auto mb-2 h-[92px] w-[92px]"
                      />
                    ) : (
                      <div className="mx-auto mb-2 h-[92px] w-[92px] animate-pulse rounded bg-slate-100" />
                    )}
                    <p className="font-sans text-[10px] uppercase tracking-[0.06em] text-slate-500">
                      {qrLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => openReceiptWindow(false)} className="flex-1">
            <Download className="mr-2 h-4 w-4" /> Ouvrir version PDF
          </Button>
          <Button variant="outline" onClick={() => openReceiptWindow(true)} className="flex-1">
            <Printer className="mr-2 h-4 w-4" /> Imprimer
          </Button>
          <Button onClick={onClose} className="flex-1 gold-gradient text-accent-foreground hover:opacity-90">
            <X className="mr-2 h-4 w-4" /> Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;
