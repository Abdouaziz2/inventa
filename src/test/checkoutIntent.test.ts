import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearCheckoutIntent,
  getCheckoutIntent,
  saveCheckoutIntent,
} from '@/lib/checkoutIntent';

describe('checkoutIntent module', () => {
  beforeEach(() => {
    clearCheckoutIntent();
  });

  it('saves and retrieves a checkout intent with plan and frequency', () => {
    saveCheckoutIntent({
      plan: 'business',
      frequency: 'monthly',
      amount: 11500,
    });

    const intent = getCheckoutIntent();
    expect(intent).not.toBeNull();
    expect(intent?.plan).toBe('business');
    expect(intent?.frequency).toBe('monthly');
    expect(intent?.amount).toBe(11500);
    expect(intent?.isTrial).toBeUndefined();
    expect(typeof intent?.createdAt).toBe('number');
  });

  it('saves and retrieves a free trial intent', () => {
    saveCheckoutIntent({
      isTrial: true,
    });

    const intent = getCheckoutIntent();
    expect(intent).not.toBeNull();
    expect(intent?.isTrial).toBe(true);
    expect(intent?.plan).toBeUndefined();
  });

  it('clears the intent properly', () => {
    saveCheckoutIntent({
      plan: 'starter',
      frequency: 'yearly',
      amount: 65000,
    });

    clearCheckoutIntent();
    expect(getCheckoutIntent()).toBeNull();
  });
});

