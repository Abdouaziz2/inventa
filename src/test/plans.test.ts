import { describe, expect, it } from 'vitest';
import {
  WAVE_PLAN_MONTHLY,
  WAVE_PLAN_YEARLY,
} from '@/lib/wave';
import {
  buildCatalogue,
  computeCatalogueAmount,
  fallbackCatalogue,
  findPlan,
  formatMoney,
  isLiveSubscription,
  isPlanPriceRow,
  isPlanAvailable,
  isTrialOver,
  nextRecommendedPlan,
  normalizeTrialDays,
  planDisplayName,
  trialDaysRemaining,
  trialEndsAt,
} from '@/lib/plans';

const basePlans = () => [
  {
    code: 'starter',
    name: 'Starter',
    active: true,
    recommended: false,
    displayOrder: 10,
    prices: [
      { frequency: 'monthly', amount: 5000, currency: 'XOF', active: true },
      { frequency: 'yearly', amount: 50000, currency: 'XOF', active: true },
    ],
  },
  {
    code: 'business',
    name: 'Business',
    active: true,
    recommended: true,
    displayOrder: 20,
    prices: [
      { frequency: 'monthly', amount: 10000, currency: 'XOF', active: true },
      { frequency: 'yearly', amount: 100000, currency: 'XOF', active: true },
    ],
  },
  {
    code: 'premium',
    name: 'Premium',
    active: true,
    recommended: false,
    displayOrder: 30,
    prices: [
      { frequency: 'monthly', amount: 25000, currency: 'XOF', active: true },
      { frequency: 'yearly', amount: 250000, currency: 'XOF', active: true },
    ],
  },
];

describe('fallback catalogue (wave.ts constants)', () => {
  const catalogue = fallbackCatalogue();

  it('exposes the 3 plans with the official prices and 14-day trial', () => {
    expect(catalogue.trialDurationDays).toBe(14);
    expect(catalogue.trialEnabled).toBe(true);
    expect(catalogue.currency).toBe('XOF');
    expect(catalogue.plans.map((plan) => plan.code)).toEqual(['starter', 'business', 'premium']);
    expect(catalogue.plans.find((plan) => plan.code === 'business')?.recommended).toBe(true);
  });

  it('carries the wave.ts catalogue price', () => {
    for (const plan of catalogue.plans) {
      expect(plan.prices.monthly?.amount).toBe(WAVE_PLAN_MONTHLY[plan.code as 'starter' | 'business' | 'premium']);
      expect(plan.prices.yearly?.amount).toBe(WAVE_PLAN_YEARLY[plan.code as 'starter' | 'business' | 'premium']);
    }
  });
});

describe('buildCatalogue', () => {
  it('builds a sorted catalogue and skips inactive prices', () => {
    const catalogue = buildCatalogue({
      currency: 'xof',
      trialEnabled: false,
      trialDurationDays: 21,
      plans: [
        ...basePlans(),
        {
          code: 'team',
          name: 'Équipe',
          active: true,
          displayOrder: 5,
          prices: [
            { frequency: 'monthly', amount: 100, currency: 'XOF', active: true },
            { frequency: 'yearly', amount: 1000, currency: 'XOF', active: false },
          ],
        },
        {
          code: 'legacy',
          name: 'Ancien',
          active: false,
          displayOrder: 1,
          prices: [{ frequency: 'monthly', amount: 500, currency: 'XOF', active: true }],
        },
      ],
    });

    expect(catalogue.currency).toBe('XOF');
    expect(catalogue.trialEnabled).toBe(false);
    expect(catalogue.trialDurationDays).toBe(21);
    expect(catalogue.plans[0].code).toBe('legacy');
    expect(findPlan(catalogue, 'team')?.prices.monthly?.amount ?? 0).toBe(100);
    expect(findPlan(catalogue, 'team')?.prices.yearly).toBeUndefined();
    expect(computeCatalogueAmount(catalogue, 'team', 'monthly')).toBe(100);
    expect(() => computeCatalogueAmount(catalogue, 'team', 'yearly')).toThrow('Tarif indisponible');
    expect(() => computeCatalogueAmount(catalogue, 'legacy', 'monthly')).toThrow('Plan indisponible');
  });

  it('defaults trial duration to 14 when invalid', () => {
    expect(buildCatalogue({ plans: basePlans(), trialDurationDays: 0 }).trialDurationDays).toBe(14);
    expect(buildCatalogue({ plans: basePlans(), trialDurationDays: 91 }).trialDurationDays).toBe(14);
    expect(buildCatalogue({ plans: basePlans(), trialDurationDays: 12.5 }).trialDurationDays).toBe(14);
    expect(buildCatalogue({ plans: basePlans() }).trialDurationDays).toBe(14);
    expect(normalizeTrialDays(30)).toBe(30);
    expect(normalizeTrialDays(null)).toBe(14);
  });
});

