import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  WAVE_PLAN_MONTHLY,
  WAVE_PLAN_YEARLY,
  WAVE_PLAN_IDS,
  addMonths,
  buildClientReference,
  computeWaveAmount,
  computeWaveSignatureHeader,
  isPlanFrequency,
  isSubscriptionActive,
  isWavePlanId,
  isWaveTimestampValid,
  parseWaveSignatureHeader,
  paymentMatchesIntent,
  resolveSubscriptionPeriod,
  subscriptionDurationMonths,
  verifyWaveSignature,
} from '@/lib/wave';

const nodeHmacHex = (secret: string, message: string) =>
  createHmac('sha256', secret).update(message).digest('hex');

describe('Wave plan catalogue (server-side source of truth)', () => {
  const expected = {
    starter: { monthly: 5000, yearly: 50000 },
    business: { monthly: 10000, yearly: 100000 },
    premium: { monthly: 25000, yearly: 250000 },
  } as const;

  it('exposes the 6 plan x frequency combinations with the official prices', () => {
    for (const plan of WAVE_PLAN_IDS) {
      expect(WAVE_PLAN_MONTHLY[plan]).toBe(expected[plan].monthly);
      expect(WAVE_PLAN_YEARLY[plan]).toBe(expected[plan].yearly);
      expect(computeWaveAmount(plan, 'monthly')).toBe(expected[plan].monthly);
      expect(computeWaveAmount(plan, 'yearly')).toBe(expected[plan].yearly);
    }
  });

  it('is guarded against unknown plans and frequencies', () => {
    for (const plan of WAVE_PLAN_IDS) {
      expect(() => computeWaveAmount(plan, 'weekly')).toThrow();
      expect(() => computeWaveAmount('ultimate', 'monthly')).toThrow();
      expect(() => computeWaveAmount(undefined, 'monthly')).toThrow();
    }
    expect(isWavePlanId('business')).toBe(true);
    expect(isWavePlanId('ultimate')).toBe(false);
    expect(isPlanFrequency('yearly')).toBe(true);
    expect(isPlanFrequency('weekly')).toBe(false);
  });

  it('computes the covered period per frequency', () => {
    expect(subscriptionDurationMonths('monthly')).toBe(1);
    expect(subscriptionDurationMonths('yearly')).toBe(12);
    const base = new Date('2026-09-11T10:00:00.000Z');
    expect(addMonths(base, 1).getUTCMonth()).toBe(9);
    expect(addMonths(base, 12).getUTCFullYear()).toBe(2027);
  });

  it('builds unique, URL-safe client references', () => {
    const a = buildClientReference('aaaaaaaa-1111-2222-3333-444444444444');
    const b = buildClientReference('aaaaaaaa-1111-2222-3333-444444444444');
    expect(a).toMatch(/^inv-[a-z0-9]{12}-/u);
    expect(a).not.toBe(b);
    expect(buildClientReference('')).toMatch(/^inv-/u);
  });
});

