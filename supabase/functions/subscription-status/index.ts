import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { isSubscriptionActive } from "../../../src/lib/wave.ts";
import {
  authenticateRequest,
  callWaveApi,
  corsHeaders,
  createAdminClient,
  fetchIntentByReference,
  fetchSubscription,
  json,
  recordFailedPayment,
  recordSuccessfulPayment,
  type AdminClient,
  type IntentRow,
} from "../_shared/wave.ts";

const PENDING_STATUSES = ["processing", "pending", "open"];

async function reconcile(admin: AdminClient, intent: IntentRow) {
  if (!intent.wave_session_id) {
    return { payment_status: "open", activated: false };
  }

  const wave = await callWaveApi({
    method: "GET",
    path: `/checkout/sessions/${encodeURIComponent(intent.wave_session_id)}`,
  });

  if (!wave.ok) {
    throw new Error("wave_unreachable");
  }

  const paymentStatus = String(wave.data.payment_status ?? intent.payment_status ?? "processing");
  const checkoutStatus = String(wave.data.checkout_status ?? intent.checkout_status ?? "open");
  const amount = Number(wave.data.amount ?? intent.amount);
  const currency = String(wave.data.currency ?? intent.currency ?? "XOF");
  const transactionId = wave.data.transaction_id ? String(wave.data.transaction_id) : null;

  let activated = false;
  let skipped = false;

  if (paymentStatus === "succeeded") {
    const result = await recordSuccessfulPayment({
      admin,
      intent,
      waveSessionId: intent.wave_session_id,
      transactionId,
      eventId: `completed-${intent.wave_session_id}`,
      paidAt: String(wave.data.when_completed ?? new Date().toISOString()),
      amount,
      currency,
    });
    if (result.kind === "activated") {
      activated = true;
    } else if (result.kind === "duplicate") {
      const { data: subscription } = await fetchSubscription(admin, intent.user_id);
      activated = isSubscriptionActive(
        subscription?.status as string | null,
        (subscription?.expires_at as string | null) ?? null,
      );
    } else {
      skipped = true;
    }
  } else if (["failed", "cancelled", "expired"].includes(paymentStatus)) {
    await recordFailedPayment({
      admin,
      intent,
      waveSessionId: intent.wave_session_id,
      eventId: `failed-${intent.wave_session_id}`,
      error: paymentStatus,
    });
  }

  return { payment_status: paymentStatus, checkout_status: checkoutStatus, activated, skipped };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const admin = createAdminClient();
  if (!admin) return json({ error: "Service indisponible." }, 503);

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  let payload: { client_reference?: unknown; wave_session_id?: unknown; session?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }

  const clientReference = payload.client_reference
    ? String(payload.client_reference)
    : null;
  const waveSessionId = payload.wave_session_id
    ? String(payload.wave_session_id)
    : payload.session
      ? String(payload.session)
      : null;

  if (!clientReference && !waveSessionId) {
    return json({ error: "Référence de paiement manquante." }, 400);
  }

  const { data: intent, error: intentError } = await fetchIntentByReference(
    admin,
    clientReference,
    waveSessionId,
    auth.user.id,
  );
  if (intentError) {
    console.error("Intent lookup failed:", intentError);
    return json({ error: "Impossible de retrouver le paiement." }, 500);
  }
  if (!intent) {
    return json({ error: "Paiement introuvable pour ce compte." }, 404);
  }

  let reconciliation: { payment_status: string; checkout_status: string; activated: boolean; skipped?: boolean };
  try {
    reconciliation = await reconcile(admin, intent as IntentRow);
  } catch {
    return json(
      {
        error: "Impossible de confirmer le paiement auprès de Wave pour le moment.",
        payment_status: intent.payment_status,
        checkout_status: intent.checkout_status,
        activated: false,
      },
      502,
    );
  }

  const { data: subscription } = await fetchSubscription(admin, auth.user.id);

  return json({
    payment_status: reconciliation.payment_status in PENDING_STATUSES ? "processing" : reconciliation.payment_status,
    checkout_status: reconciliation.checkout_status,
    activated: reconciliation.activated,
    skipped: reconciliation.skipped ?? false,
    amount: intent.amount,
    currency: intent.currency,
    plan_code: intent.plan_code,
    frequency: intent.frequency,
    transaction_id: intent.transaction_id,
    last_payment_error: intent.last_payment_error,
    subscription: subscription
      ? {
          plan_code: subscription.plan_code,
          status: subscription.status,
          starts_at: subscription.starts_at,
          expires_at: subscription.expires_at,
          frequency: subscription.frequency,
          amount: subscription.amount,
        }
      : null,
  });
});