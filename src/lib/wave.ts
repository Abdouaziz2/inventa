/**
 * Wave Business Checkout — shared pure logic.
 *
 * This module is intentionally dependency-free so it can be imported by:
 *  - the React frontend (and its vitest tests),
 *  - the Supabase Edge Functions (Deno) via a relative import.
 *
 * Amounts are computed SERVER-SIDE only (edge functions). The frontend never
 * decides the price: it only sends { plan, frequency }.
 */

export const WAVE_API_BASE_URL = 'https://api.wave.com/v1';
export const WAVE_CURRENCY = 'XOF';

export type PlanFrequency = 'monthly' | 'yearly';

export const WAVE_PLAN_IDS = ['starter', 'business', 'premium'] as const;
export type WavePlanId = (typeof WAVE_PLAN_IDS)[number];

/** Monthly price in XOF (minor unit of XOF is XOF itself). */
export const WAVE_PLAN_MONTHLY: Record<WavePlanId, number> = {
  starter: 5000,
  business: 10000,
  premium: 25000,
};

/** Yearly price in XOF. */
export const WAVE_PLAN_YEARLY: Record<WavePlanId, number> = {
  starter: 50000,
  business: 100000,
  premium: 250000,
};

export const WAVE_PLAN_NAMES: Record<WavePlanId, string> = {
  starter: 'Starter',
  business: 'Business',
  premium: 'Premium',
};

export function isWavePlanId(value: unknown): value is WavePlanId {
  return WAVE_PLAN_IDS.includes(value as WavePlanId);
}

export function isPlanFrequency(value: unknown): value is PlanFrequency {
  return value === 'monthly' || value === 'yearly';
}

/**
 * The authoritative server-side price for a plan + billing cycle.
 * Throws for unknown values so a tampered payload can never pass.
 */
export function computeWaveAmount(plan: unknown, frequency: unknown): number {
  if (!isWavePlanId(plan)) {
    throw new Error(`Plan inconnu : ${String(plan)}`);
  }
  if (!isPlanFrequency(frequency)) {
    throw new Error(`Fréquence inconnue : ${String(frequency)}`);
  }
  return frequency === 'yearly' ? WAVE_PLAN_YEARLY[plan] : WAVE_PLAN_MONTHLY[plan];
}

/** Number of months covered by a paid period. */
export function subscriptionDurationMonths(frequency: PlanFrequency): 1 | 12 {
  return frequency === 'yearly' ? 12 : 1;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Unique merchant reference sent to Wave and echoed back in webhooks. */
export function buildClientReference(userId: string): string {
  const safeId = String(userId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'inv';
  const random = Math.random().toString(36).slice(2, 8);
  return `inv-${safeId}-${Date.now().toString(36)}${random}`;
}

/** True while a subscription still grants access (status + expiry, now injected for tests). */
export function isSubscriptionActive(
  status: string | null | undefined,
  expiresAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!status || !['trialing', 'active'].includes(status)) return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > now.getTime();
}

export type CurrentSubscriptionLike = {
  planCode: string | null;
  status: string | null;
  expiresAt: string | Date | null;
  frequency: PlanFrequency | null;
};

/**
 * Compute starts_at / expires_at for a newly paid period.
 * - A user who already has the SAME plan + frequency still active gets a
 *   renewal that extends the current expiry (no double start).
 * - Any upgrade / switch / fresh purchase starts now.
 */
export function resolveSubscriptionPeriod(input: {
  current: CurrentSubscriptionLike | null;
  planCode: string;
  frequency: PlanFrequency;
  paidAt: string | Date;
}): { startsAt: string; expiresAt: string } {
  const paid = new Date(input.paidAt);
  const current = input.current;

  const canExtend =
    !!current &&
    ['trialing', 'active'].includes(current.status ?? '') &&
    !!current.expiresAt &&
    new Date(current.expiresAt).getTime() > paid.getTime() &&
    current.planCode === input.planCode &&
    current.frequency === input.frequency;

  const starts = canExtend ? new Date(current!.expiresAt as string | Date) : paid;
  const ends = addMonths(starts, subscriptionDurationMonths(input.frequency));

  return { startsAt: starts.toISOString(), expiresAt: ends.toISOString() };
}

/** Payment data echoed by Wave (webhook payload `data` or GET session body). */
export type WavePaymentLike = {
  amount?: number | null;
  currency?: string | null;
};

/** An intent we created ourselves, with the server-set amount. */
export type WaveIntentLike = {
  amount: number;
  currency?: string | null;
};

/**
 * A live payment only activates a subscription if it matches the amount we
 * asked for in the currency we operate in. Anything else is rejected.
 */
export function paymentMatchesIntent(intent: WaveIntentLike, payment: WavePaymentLike): boolean {
  return (
    Number(payment.amount) === Number(intent.amount) &&
    String(payment.currency ?? '').toUpperCase() ===
      String(intent.currency ?? WAVE_CURRENCY).toUpperCase()
  );
}

/* ---------------------------------------------------------------------------
 * Wave webhook / request signing.
 * Signature format:  Wave-Signature: t=<unix_seconds>,v1=<hex hmac-sha256>
 * Signed payload :   timestamp + raw request body (no separator).
 * ------------------------------------------------------------------------- */

export type WaveSignatureParts = { timestamp: string; signature: string };

export function parseWaveSignatureHeader(header: string | null | undefined): WaveSignatureParts | null {
  if (!header) return null;
  let timestamp = '';
  let signature = '';
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1') signature = value;
  }
  return timestamp && signature ? { timestamp, signature } : null;
}

/** Reject timestamps older/newer than the Wave window (5 minutes). */
export function isWaveTimestampValid(
  timestamp: string | number,
  now: Date = new Date(),
  maxSkewSeconds = 300,
): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSeconds = Math.floor(now.getTime() / 1000);
  return Math.abs(nowSeconds - ts) <= maxSkewSeconds;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Sign an outgoing request to the Wave API (optional extra security). */
export async function computeWaveSignatureHeader(
  secret: string,
  rawBody: string,
  now: Date = new Date(),
): Promise<string> {
  const timestamp = Math.floor(now.getTime() / 1000).toString();
  const signature = await hmacSha256Hex(secret, `${timestamp}${rawBody}`);
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify an incoming Wave webhook / request signature.
 * Returns { valid: true } only if header + timestamp window + HMAC all pass.
 */
export async function verifyWaveSignature(input: {
  header: string | null | undefined;
  rawBody: string;
  secret: string;
  now?: Date;
}): Promise<{ valid: boolean; reason: string }> {
  const parts = parseWaveSignatureHeader(input.header);
  if (!parts) return { valid: false, reason: 'signature_header_missing' };
  if (!isWaveTimestampValid(parts.timestamp, input.now ?? new Date())) {
    return { valid: false, reason: 'timestamp_out_of_window' };
  }
  const expected = await hmacSha256Hex(input.secret, `${parts.timestamp}${input.rawBody}`);
  if (!hexEqual(expected, parts.signature)) {
    return { valid: false, reason: 'signature_mismatch' };
  }
  return { valid: true, reason: 'ok' };
}