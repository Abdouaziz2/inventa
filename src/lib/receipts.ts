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
};

const getMultiPaymentMethod = (
  sale: Pick<
    SaleWithRelations,
    'paid_from_balance' | 'paid_cash' | 'paid_mobile_money' | 'paid_card' | 'paid_other'
  >,
) => {
  const methods = [
    sale.paid_from_balance > 0 ? 'Solde client' : null,
    sale.paid_cash > 0 ? 'Especes' : null,
    sale.paid_mobile_money > 0 ? 'Mobile money' : null,
    sale.paid_card > 0 ? 'Carte' : null,
    sale.paid_other > 0 ? 'Autre' : null,
  ].filter(Boolean);

  return methods.length > 0 ? methods.join(' + ') : 'Non regle';
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
    paymentMethod: 'Depot en caisse',
    taxRate: 0,
    note: deposit.note || undefined,
    items: [
      {
        description: 'Approvisionnement du compte client',
        quantity: 1,
        weight: null,
        unitPrice: deposit.amount,
        totalPrice: deposit.amount,
      },
    ],
    details: [
      { label: 'Ancien solde', value: formatCFA(previousBalance) },
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
    | 'paid_cash'
    | 'paid_mobile_money'
    | 'paid_card'
    | 'paid_other'
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
          description: item.jewelry_name,
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
    paymentMethod: getMultiPaymentMethod(sale),
    taxRate: 0,
    items,
    details: [
      { label: 'Total facture', value: formatCFA(sale.total_price) },
      { label: 'Paye via solde', value: formatCFA(sale.paid_from_balance) },
      { label: 'Paye en especes', value: formatCFA(sale.paid_cash) },
      { label: 'Paye mobile money', value: formatCFA(sale.paid_mobile_money) },
      { label: 'Paye carte', value: formatCFA(sale.paid_card) },
      { label: 'Paye autre', value: formatCFA(sale.paid_other) },
      { label: 'Reste a payer', value: formatCFA(sale.remaining_amount) },
      { label: 'Monnaie rendue', value: formatCFA(sale.change_amount) },
      { label: 'Surplus ajoute au solde', value: formatCFA(sale.change_to_balance) },
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
      { label: 'Matiere', value: formatJewelryMaterial(jewelry.material_type) },
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
    })),
    ...sales.map((sale) => ({
      type: 'sale' as const,
      id: sale.id,
      documentNumber: sale.document_number,
      client: sale.clients?.name || '—',
      amount: sale.total_price,
      date: sale.created_at,
      label: 'Vente',
    })),
    ...reservations.map((reservation) => ({
      type: 'reservation' as const,
      id: reservation.id,
      documentNumber: reservation.document_number,
      client: reservation.clients?.name || '—',
      amount: reservation.deposit_amount,
      date: reservation.created_at,
      label: 'Reservation',
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));
}
