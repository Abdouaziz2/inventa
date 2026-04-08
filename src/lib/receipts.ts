import type { ReceiptData } from '@/components/ReceiptModal';
import type {
  Client,
  DepositWithClient,
  Jewelry,
  ReservationWithRelations,
  SaleWithRelations,
} from '@/hooks/useDatabase';
import { formatCFA } from '@/lib/format';
import { formatJewelryMaterial } from '@/features/jewelry';

export type ReceiptOperation = {
  type: 'deposit' | 'sale' | 'reservation';
  id: string;
  client: string;
  amount: number;
  date: string;
  label: string;
};

const createDocumentNumber = (prefix: 'FAC' | 'DEP' | 'RES') => {
  const now = new Date();
  const compactDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const compactTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${compactDate}-${compactTime}-${randomSuffix}`;
};

const getSalePaymentMethod = (balanceUsed: number, remaining: number) => {
  if (balanceUsed > 0 && remaining > 0) return 'Solde client + especes';
  if (balanceUsed > 0) return 'Solde client';
  return 'Especes';
};

export function buildDepositReceipt(client: Client, amount: number, note?: string): ReceiptData {
  return {
    type: 'deposit',
    invoiceNumber: createDocumentNumber('DEP'),
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount,
    date: new Date().toISOString(),
    paymentMethod: 'Depot en caisse',
    taxRate: 0,
    note: note || undefined,
    items: [
      {
        description: 'Approvisionnement du compte client',
        quantity: 1,
        weight: null,
        unitPrice: amount,
        totalPrice: amount,
      },
    ],
    details: [
      { label: 'Ancien solde', value: formatCFA(client.balance) },
      { label: 'Nouveau solde', value: formatCFA(client.balance + amount) },
    ],
  };
}

export function buildSaleReceipt(client: Client, jewelry: Jewelry, balanceUsed: number, remaining: number): ReceiptData {
  return {
    type: 'sale',
    invoiceNumber: createDocumentNumber('FAC'),
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: jewelry.sale_price,
    date: new Date().toISOString(),
    paymentMethod: getSalePaymentMethod(balanceUsed, remaining),
    taxRate: 0,
    items: [
      {
        description: jewelry.name,
        quantity: 1,
        weight: jewelry.weight,
        unitPrice: jewelry.sale_price,
        totalPrice: jewelry.sale_price,
      },
    ],
    details: [
      { label: 'Matiere', value: formatJewelryMaterial(jewelry.material_type) },
      { label: 'Categorie', value: jewelry.category },
      { label: 'Prix/gramme', value: jewelry.price_per_gram > 0 ? formatCFA(jewelry.price_per_gram) : 'N/A' },
      { label: 'Paye via solde', value: formatCFA(balanceUsed) },
      { label: 'Paye en especes', value: formatCFA(remaining) },
    ],
  };
}

export function buildReservationReceipt(client: Client, jewelry: Jewelry, depositAmount: number, remaining: number): ReceiptData {
  return {
    type: 'reservation',
    invoiceNumber: createDocumentNumber('RES'),
    clientName: client.name,
    clientCode: client.code,
    clientPhone: client.phone,
    amount: depositAmount,
    date: new Date().toISOString(),
    paymentMethod: 'Acompte de reservation',
    taxRate: 0,
    items: [
      {
        description: `Reservation - ${jewelry.name}`,
        quantity: 1,
        weight: jewelry.weight,
        unitPrice: depositAmount,
        totalPrice: depositAmount,
      },
    ],
    details: [
      { label: 'Matiere', value: formatJewelryMaterial(jewelry.material_type) },
      { label: 'Prix total bijou', value: formatCFA(jewelry.sale_price) },
      { label: 'Acompte verse', value: formatCFA(depositAmount) },
      { label: 'Reste a payer', value: formatCFA(remaining) },
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
      client: deposit.clients?.name || '—',
      amount: deposit.amount,
      date: deposit.created_at,
      label: 'Depot',
    })),
    ...sales.map((sale) => ({
      type: 'sale' as const,
      id: sale.id,
      client: sale.clients?.name || '—',
      amount: sale.total_price,
      date: sale.created_at,
      label: 'Vente',
    })),
    ...reservations.map((reservation) => ({
      type: 'reservation' as const,
      id: reservation.id,
      client: reservation.clients?.name || '—',
      amount: reservation.deposit_amount,
      date: reservation.created_at,
      label: 'Reservation',
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));
}
