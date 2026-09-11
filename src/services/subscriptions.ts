import { supabase } from '@/lib/supabase';
import type { PlanFrequency, WavePlanId } from '@/lib/wave';

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

async function readInvokeError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: string; message?: string };
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