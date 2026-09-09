import type { ReceiptData } from '@/components/ReceiptModal';
import type {
  Client,
  Buyback,
  BuybackWithClient,
  CustomerOrderWithClient,
  DepositWithClient,
  Jewelry,
  ReservationWithRelations,
  SaleWithRelations,
  SaleReturn,
  SaleReturnWithClient,
} from '@/hooks/useDatabase';
import { formatCFA } from '@/lib/format';
import { formatJewelryMaterial, getJewelryTotalPrice } from '@/features/jewelry';

export type ReceiptOperation = {
  type: 'deposit' | 'sale' | 'reservation' | 'order' | 'buyback' | 'return';
  id: string;
  documentNumber: string;
  client: string;
  amount: number;
  date: string;
  label: string;
  paymentMethod?: string;
};

export function buildCustomerOrderReceipt(
  client: Client,
  order: Pick<
    CustomerOrderWithClient,
    | 'document_number'
    | 'description'
    | 'quantity'
    | 'estimated_weight'
    | 'estimated_total'
    | 'deposit_amount'
    | 'remaining_amount'
    | 'expected_date'
    | 'notes'
    | 'created_at'
  > & { amount_received?: number },
): ReceiptData {
  return {
    type: 'order',
    invoiceNumber: order.document_number,
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: order.deposit_amount,
    date: order.created_at,
    paymentMethod: order.deposit_amount > 0 ? 'Acompte de commande' : 'Aucun acompte',
    taxRate: 0,
    note: order.notes || undefined,
    items: [
      {
        description: order.description,
        quantity: order.quantity,
        weight: order.estimated_weight ?? null,
        unitPrice: order.estimated_total / order.quantity,
        totalPrice: order.estimated_total,
      },
    ],
    details: [
      {
        label: 'Date prevue',
        value: order.expected_date
          ? new Date(`${order.expected_date}T00:00:00`).toLocaleDateString('fr-FR')
          : 'Non définie',
      },
      { label: 'Montant estimé', value: formatCFA(order.estimated_total) },
      { label: 'Acompte versé', value: formatCFA(order.deposit_amount) },
      { label: 'Reste à payer', value: formatCFA(order.remaining_amount) },
    ],
  };
}

export function buildBuybackReceipt(client: Client, buyback: Buyback): ReceiptData {
  return {
    type: 'buyback',
    invoiceNumber: buyback.document_number,
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: buyback.purchase_amount,
    date: buyback.created_at,
    paymentMethod: buyback.payment_method,
    note: buyback.notes || undefined,
    items: [{
      description: buyback.description,
      quantity: 1,
      weight: buyback.weight,
      unitPrice: buyback.purchase_amount,
      totalPrice: buyback.purchase_amount,
    }],
    details: [
      { label: 'Opération', value: 'Achat retour' },
      { label: 'Justificatif', value: buyback.proof_type },
      { label: 'Référence facture', value: buyback.proof_reference },
      { label: 'Nom sur la facture', value: buyback.proof_owner_name },
      { label: 'Propriété vérifiée', value: buyback.ownership_verified ? 'Oui' : 'Non' },
      { label: 'Montant payé', value: formatCFA(buyback.purchase_amount) },
    ],
  };
}

export function buildSaleReturnReceipt(
  client: Client,
  saleReturn: SaleReturn,
  sale: SaleWithRelations,
): ReceiptData {
  return {
    type: 'return',
    invoiceNumber: saleReturn.document_number,
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: saleReturn.refund_amount,
    date: saleReturn.created_at,
    paymentMethod: saleReturn.payment_method,
    note: saleReturn.reason,
    items: sale.items.map((item) => ({
      description: item.jewelry_name,
      quantity: item.quantity,
      weight: item.weight,
      unitPrice: item.price_per_gram,
      totalPrice: item.line_total,
    })),
    details: [
      { label: 'Vente origine', value: sale.document_number },
      { label: 'Montant remboursé', value: formatCFA(saleReturn.refund_amount) },
    ],
  };
}

export function buildDepositReceipt(
  client: Client,
  deposit: Pick<DepositWithClient, 'amount' | 'created_at' | 'document_number' | 'note'>,
  previousBalance: number,
): ReceiptData {
  return {
    type: 'deposit',
    invoiceNumber: deposit.document_number,
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: deposit.amount,
    date: deposit.created_at,
    paymentMethod: 'Dépôt libre',
    taxRate: 0,
    note: deposit.note || undefined,
    items: [
      {
        description: 'Dépôt sur compte client',
        quantity: 1,
        weight: null,
        unitPrice: deposit.amount,
        totalPrice: deposit.amount,
      },
    ],
    details: [
      { label: 'Opération', value: 'Dépôt de fonds' },
      { label: 'Ancien solde', value: formatCFA(previousBalance) },
      { label: 'Montant déposé', value: formatCFA(deposit.amount) },
      { label: 'Nouveau solde', value: formatCFA(previousBalance + deposit.amount) },
    ],
  };
}

