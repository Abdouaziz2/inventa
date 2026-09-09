import { describe, expect, it } from 'vitest';
import { calculateDashboardFinancials } from '@/lib/dashboard';

describe('dashboard financial indicators', () => {
  it('does not count returned change as an encashment', () => {
    expect(
      calculateDashboardFinancials(
        [{
          total_price: 100_000,
          paid_from_balance: 0,
          paid_amount: 150_000,
          remaining_amount: 0,
        }],
        [],
        [],
      ),
    ).toEqual({
      revenue: 100_000,
      collections: 100_000,
      creditGranted: 0,
      returnsPaid: 0,
    });
  });

  it('separates sales value, collections, credit and paid returns', () => {
    expect(
      calculateDashboardFinancials(
        [{
          total_price: 200_000,
          paid_from_balance: 50_000,
          paid_amount: 100_000,
          remaining_amount: 50_000,
        }],
        [{ amount: 25_000 }],
        [{ purchase_amount: 30_000 }],
      ),
    ).toEqual({
      revenue: 200_000,
      collections: 125_000,
      creditGranted: 50_000,
      returnsPaid: 30_000,
    });
  });

  it('ignores cancelled deposits in collections', () => {
    expect(
      calculateDashboardFinancials(
        [],
        [
          { amount: 25_000, status: 'active' },
          { amount: 75_000, status: 'cancelled' },
        ],
        [],
      ),
    ).toEqual({
      revenue: 0,
      collections: 25_000,
      creditGranted: 0,
      returnsPaid: 0,
    });
  });
});
