import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  WAVE_CURRENCY,
  buildClientReference,
  isPlanFrequency,
  isWavePlanId,
  type PlanFrequency,
  type WavePlanId,
} from "../../../src/lib/wave.ts";
import {
  authenticateRequest,
  callWaveApi,
  corsHeaders,
  createAdminClient,
  fetchPlanAmount,
  json,
} from "../_shared/wave.ts";

const DEFAULT_APP_URL = "https://inventa.bayecode.com";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const admin = createAdminClient();
  if (!admin) return json({ error: "Service indisponible." }, 503);

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  let payload: { plan?: unknown; plan_code?: unknown; frequency?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }

  const plan: WavePlanId | null = isWavePlanId(payload.plan)
    ? payload.plan
    : isWavePlanId(payload.plan_code)
      ? payload.plan_code
      : null;
  const frequency: PlanFrequency | null = isPlanFrequency(payload.frequency)
    ? payload.frequency
    : null;
  if (!plan || !frequency) {
    return json({ error: "Plan ou fréquence invalide." }, 400);
  }

  let amount: number;
  let currency: string;
  try {
    const priced = await fetchPlanAmount(admin, plan, frequency);
    amount = priced.amount;
    currency = priced.currency;
  } catch {
    return json({ error: "Plan indisponible pour le paiement." }, 400);
  }
  if (currency !== WAVE_CURRENCY) {
    return json({ error: "Devise de facturation non prise en charge." }, 503);
  }

  const appUrl = String(Deno.env.get("APP_URL") || DEFAULT_APP_URL).replace(/\/+$/u, "");
  const clientReference = buildClientReference(auth.user.id);
  const successUrl = `${appUrl}/payment/success?ref=${encodeURIComponent(clientReference)}`;
  const errorUrl = `${appUrl}/payment/error?ref=${encodeURIComponent(clientReference)}`;

  const wave = await callWaveApi({
    method: "POST",
    path: "/checkout/sessions",
    body: {
      amount,
      currency: WAVE_CURRENCY,
      success_url: successUrl,
      error_url: errorUrl,
      client_reference: clientReference,
    },
  });

  if (!wave.ok) {
    console.error("Wave checkout creation failed:", wave.status, wave.data);
    const waveMessage =
      typeof wave.data?.message === "string"
        ? wave.data.message
        : typeof wave.data?.error === "string"
          ? wave.data.error
          : JSON.stringify(wave.data ?? {});
    return json(
      {
        error: waveMessage
          ? `Impossible de créer le paiement Wave (${wave.status}) : ${waveMessage}`
          : "Impossible de créer le paiement Wave.",
        detail: wave.status === 503 ? "wave_api_key_missing" : `wave_api_error_${wave.status}`,
        wave_status: wave.status,
        wave_message: waveMessage,
      },
      502,
    );
  }

  const waveSessionId = String(wave.data.id ?? "");
  if (!waveSessionId) {
    return json({ error: "Wave n’a pas retourné de session." }, 502);
  }

  const { error: insertError } = await admin.from("wave_checkout_sessions").insert({
    user_id: auth.user.id,
    plan_code: plan,
    frequency,
    amount,
    currency: WAVE_CURRENCY,
    wave_session_id: waveSessionId,
    client_reference: clientReference,
    checkout_status: String(wave.data.checkout_status ?? "open") || null,
    payment_status: String(wave.data.payment_status ?? "processing") || null,
  });
  if (insertError) {
    console.error("Intent insert failed:", insertError);
    return json({ error: "Impossible d’enregistrer le paiement." }, 500);
  }

  const launchUrl = String(wave.data.wave_launch_url ?? "");
  if (!launchUrl) {
    return json({ error: "Wave n’a pas retourné d’URL de paiement." }, 502);
  }

  return json({
    wave_launch_url: launchUrl,
    wave_session_id: waveSessionId,
    client_reference: clientReference,
    amount,
    currency: WAVE_CURRENCY,
  });
});