export function buildSaleReceipt(
  client: Client,
  jewelry: Jewelry,
  sale: Pick<
    SaleWithRelations,
    | 'document_number'
    | 'total_price'
    | 'paid_from_balance'
    | 'paid_amount'
    | 'payment_method'
    | 'remaining_amount'
    | 'change_amount'
    | 'change_to_balance'
    | 'created_at'
    | 'items'
  >,
): ReceiptData {
  const items =
    sale.items.length > 0
      ? sale.items.map((item) => ({
          description: `${item.jewelry_name} (${formatJewelryMaterial(item.material_type)})`,
          quantity: item.quantity,
          weight: item.weight,
          unitPrice: item.price_per_gram,
          totalPrice: item.line_total,
        }))
      : [
          {
            description: jewelry.name,
            quantity: 1,
            weight: jewelry.weight,
            unitPrice: jewelry.price_per_gram,
            totalPrice: sale.total_price,
          },
        ];

  return {
    type: 'sale',
    invoiceNumber: sale.document_number,
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: sale.total_price,
    date: sale.created_at,
    paymentMethod: sale.payment_method,
    taxRate: 0,
    items,
    details: [
      { label: 'Nombre d articles', value: String(items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)) },
      { label: 'Mode de paiement', value: sale.payment_method },
      { label: 'Total facture', value: formatCFA(sale.total_price) },
      { label: 'Payé via solde', value: formatCFA(sale.paid_from_balance) },
      ...(sale.amount_received && sale.amount_received > sale.paid_amount
        ? [{ label: 'Montant remis', value: formatCFA(sale.amount_received) }]
        : []),
      { label: 'Montant encaissé', value: formatCFA(sale.paid_amount) },
      { label: 'Montant total payé', value: formatCFA(sale.paid_from_balance + sale.paid_amount) },
      { label: 'Reste à payer', value: formatCFA(sale.remaining_amount) },
      ...(sale.change_amount > 0 ? [{ label: 'Monnaie rendue', value: formatCFA(sale.change_amount) }] : []),
    ],
  };
}

export function buildReservationReceipt(
  client: Client,
  jewelry: Jewelry,
  reservation: Pick<
    ReservationWithRelations,
    'document_number' | 'deposit_amount' | 'remaining_amount' | 'created_at'
  >,
): ReceiptData {
  return {
    type: 'reservation',
    invoiceNumber: reservation.document_number,
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: reservation.deposit_amount,
    date: reservation.created_at,
    paymentMethod: 'Acompte de réservation',
    taxRate: 0,
    items: [
      {
        description: `Réservation - ${jewelry.name}`,
        quantity: 1,
        weight: null,
        unitPrice: reservation.deposit_amount,
        totalPrice: reservation.deposit_amount,
      },
    ],
    details: [
      { label: 'Bijou réservé', value: jewelry.name },
      { label: 'Matière', value: formatJewelryMaterial(jewelry.material_type) },
      { label: 'Code bijou', value: jewelry.code },
      { label: 'Acompte versé', value: formatCFA(reservation.deposit_amount) },
      { label: 'Prix final', value: 'À définir lors de la vente' },
    ],
  };
}

export function buildReceiptOperations(
  deposits: DepositWithClient[],
  sales: SaleWithRelations[],
  reservations: ReservationWithRelations[] = [],
  orders: CustomerOrderWithClient[] = [],
  buybacks: BuybackWithClient[] = [],
  saleReturns: SaleReturnWithClient[] = [],
): ReceiptOperation[] {
  return [
    ...deposits.map((deposit) => ({
      type: 'deposit' as const,
      id: deposit.id,
      documentNumber: deposit.document_number,
      client: deposit.clients?.name || '—',
      amount: deposit.amount,
      date: deposit.created_at,
      label: deposit.status === 'cancelled' ? 'Dépôt annulé' : 'Dépôt',
      paymentMethod: deposit.status === 'cancelled' ? 'Annulé' : 'Dépôt en caisse',
    })),
    ...sales.map((sale) => ({
      type: 'sale' as const,
      id: sale.id,
      documentNumber: sale.document_number,
      client: sale.clients?.name || 'Client comptoir',
      amount: sale.total_price,
      date: sale.created_at,
      label: 'Vente',
      paymentMethod: sale.payment_method,
    })),
    ...reservations.map((reservation) => ({
      type: 'reservation' as const,
      id: reservation.id,
      documentNumber: reservation.document_number,
      client: reservation.clients?.name || '—',
      amount: reservation.deposit_amount,
      date: reservation.created_at,
      label: 'Réservation',
      paymentMethod: 'Acompte de réservation',
    })),
    ...orders.map((order) => ({
      type: 'order' as const,
      id: order.id,
      documentNumber: order.document_number,
      client: order.clients?.name || '—',
      amount: order.estimated_total,
      date: order.created_at,
      label: 'Commande',
      paymentMethod: order.deposit_amount > 0 ? 'Acompte de commande' : 'Aucun acompte',
    })),
    ...buybacks.map((item) => ({
      type: 'buyback' as const,
      id: item.id,
      documentNumber: item.document_number,
      client: item.clients?.name || '—',
      amount: item.purchase_amount,
      date: item.created_at,
      label: 'Achat retour',
      paymentMethod: item.payment_method,
    })),
    ...saleReturns.map((item) => ({
      type: 'return' as const,
      id: item.id,
      documentNumber: item.document_number,
      client: item.clients?.name || '—',
      amount: item.refund_amount,
      date: item.created_at,
      label: 'Remboursement',
      paymentMethod: item.payment_method,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));
}
