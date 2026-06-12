import type { ReceiptData } from '@/components/ReceiptModal';
import type {
  Client,
  DepositWithClient,
  Jewelry,
  ReservationWithRelations,
  SaleWithRelations,
} from '@/hooks/useDatabase';
import { formatCFA } from '@/lib/format';
import { formatJewelryMaterial, getJewelryTotalPrice } from '@/features/jewelry';

export type ReceiptOperation = {
  type: 'deposit' | 'sale' | 'reservation';
  id: string;
  documentNumber: string;
  client: string;
  amount: number;
  date: string;
  label: string;
  paymentMethod?: string;
};

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
    paymentMethod: 'Depot libre',
    taxRate: 0,
    note: deposit.note || undefined,
    items: [
      {
        description: 'Depot sur compte client',
        quantity: 1,
        weight: null,
        unitPrice: deposit.amount,
        totalPrice: deposit.amount,
      },
    ],
    details: [
      { label: 'Operation', value: 'Depot de fonds' },
      { label: 'Ancien solde', value: formatCFA(previousBalance) },
      { label: 'Montant depose', value: formatCFA(deposit.amount) },
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
      { label: 'Paye via solde', value: formatCFA(sale.paid_from_balance) },
      { label: 'Montant encaisse', value: formatCFA(sale.paid_amount) },
      { label: 'Montant total paye', value: formatCFA(sale.paid_from_balance + sale.paid_amount) },
      { label: 'Reste a payer', value: formatCFA(sale.remaining_amount) },
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
  const totalPrice = getJewelryTotalPrice(jewelry);
  return {
    type: 'reservation',
    invoiceNumber: reservation.document_number,
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: reservation.deposit_amount,
    date: reservation.created_at,
    paymentMethod: 'Acompte de reservation',
    taxRate: 0,
    items: [
      {
        description: `Reservation - ${jewelry.name}`,
        quantity: 1,
        weight: jewelry.weight,
        unitPrice: jewelry.price_per_gram,
        totalPrice,
      },
    ],
    details: [
      { label: 'Bijou reserve', value: jewelry.name },
      { label: 'Matiere', value: formatJewelryMaterial(jewelry.material_type) },
      { label: 'Code bijou', value: jewelry.code },
      { label: 'Poids', value: `${jewelry.weight.toFixed(2)} g` },
      { label: 'Prix total bijou', value: formatCFA(totalPrice) },
      { label: 'Acompte verse', value: formatCFA(reservation.deposit_amount) },
      { label: 'Reste a payer', value: formatCFA(reservation.remaining_amount) },
    ],
  };
}

export function buildReceiptOperations(
  deposits: DepositWithClient[],
  sales: SaleWithRelations[],
  reservations: ReservationWithRelations[] = [],
): ReceiptOperation[] {
  return [
    ...deposits.map((deposit) => ({
      type: 'deposit' as const,
      id: deposit.id,
      documentNumber: deposit.document_number,
      client: deposit.clients?.name || '—',
      amount: deposit.amount,
      date: deposit.created_at,
      label: 'Depot',
      paymentMethod: 'Depot en caisse',
    })),
    ...sales.map((sale) => ({
      type: 'sale' as const,
      id: sale.id,
      documentNumber: sale.document_number,
      client: sale.clients?.name || '—',
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
      label: 'Reservation',
      paymentMethod: 'Acompte de reservation',
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));
}
