import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createAdminClient, authenticateRequest, fetchPlanCatalogue, json, type AdminClient } from "../_shared/wave.ts";

const CODE_RE = /^[a-z][a-z0-9_]{1,31}$/u;
const VALID_FREQUENCIES = ["monthly", "yearly"];
const MAX_AMOUNT = 100_000_000;

async function isSuperAdmin(admin: AdminClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "super_admin" && data.is_active !== false;
}

async function listData(admin: AdminClient) {
  const catalogue = await fetchPlanCatalogue(admin);
  const { data: settings } = await admin
    .from("subscription_settings")
    .select("trial_enabled, trial_duration_days, currency, updated_at, updated_by")
    .eq("id", true)
    .maybeSingle();
  return { success: true, catalogue, settings: settings ?? null };
}

function invalid(message: string) {
  return json({ error: message }, 400);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createAdminClient();
  if (!admin) return json({ error: "Service indisponible." }, 503);

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  if (!(await isSuperAdmin(admin, auth.user.id))) {
    return json({ error: "Accès réservé au super administrateur." }, 403);
  }

  if (request.method === "GET") {
    try {
      return json(await listData(admin));
    } catch (error) {
      return json({ error: "Impossible de charger les plans." }, 500);
    }
  }
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }

  const action = String(payload.action ?? "");

  if (action === "list") {
    try {
      return json(await listData(admin));
    } catch (error) {
      return json({ error: "Impossible de charger les plans." }, 500);
    }
  }

  if (action === "saveSettings") {
    const settings = payload.settings as Record<string, unknown> | undefined;
    if (!settings) return invalid("Réglages manquants.");

    const trialEnabled = settings.trialEnabled ?? settings.trial_enabled;
    const trialDurationDays = Number(settings.trialDurationDays ?? settings.trial_duration_days);
    const currency = String(settings.currency ?? "XOF").trim().toUpperCase();

    if (typeof trialEnabled !== "boolean") return invalid("Trial invalide.");
    if (!Number.isInteger(trialDurationDays) || trialDurationDays < 1 || trialDurationDays > 90) {
      return invalid("Durée d'essai invalide (1 à 90 jours).");
    }
    if (currency !== "XOF") return invalid("Seule la devise XOF est prise en charge par le paiement Wave.");

    const { error } = await admin
      .from("subscription_settings")
      .update({
        trial_enabled: trialEnabled,
        trial_duration_days: trialDurationDays,
        currency,
        updated_by: auth.user.id,
      })
      .eq("id", true);
    if (error) return json({ error: "Impossible d'enregistrer les réglages." }, 500);

    try {
      return json(await listData(admin));
    } catch (error) {
      return json({ success: true }, 200);
    }
  }

  if (action === "savePlan") {
    const plan = payload.plan as Record<string, unknown> | undefined;
    if (!plan) return invalid("Plan manquant.");

    const code = String(plan.code ?? "").trim();
    const name = String(plan.name ?? "").trim();
    const description = plan.description == null ? null : String(plan.description).slice(0, 500);
    const active = plan.active !== false;
    const recommended = plan.recommended === true;
    const displayOrder = Number(plan.displayOrder ?? plan.display_order ?? 0);
    const prices = Array.isArray(plan.prices) ? plan.prices : [];

    if (!CODE_RE.test(code)) return invalid("Code de plan invalide.");
    if (name.length === 0) return invalid("Nom de plan requis.");
    if (!Number.isInteger(displayOrder)) return invalid("Ordre d'affichage invalide.");

    for (const row of prices) {
      const price = row as Record<string, unknown>;
      if (!VALID_FREQUENCIES.includes(String(price.frequency))) {
        return invalid("Fréquence de tarif invalide.");
      }
      const amount = Number(price.amount);
      if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) {
        return invalid("Montant de tarif invalide.");
      }
      const currency = price.currency == null ? "XOF" : String(price.currency).trim().toUpperCase();
      if (currency.length < 2 || currency.length > 8) return invalid("Devise de tarif invalide.");
    }

    const { data: savedPlan, error: planError } = await admin
      .from("subscription_plans")
      .upsert(
        { code, name, description, active, recommended, display_order: displayOrder },
        { onConflict: "code" },
      )
      .select("id, code")
      .single();
    if (planError || !savedPlan) return json({ error: "Impossible d'enregistrer le plan." }, 500);

    for (const row of prices) {
      const price = row as Record<string, unknown>;
      const amount = Math.round(Number(price.amount));
      const currency = price.currency == null ? "XOF" : String(price.currency).trim().toUpperCase();
      const { error: priceError } = await admin
        .from("subscription_plan_prices")
        .upsert(
          {
            plan_id: savedPlan.id,
            frequency: String(price.frequency),
            amount,
            currency,
            active: price.active !== false,
          },
          { onConflict: "plan_id,frequency" },
        );
      if (priceError) return json({ error: "Impossible d'enregistrer les tarifs." }, 500);
    }

    try {
      return json(await listData(admin));
    } catch (error) {
      return json({ success: true }, 200);
    }
  }

  if (action === "deletePlan") {
    const code = String(payload.code ?? "").trim();
    if (!CODE_RE.test(code)) return invalid("Code de plan invalide.");

    const { data: used } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("plan_code", code)
      .limit(1);
    if (used && used.length > 0) {
      return json({ error: "Ce plan est déjà associé à des abonnements, il ne peut pas être supprimé." }, 400);
    }

    const { error } = await admin.from("subscription_plans").delete().eq("code", code);
    if (error) return json({ error: "Impossible de supprimer le plan." }, 500);

    try {
      return json(await listData(admin));
    } catch (error) {
      return json({ success: true }, 200);
    }
  }

  return invalid("Action inconnue.");
});