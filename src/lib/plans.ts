import {
  WAVE_CURRENCY,
  WAVE_PLAN_IDS,
  WAVE_PLAN_MONTHLY,
  WAVE_PLAN_NAMES,
  WAVE_PLAN_YEARLY,
  isPlanFrequency,
  type PlanFrequency,
  type WavePlanId,
} from './wave.ts';

export type SubscriptionState =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'canceled'
  | 'expired';

export type PlanPriceRow = {
  frequency: string;
  amount: number;
  currency?: string | null;
  active?: boolean;
};

export type PlanInput = {
  code: string;
  name: string;
  description?: string | null;
  active?: boolean;
  recommended?: boolean;
  displayOrder?: number;
  prices?: PlanPriceRow[];
};

export type PlanPrice = { amount: number; currency: string };

export type PlanConfig = {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  recommended: boolean;
  displayOrder: number;
  prices: Partial<Record<PlanFrequency, PlanPrice>>;
};

export type PlanCatalogue = {
  currency: string;
  trialEnabled: boolean;
  trialDurationDays: number;
  plans: PlanConfig[];
};

export function normalizeTrialDays(value: unknown, fallback = 14): number {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 90) return fallback;
  return days;
}

export function isPlanPriceRow(value: unknown): value is PlanPriceRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.frequency !== 'string' || !isPlanFrequency(row.frequency)) return false;
  if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount <= 0) return false;
  return true;
}

function buildPrice(freq: PlanFrequency, row: PlanPriceRow | undefined, currency: string): PlanPrice | undefined {
  if (!row || row.active === false || isPlanPriceRow(row) === false) return undefined;
  const amount = Math.round(Number(row.amount));
  if (amount <= 0) return undefined;
  const rowCurrency = typeof row.currency === 'string' && row.currency.trim() !== ''
    ? row.currency.trim().toUpperCase()
    : currency;
  return { amount, currency: rowCurrency };
}

export function buildCatalogue(input: {
  plans: PlanInput[];
  currency?: string | null;
  trialEnabled?: boolean;
  trialDurationDays?: number;
}): PlanCatalogue {
  const currency = (() => {
    if (typeof input.currency === 'string' && input.currency.trim() !== '') {
      return input.currency.trim().toUpperCase();
    }
    return WAVE_CURRENCY;
  })();

  const plans: PlanConfig[] = input.plans
    .map((plan) => {
      const pricesByFrequency: Record<string, PlanPriceRow> = {};
      for (const row of plan.prices ?? []) {
        if (row && typeof row.frequency === 'string') pricesByFrequency[row.frequency] = row;
      }
      return {
        code: plan.code,
        name: plan.name,
        description: plan.description ?? null,
        active: plan.active !== false,
        recommended: plan.recommended === true,
        displayOrder: typeof plan.displayOrder === 'number' ? plan.displayOrder : 0,
        prices: {
          monthly: buildPrice('monthly', pricesByFrequency.monthly, currency),
          yearly: buildPrice('yearly', pricesByFrequency.yearly, currency),
        },
      } satisfies PlanConfig;
    })
    .sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));

  return {
    currency,
    trialEnabled: input.trialEnabled !== false,
    trialDurationDays: normalizeTrialDays(input.trialDurationDays),
    plans,
  };
}

export function fallbackCatalogue(trialDays = 14, trialEnabled = true, currency = WAVE_CURRENCY): PlanCatalogue {
  return buildCatalogue({
    currency,
    trialEnabled,
    trialDurationDays: trialDays,
    plans: WAVE_PLAN_IDS.map((code: WavePlanId, index) => ({
      code,
      name: WAVE_PLAN_NAMES[code],
      description: null,
      active: true,
      recommended: code === 'business',
      displayOrder: (index + 1) * 10,
      prices: [
        { frequency: 'monthly', amount: WAVE_PLAN_MONTHLY[code], currency },
        { frequency: 'yearly', amount: WAVE_PLAN_YEARLY[code], currency },
      ],
    })),
  });
}

export function findPlan(catalogue: PlanCatalogue, code: string): PlanConfig | undefined {
  return catalogue.plans.find((plan) => plan.code === code);
}

export function isPlanAvailable(catalogue: PlanCatalogue, code: string): boolean {
  const plan = findPlan(catalogue, code);
  return !!plan && plan.active;
}

export function computeCatalogueAmount(catalogue: PlanCatalogue, planCode: unknown, frequency: unknown): number {
  if (typeof planCode !== 'string' || !isPlanFrequency(frequency)) {
    throw new Error('Plan ou fréquence invalide.');
  }
  const plan = findPlan(catalogue, planCode);
  if (!plan || !plan.active) throw new Error('Plan indisponible.');
  const price = plan.prices[frequency];
  if (!price || price.amount <= 0) throw new Error('Tarif indisponible pour ce plan.');
  return price.amount;
}

export function formatMoney(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
}

export function trialEndsAt(trialDays: number, now: Date = new Date()): Date {
  const days = normalizeTrialDays(trialDays);
  const end = new Date(now.getTime());
  end.setDate(end.getDate() + days);
  return end;
}

export function trialDaysRemaining(trialEndsAtDate: Date | string | null, now: Date = new Date()): number {
  if (!trialEndsAtDate) return 0;
  const diff = new Date(trialEndsAtDate).getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function isTrialOver(
  status: string | null | undefined,
  trialEndsAtDate: Date | string | null,
  now: Date = new Date(),
): boolean {
  if (status !== 'trialing') return true;
  if (!trialEndsAtDate) return false;
  return new Date(trialEndsAtDate).getTime() <= now.getTime();
}

export function isLiveSubscription(
  status: string | null | undefined,
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!status || !['trialing', 'active'].includes(status)) return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > now.getTime();
}

export function nextRecommendedPlan(catalogue: PlanCatalogue, currentPlanCode: string | null | undefined): PlanConfig | null {
  const active = catalogue.plans.filter((plan) => plan.active);
  if (active.length === 0) return null;
  if (!currentPlanCode) return active.find((plan) => plan.recommended) ?? active[active.length - 1];
  const currentIndex = active.findIndex((plan) => plan.code === currentPlanCode);
  if (currentIndex === -1) return active.find((plan) => plan.recommended) ?? active[active.length - 1];
  return active[currentIndex + 1] ?? null;
}

export function planDisplayName(catalogue: PlanCatalogue, code: string | null | undefined): string {
  if (!code) return 'Essai gratuit';
  return findPlan(catalogue, code)?.name ?? code;
}