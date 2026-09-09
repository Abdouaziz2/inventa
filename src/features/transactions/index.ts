export {
  useDeposits,
  useAddDeposit,
  useCancelDeposit,
  usePurgeTestData,
  useSales,
  useAddSale,
  useReservations,
  useAddReservation,
  useCancelReservation,
  useCustomerOrders,
  useWalletTransactions,
  type DepositWithClient,
  type CustomerOrderWithClient,
  type ReservationWithRelations,
  type SaleWithRelations,
  type WalletTransactionWithClient,
} from '@/hooks/useDatabase';

export {
  buildDepositReceipt,
  buildCustomerOrderReceipt,
  buildBuybackReceipt,
  buildSaleReturnReceipt,
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
