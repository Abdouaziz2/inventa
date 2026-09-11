import { createClient } from "npm:@supabase/supabase-js@2";
import {
  WAVE_API_BASE_URL,
  computeWaveSignatureHeader,
  paymentMatchesIntent,
  resolveSubscriptionPeriod,
  type PlanFrequency,
  type WavePlanId,
} from "../../../src/lib/wave.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AuthedUser = { id: string; email?: string | null };

export async function authenticateRequest(
  request: Request,
): Promise<{ user: AuthedUser } | { error: Response }> {
  const admin = createAdminClient();
  if (!admin) return { error: json({ error: "Service indisponible." }, 503) };

  const accessToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return { error: json({ error: "Authentification requise." }, 401) };

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return { error: json({ error: "Session invalide." }, 401) };

  return { user: { id: data.user.id, email: data.user.email } };
}

export function fetchSubscription(admin: AdminClient, userId: string) {
  return admin
    .from("subscriptions")
    .select("user_id, email, plan_code, status, starts_at, expires_at, frequency, amount")
    .eq("user_id", userId)
    .maybeSingle();
}

export function fetchIntentByReference(
  admin: AdminClient,
  reference?: string | null,
  waveSessionId?: string | null,
  userId?: string | null,
) {
  if (reference) {
    let query = admin
      .from("wave_checkout_sessions")
      .select("id, user_id, plan_code, frequency, amount, currency, wave_session_id, client_reference, checkout_status, payment_status, transaction_id, last_payment_error")
      .eq("client_reference", reference);
    if (userId) query = query.eq("user_id", userId);
    return query.maybeSingle();
  }
  if (waveSessionId) {
    let query = admin
      .from("wave_checkout_sessions")
      .select("id, user_id, plan_code, frequency, amount, currency, wave_session_id, client_reference, checkout_status, payment_status, transaction_id, last_payment_error")
      .eq("wave_session_id", waveSessionId);
    if (userId) query = query.eq("user_id", userId);
    return query.maybeSingle();
  }
  return Promise.resolve({ data: null, error: { message: "missing_reference" } as never });
}

export type IntentRow = {
  id: number;
  user_id: string;
  plan_code: WavePlanId;
  frequency: PlanFrequency;
  amount: number;
  currency: string;
  wave_session_id: string | null;
  client_reference: string;
  checkout_status: string | null;
  payment_status: string | null;
  transaction_id: string | null;
  last_payment_error: unknown;
};

/**
 * Idempotent, atomic activation. The period is computed here (unit-tested)
 * and persisted via the public.record_wave_payment() transaction, which
 * records the payment exactly once (unique wave_session_id) and upserts the
 * subscription in the same statement — a replay never activates twice and a
 * charge can never be recorded without activating.
 *
 * Returns:
 *  { kind: "activated" }                  first time this payment is processed.
 *  { kind: "duplicate" }                  this session was already recorded.
 *  { kind: "amount_mismatch", reason }    payment amount != server-set amount.
 */
export async function recordSuccessfulPayment(input: {
  admin: AdminClient;
  intent: IntentRow;
  waveSessionId: string;
  transactionId: string | null;
  eventId: string;
  paidAt: string;
  amount: number;
  currency: string;
}): Promise<{ kind: "activated" } | { kind: "duplicate" } | { kind: "amount_mismatch"; reason: string }> {
  const { admin, intent } = input;

  if (
    !paymentMatchesIntent(
      { amount: intent.amount, currency: intent.currency },
      { amount: input.amount, currency: input.currency },
    )
  ) {
    const reason = `Le montant reçu (${input.amount} ${input.currency}) ne correspond pas à ${intent.amount} ${intent.currency}.`;
    await admin
      .from("wave_checkout_sessions")
      .update({ last_payment_error: { reason }, payment_status: "failed" })
      .eq("id", intent.id);
    return { kind: "amount_mismatch", reason };
  }

  const { data: current } = await fetchSubscription(admin, intent.user_id);
  const period = resolveSubscriptionPeriod({
    current: current
      ? {
          planCode: String(current.plan_code ?? ""),
          status: String(current.status ?? ""),
          expiresAt: (current.expires_at as string | null) ?? null,
          frequency: (current.frequency as PlanFrequency | null) ?? null,
        }
      : null,
    planCode: intent.plan_code,
    frequency: intent.frequency,
    paidAt: input.paidAt,
  });

  const { data, error } = await admin.rpc("record_wave_payment", {
    p_user_id: intent.user_id,
    p_plan_code: intent.plan_code,
    p_frequency: intent.frequency,
    p_amount: intent.amount,
    p_currency: intent.currency,
    p_wave_session_id: input.waveSessionId,
    p_transaction_id: input.transactionId,
    p_wave_event_id: input.eventId,
    p_paid_at: input.paidAt,
    p_starts_at: period.startsAt,
    p_expires_at: period.expiresAt,
    p_intent_id: intent.id,
  });
  if (error) throw error;

  const kind = data?.kind === "duplicate" ? "duplicate" : "activated";
  return { kind };
}

/** Record a failed payment in the ledger (idempotent) and update the intent. */
export async function recordFailedPayment(input: {
  admin: AdminClient;
  intent: IntentRow;
  waveSessionId: string;
  eventId: string;
  error: string;
}) {
  await admin
    .from("subscription_payments")
    .insert({
      user_id: input.intent.user_id,
      plan_code: input.intent.plan_code,
      frequency: input.intent.frequency,
      amount: input.intent.amount,
      currency: input.intent.currency,
      wave_session_id: input.waveSessionId,
      transaction_id: null,
      wave_event_id: input.eventId,
      status: "failed",
      last_payment_error: { reason: input.error },
      paid_at: null,
    })
    .onConflict("wave_session_id")
    .ignore();

  await admin
    .from("wave_checkout_sessions")
    .update({
      wave_session_id: input.waveSessionId,
      checkout_status: "complete",
      payment_status: "failed",
      transaction_id: null,
      last_payment_error: { reason: input.error },
    })
    .eq("id", input.intent.id);
}

/* ---------------------------------------------------------------------------
 * Outgoing calls to the Wave API.
 * Request signing (WAVE_SIGNING_SECRET, wave_sn_AKS_...) is optional.
 * ------------------------------------------------------------------------- */

export async function callWaveApi(input: {
  method: "POST" | "GET";
  path: string;
  body?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const apiKey = Deno.env.get("WAVE_API_KEY");
  const signingSecret = Deno.env.get("WAVE_SIGNING_SECRET");
  if (!apiKey) {
    return { ok: false, status: 503, data: { error: "wave_api_key_missing" } };
  }

  const rawBody = input.body ? JSON.stringify(input.body) : "";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (input.method === "POST" && signingSecret) {
    headers["Wave-Signature"] = await computeWaveSignatureHeader(signingSecret, rawBody);
  }

  try {
    const response = await fetch(`${WAVE_API_BASE_URL}${input.path}`, {
      method: input.method,
      headers,
      body: input.method === "POST" ? rawBody : undefined,
      signal: AbortSignal.timeout(input.timeoutMs ?? 15_000),
    });
    const text = await response.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = { raw: text };
      }
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      data: { error: "wave_request_failed", detail: error instanceof Error ? error.message : String(error) },
    };
  }
}