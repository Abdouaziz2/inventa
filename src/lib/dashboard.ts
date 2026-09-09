type DashboardSale = {
  total_price: number;
  paid_from_balance: number;
  paid_amount: number;
  remaining_amount: number;
};

type DashboardDeposit = {
  amount: number;
  status?: 'active' | 'cancelled';
};

type DashboardBuyback = {
  purchase_amount: number;
};

export const calculateDashboardFinancials = (
  sales: DashboardSale[],
  deposits: DashboardDeposit[],
  buybacks: DashboardBuyback[],
) => {
  const revenue = sales.reduce((sum, sale) => sum + sale.total_price, 0);
  const saleCollections = sales.reduce((sum, sale) => {
    const amountDueOutsideBalance = Math.max(0, sale.total_price - sale.paid_from_balance);
    return sum + Math.min(sale.paid_amount, amountDueOutsideBalance);
  }, 0);

  return {
    revenue,
    collections: saleCollections + deposits.reduce(
      (sum, deposit) => sum + (deposit.status === 'cancelled' ? 0 : deposit.amount),
      0,
    ),
    creditGranted: sales.reduce((sum, sale) => sum + sale.remaining_amount, 0),
    returnsPaid: buybacks.reduce((sum, buyback) => sum + buyback.purchase_amount, 0),
  };
};