describe('computeCatalogueAmount (server-side amount resolution)', () => {
  const catalogue = buildCatalogue({ plans: basePlans() });

  it('returns the price for active plan + frequency', () => {
    expect(computeCatalogueAmount(catalogue, 'premium', 'yearly')).toBe(250000);
    expect(computeCatalogueAmount(catalogue, 'starter', 'monthly')).toBe(5000);
  });

  it('rejects unknown plans and frequencies', () => {
    expect(() => computeCatalogueAmount(catalogue, 'ultimate', 'monthly')).toThrow('Plan indisponible');
    expect(() => computeCatalogueAmount(catalogue, 'premium', 'weekly')).toThrow('Plan ou fréquence invalide');
    expect(() => computeCatalogueAmount(catalogue, undefined, 'monthly')).toThrow('Plan ou fréquence invalide');
  });

  it('rejects deactivated plans', () => {
    const disabled = buildCatalogue({
      plans: basePlans().map((plan) =>
        plan.code === 'premium' ? { ...plan, active: false } : plan,
      ),
    });
    expect(() => computeCatalogueAmount(disabled, 'premium', 'monthly')).toThrow('Plan indisponible');
    expect(isPlanAvailable(disabled, 'premium')).toBe(false);
    expect(isPlanAvailable(disabled, 'business')).toBe(true);
  });
});

describe('trial helpers', () => {
  const now = new Date('2026-09-12T10:00:00.000Z');

  it('computes the end of a trial from settings', () => {
    expect(trialEndsAt(14, now).toISOString()).toBe('2026-09-26T10:00:00.000Z');
    expect(trialEndsAt(7, now).getUTCDate()).toBe(19);
  });

  it('counts remaining days (ceiling)', () => {
    expect(trialDaysRemaining('2026-09-20T10:00:00.000Z', now)).toBe(8);
    expect(trialDaysRemaining('2026-09-12T11:00:00.000Z', now)).toBe(1);
    expect(trialDaysRemaining('2026-09-10T10:00:00.000Z', now)).toBe(0);
    expect(trialDaysRemaining(null, now)).toBe(0);
  });

  it('detects an over trial', () => {
    expect(isTrialOver('trialing', '2026-09-10T10:00:00.000Z', now)).toBe(true);
    expect(isTrialOver('trialing', '2026-09-20T10:00:00.000Z', now)).toBe(false);
    expect(isTrialOver('trialing', null, now)).toBe(false);
    expect(isTrialOver('active', '2026-09-10T10:00:00.000Z', now)).toBe(true);
  });
});

describe('live subscription check', () => {
  const now = new Date('2026-09-12T10:00:00.000Z');

  it('is live only while status + expiry allow it', () => {
    expect(isLiveSubscription('active', '2026-12-01T00:00:00.000Z', now)).toBe(true);
    expect(isLiveSubscription('trialing', null, now)).toBe(true);
    expect(isLiveSubscription('trialing', '2026-09-10T10:00:00.000Z', now)).toBe(false);
    expect(isLiveSubscription('expired', '2026-12-01T00:00:00.000Z', now)).toBe(false);
    expect(isLiveSubscription('active', '2026-09-01T00:00:00.000Z', now)).toBe(false);
    expect(isLiveSubscription(null, null, now)).toBe(false);
  });
});

describe('plan recommendation & naming', () => {
  const catalogue = buildCatalogue({ plans: basePlans() });

  it('recommends the next plan up (starter → business → premium → none)', () => {
    expect(nextRecommendedPlan(catalogue, 'starter')?.code).toBe('business');
    expect(nextRecommendedPlan(catalogue, 'business')?.code).toBe('premium');
    expect(nextRecommendedPlan(catalogue, 'premium')).toBeNull();
  });

  it('falls back to the recommended plan for unknown/new users', () => {
    expect(nextRecommendedPlan(catalogue, null)?.code).toBe('business');
    expect(nextRecommendedPlan(catalogue, 'legacy')?.code).toBe('business');
  });

  it('names plans sensibly', () => {
    expect(planDisplayName(catalogue, 'starter')).toBe('Starter');
    expect(planDisplayName(catalogue, 'legacy')).toBe('legacy');
    expect(planDisplayName(catalogue, null)).toBe('Essai gratuit');
  });
});

describe('money formatting', () => {
  it('groups thousands with narrow spaces', () => {
    expect(formatMoney(5000)).toBe('5\u202F000');
    expect(formatMoney(250000)).toBe('250\u202F000');
    expect(formatMoney(7)).toBe('7');
  });
});

describe('price row validation', () => {
  it('accepts a valid row and rejects malformed ones', () => {
    expect(isPlanPriceRow({ frequency: 'monthly', amount: 5000 })).toBe(true);
    expect(isPlanPriceRow({ frequency: 'weekly', amount: 5000 })).toBe(false);
    expect(isPlanPriceRow({ frequency: 'monthly', amount: 0 })).toBe(false);
    expect(isPlanPriceRow({ frequency: 'monthly', amount: -1 })).toBe(false);
    expect(isPlanPriceRow(null)).toBe(false);
  });
});