describe('subscription period resolution', () => {
  const paidAt = '2026-09-11T10:00:00.000Z';
  const monthly = { planCode: 'business', frequency: 'monthly' as const };

  it('starts a brand new subscription now', () => {
    const { startsAt, expiresAt } = resolveSubscriptionPeriod({
      current: null,
      planCode: 'business',
      frequency: 'monthly',
      paidAt,
    });
    expect(startsAt).toBe(paidAt);
    expect(new Date(expiresAt).getUTCMonth()).toBe(new Date(paidAt).getUTCMonth() + 1);
  });

  it('grants a full year for yearly billing', () => {
    const { startsAt, expiresAt } = resolveSubscriptionPeriod({
      current: null,
      planCode: 'premium',
      frequency: 'yearly',
      paidAt,
    });
    expect(startsAt).toBe(paidAt);
    expect(new Date(expiresAt).getUTCFullYear()).toBe(2027);
  });

  it('renews an active same-plan subscription from its current expiry', () => {
    const expiry = '2026-10-05T10:00:00.000Z';
    const { startsAt, expiresAt } = resolveSubscriptionPeriod({
      current: {
        planCode: 'business',
        status: 'active',
        expiresAt: expiry,
        frequency: 'monthly',
      },
      planCode: 'business',
      frequency: 'monthly',
      paidAt,
    });
    expect(startsAt).toBe(expiry);
    expect(new Date(expiresAt).getUTCMonth()).toBe(new Date(expiry).getUTCMonth() + 1);
  });

  it('never re-uses an already expired period', () => {
    const expired = '2026-08-01T10:00:00.000Z';
    const { startsAt } = resolveSubscriptionPeriod({
      current: {
        planCode: 'business',
        status: 'active',
        expiresAt: expired,
        frequency: 'monthly',
      },
      planCode: 'business',
      frequency: 'monthly',
      paidAt,
    });
    expect(startsAt).toBe(paidAt);
  });

  it.each(['starter', 'premium'] as const)(
    'treats a plan switch (%s) as a fresh period, not an extension',
    (otherPlan) => {
      const { startsAt } = resolveSubscriptionPeriod({
        current: {
          planCode: 'business',
          status: 'active',
          expiresAt: '2026-12-01T10:00:00.000Z',
          frequency: 'monthly',
        },
        planCode: otherPlan,
        frequency: 'monthly',
        paidAt,
      });
      expect(startsAt).toBe(paidAt);
    },
  );

  it('does not extend when the billing cycle changes', () => {
    const { startsAt } = resolveSubscriptionPeriod({
      current: {
        planCode: 'business',
        status: 'active',
        expiresAt: '2026-12-01T10:00:00.000Z',
        frequency: 'yearly',
      },
      planCode: 'business',
      frequency: 'monthly',
      paidAt,
    });
    expect(startsAt).toBe(paidAt);
  });
});

describe('subscription activation check', () => {
  it('is only active while status + expiry allow it', () => {
    const now = new Date('2026-09-11T10:00:00.000Z');
    expect(isSubscriptionActive('active', '2026-12-01T00:00:00.000Z', now)).toBe(true);
    expect(isSubscriptionActive('trialing', null, now)).toBe(true);
    expect(isSubscriptionActive('trialing', '2026-09-01T00:00:00.000Z', now)).toBe(false);
    expect(isSubscriptionActive('canceled', '2026-12-01T00:00:00.000Z', now)).toBe(false);
    expect(isSubscriptionActive('past_due', '2026-12-01T00:00:00.000Z', now)).toBe(false);
    expect(isSubscriptionActive(null, null, now)).toBe(false);
    expect(isSubscriptionActive('active', undefined, now)).toBe(true);
  });
});

describe('amount integrity between Wave and our intent', () => {
  it('accepts only the exact planned amount in XOF', () => {
    const intent = { amount: 10000, currency: 'XOF' };
    expect(paymentMatchesIntent(intent, { amount: 10000, currency: 'XOF' })).toBe(true);
    expect(paymentMatchesIntent(intent, { amount: '10000', currency: 'xof' })).toBe(true);
    expect(paymentMatchesIntent(intent, { amount: 10001, currency: 'XOF' })).toBe(false);
    expect(paymentMatchesIntent(intent, { amount: 10000, currency: 'USD' })).toBe(false);
    expect(paymentMatchesIntent(intent, { amount: null, currency: 'XOF' })).toBe(false);
  });

  it('rejects a tampered plan price', () => {
    const paid = computeWaveAmount('premium', 'yearly');
    const attempted = { amount: 100, currency: 'XOF' };
    expect(paymentMatchesIntent({ amount: paid, currency: 'XOF' }, attempted)).toBe(false);
  });
});

