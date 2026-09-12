import { supabase } from '@/lib/supabase';
import type { PlanFrequency, WavePlanId } from '@/lib/wave';
import { buildCatalogue, fallbackCatalogue, type PlanCatalogue, type PlanInput } from '@/lib/plans';

export type StartCheckoutInput = {
  plan: WavePlanId;
  frequency: PlanFrequency;
};

export type StartCheckoutResult = {
  wave_launch_url?: string;
  wave_session_id?: string;
  client_reference?: string;
  amount?: number;
  currency?: string;
};

export type PaymentStatusResult = {
  payment_status?: string;
  checkout_status?: string;
  activated?: boolean;
  skipped?: boolean;
  amount?: number;
  currency?: string;
  plan_code?: string;
  frequency?: string;
  transaction_id?: string | null;
  last_payment_error?: unknown;
  subscription?: {
    plan_code: string;
    status: string;
    starts_at: string;
    expires_at: string | null;
    frequency: string | null;
    amount: number | null;
  } | null;
};

export const WAVE_PAYMENT_SUCCESS_FLAG = 'inventa.payment.success';

type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  recommended: boolean;
  display_order: number;
};

type PriceRow = {
  plan_id: string;
  frequency: string;
  amount: number;
  currency: string;
  active: boolean;
};

type SettingsRow = {
  trial_enabled: boolean;
  trial_duration_days: number;
  currency: string;
};

export async function fetchPlanCatalogue(): Promise<PlanCatalogue> {
  const [{ data: plans, error: plansError }, { data: prices, error: pricesError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from('subscription_plans').select('id, code, name, description, active, recommended, display_order'),
      supabase.from('subscription_plan_prices').select('plan_id, frequency, amount, currency, active'),
      supabase.from('subscription_settings').select('trial_enabled, trial_duration_days, currency').eq('id', true).maybeSingle(),
    ]);

  if (plansError || pricesError || settingsError) {
    throw plansError ?? pricesError ?? settingsError;
  }

  if (!plans || plans.length === 0) {
    return fallbackCatalogue(settings?.trial_duration_days, settings?.trial_enabled, settings?.currency);
  }

  const planInputs: PlanInput[] = (plans as PlanRow[]).map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    active: plan.active,
    recommended: plan.recommended,
    displayOrder: plan.display_order,
    prices: (prices as PriceRow[])
      .filter((price) => price.plan_id === plan.id)
      .map((price) => ({
        frequency: price.frequency,
        amount: price.amount,
        currency: price.currency,
        active: price.active,
      })),
  }));

  const settingsRow = settings as SettingsRow | null;
  return buildCatalogue({
    plans: planInputs,
    currency: settingsRow?.currency ?? undefined,
    trialEnabled: settingsRow?.trial_enabled ?? true,
    trialDurationDays: settingsRow?.trial_duration_days ?? 14,
  });
}

async function readInvokeError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as {
        error?: string;
        message?: string;
        wave_message?: string;
        wave_status?: number;
      };
      if (body.wave_message) {
        return `Wave (${body.wave_status ?? 'erreur'}) : ${body.wave_message}`;
      }
      return body.error ?? body.message ?? 'La demande de paiement a échoué.';
    } catch {
      return 'La demande de paiement a échoué.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Le paiement Wave est indisponible pour le moment. Réessayez dans quelques instants.';
}

export async function startWaveCheckout(
  input: StartCheckoutInput,
): Promise<StartCheckoutResult> {
  const { data, error } = await supabase.functions.invoke('wave-checkout', {
    body: input,
  });
  if (error) throw new Error(await readInvokeError(error));
  return (data as StartCheckoutResult | null) ?? {};
}

export async function getPaymentStatus(input: {
  client_reference?: string;
  wave_session_id?: string;
}): Promise<PaymentStatusResult> {
  const { data, error } = await supabase.functions.invoke('subscription-status', {
    body: input,
  });
  if (error) throw new Error(await readInvokeError(error));
  return (data as PaymentStatusResult | null) ?? {};
}