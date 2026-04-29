export {
  useDeposits,
  useAddDeposit,
  useSales,
  useAddSale,
  useReservations,
  useAddReservation,
  useWalletTransactions,
  type DepositWithClient,
  type ReservationWithRelations,
  type SaleWithRelations,
  type WalletTransactionWithClient,
} from '@/hooks/useDatabase';

export {
  buildDepositReceipt,
  buildReservationReceipt,
  buildReceiptOperations,
  buildSaleReceipt,
  type ReceiptOperation,
} from '@/lib/receipts';

export function calculateBalanceUsed(balance: number, salePrice: number) {
  return Math.min(balance, salePrice);
}

export function calculateRemainingAmount(total: number, paid: number) {
  return total - paid;
}