describe('Wave signature format (webhook + request signing)', () => {
  const secret = 'wave_sn_WHS_test_only';

  it('parses the documented header layout', () => {
    expect(parseWaveSignatureHeader('t=1667920421,v1=abc')).toEqual({
      timestamp: '1667920421',
      signature: 'abc',
    });
    expect(parseWaveSignatureHeader(null)).toBeNull();
    expect(parseWaveSignatureHeader('v1=abc')).toBeNull();
    expect(parseWaveSignatureHeader('t=1667920421')).toBeNull();
  });

  it('enforces the 5-minute timestamp window', () => {
    const now = new Date('2026-09-11T10:00:10.000Z');
    expect(isWaveTimestampValid(String(Math.floor(now.getTime() / 1000) - 240), now)).toBe(true);
    expect(isWaveTimestampValid(String(Math.floor(now.getTime() / 1000) - 300), now)).toBe(true);
    expect(isWaveTimestampValid(String(Math.floor(now.getTime() / 1000) - 301), now)).toBe(false);
    expect(isWaveTimestampValid(String(Math.floor(now.getTime() / 1000) + 301), now)).toBe(false);
    expect(isWaveTimestampValid('not-a-number', now)).toBe(false);
  });

  it('signs over timestamp + raw body and verifies a matching header', async () => {
    const body = JSON.stringify({ event_type: 'checkout.session.completed', data: { id: 'dlw4v416z9klZI_s' } });
    const now = new Date('2026-09-11T10:00:10.000Z');
    const header = await computeWaveSignatureHeader(secret, body, now);
    const timestamp = header.match(/t=(\d+)/)?.[1] ?? '';

    expect(header).toBe(`t=${timestamp},v1=${nodeHmacHex(secret, `${timestamp}${body}`)}`);
    expect(await verifyWaveSignature({ header, rawBody: body, secret, now })).toEqual({
      valid: true,
      reason: 'ok',
    });
  });

  it('rejects a tampered body, wrong secret, stale timestamp and missing header', async () => {
    const body = JSON.stringify({ event_type: 'checkout.session.completed', data: { id: 'dlw4v416z9klZI_s', amount: 5000 } });
    const now = new Date('2026-09-11T10:00:10.000Z');

    const goodHeader = await computeWaveSignatureHeader(secret, body, now);
    expect((await verifyWaveSignature({ header: goodHeader, rawBody: body, secret, now })).valid).toBe(true);

    const tamperedBody = JSON.stringify({ event_type: 'checkout.session.completed', data: { id: 'dlw4v416z9klZI_s', amount: 1 } });
    expect((await verifyWaveSignature({ header: goodHeader, rawBody: tamperedBody, secret, now })).valid).toBe(false);

    expect((await verifyWaveSignature({ header: goodHeader, rawBody: body, secret: 'wrong_secret', now })).valid).toBe(false);

    const staleHeader = await computeWaveSignatureHeader(secret, body, new Date(now.getTime() - 10 * 60 * 1000));
    expect((await verifyWaveSignature({ header: staleHeader, rawBody: body, secret, now })).valid).toBe(false);

    expect((await verifyWaveSignature({ header: null, rawBody: body, secret, now })).valid).toBe(false);
  });
});

describe('Wave merchant payment link', () => {
  it('generates the direct Wave merchant URL with the specified dynamic amount', async () => {
    const { buildWaveMerchantUrl, startWaveCheckout } = await import('@/services/subscriptions');
    expect(buildWaveMerchantUrl(11500)).toBe('https://pay.wave.com/m/M_sn_rcEoxhsoOgeM/c/sn/?amount=11500');
    expect(buildWaveMerchantUrl(7500)).toBe('https://pay.wave.com/m/M_sn_rcEoxhsoOgeM/c/sn/?amount=7500');
    expect(buildWaveMerchantUrl(25000)).toBe('https://pay.wave.com/m/M_sn_rcEoxhsoOgeM/c/sn/?amount=25000');

    const result = await startWaveCheckout({
      plan: 'business',
      frequency: 'monthly',
      amount: 11500,
    });
    expect(result.wave_launch_url).toBe('https://pay.wave.com/m/M_sn_rcEoxhsoOgeM/c/sn/?amount=11500');
    expect(result.amount).toBe(11500);
    expect(result.currency).toBe('XOF');
  });
});