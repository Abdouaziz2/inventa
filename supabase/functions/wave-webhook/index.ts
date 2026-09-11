import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyWaveSignature } from "../../../src/lib/wave.ts";
import {
  corsHeaders,
  createAdminClient,
  fetchIntentByReference,
  json,
  recordFailedPayment,
  recordSuccessfulPayment,
  type AdminClient,
  type IntentRow,
} from "../_shared/wave.ts";

function paymentErrorText(data: Record<string, unknown>): string {
  const error = data.payment_error ?? data.error;
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message ?? (error as Record<string, unknown>).reason;
    if (message) return String(message).slice(0, 500);
  }
  return String(data.payment_status ?? "paiement refusé").slice(0, 500);
}

async function handleCompleted(admin: AdminClient, data: Record<string, unknown>) {
  const waveSessionId = String(data.id ?? "");
  const clientReference = String(data.client_reference ?? "");
  if (!waveSessionId && !clientReference) {
    return json({ received: true, ignored: "missing_session_data" }, 200);
  }

  const { data: intent, error } = await fetchIntentByReference(admin, clientReference, waveSessionId);
  if (error) {
    console.error("Intent lookup failed:", error);
    return json({ received: true, ok: true, ignored: "lookup_error" }, 200);
  }
  if (!intent) return json({ received: true, ok: true, ignored: "unknown_intent" }, 200);

  const result = await recordSuccessfulPayment({
    admin,
    intent: intent as IntentRow,
    waveSessionId,
    transactionId: data.transaction_id ? String(data.transaction_id) : null,
    eventId: `completed-${waveSessionId}`,
    paidAt: String(data.when_completed ?? new Date().toISOString()),
    amount: Number(data.amount),
    currency: String(data.currency ?? ""),
  });

  if (result.kind === "amount_mismatch") {
    console.error(`Montant incohérent pour ${waveSessionId} : ${result.reason}`);
    return json({ received: true, ok: true, activated: false, reason: result.reason }, 200);
  }

  return json(
    {
      received: true,
      ok: true,
      activated: result.kind === "activated",
      duplicate: result.kind === "duplicate",
    },
    200,
  );
}

async function handleFailed(admin: AdminClient, data: Record<string, unknown>) {
  const waveSessionId = String(data.id ?? "");
  const clientReference = String(data.client_reference ?? "");
  if (!waveSessionId && !clientReference) {
    return json({ received: true, ignored: "missing_session_data" }, 200);
  }

  const { data: intent, error } = await fetchIntentByReference(admin, clientReference, waveSessionId);
  if (error) {
    console.error("Intent lookup failed:", error);
    return json({ received: true, ok: true, ignored: "lookup_error" }, 200);
  }
  if (!intent) return json({ received: true, ok: true, ignored: "unknown_intent" }, 200);

  await recordFailedPayment({
    admin,
    intent: intent as IntentRow,
    waveSessionId,
    eventId: `failed-${waveSessionId}`,
    error: paymentErrorText(data),
  });

  return json({ received: true, ok: true, activated: false }, 200);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const admin = createAdminClient();
  if (!admin) return json({ error: "Service indisponible." }, 503);

  const webhookSecret = Deno.env.get("WAVE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("WAVE_WEBHOOK_SECRET is not configured; refusing webhook.");
    return json({ error: "Configuration du webhook incomplète." }, 500);
  }

  const rawBody = await request.text();

  const verification = await verifyWaveSignature({
    header: request.headers.get("Wave-Signature"),
    rawBody,
    secret: webhookSecret,
  });
  if (!verification.valid) {
    console.warn(`Webhook rejeté : ${verification.reason}`);
    return json({ received: false, reason: verification.reason }, 400);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ received: false, reason: "invalid_json" }, 400);
  }

  const eventType = String(payload.event_type ?? payload.event ?? payload.type ?? "");
  const data = (payload.data ?? {}) as Record<string, unknown>;

  if (eventType === "test.test_event") {
    return json({ received: true, ok: true }, 200);
  }

  if (eventType === "checkout.session.payment_failed") {
    return await handleFailed(admin, data);
  }

  if (eventType === "checkout.session.completed") {
    return await handleCompleted(admin, data);
  }

  return json({ received: true, ignored: `unsupported_event:${eventType}` }, 200);
});