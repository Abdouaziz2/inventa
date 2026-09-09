import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !authorization) {
    return json({ error: "Accès non autorisé." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const jwt = authorization.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = await admin.auth.getUser(jwt);

  if (authError || !authData.user) return json({ error: "Session invalide." }, 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (profile?.role !== "super_admin" || !profile.is_active) {
    return json({ error: "Action réservée au super-administrateur." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Données invalides." }, 400);
  }

  const fullName = String(payload.full_name ?? "").trim();
  const companyName = String(payload.company_name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");
  const activateNow = payload.activate_now !== false;
  const businessType = "jewelry";

  if (fullName.length < 2 || companyName.length < 2) {
    return json({ error: "Le nom et la bijouterie sont obligatoires." }, 400);
  }
  if (!email.includes("@")) return json({ error: "Adresse email invalide." }, 400);
  if (password.length < 8) {
    return json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, 400);
  }
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      company_name: companyName,
      business_type: businessType,
    },
  });

  if (createError || !created.user) {
    return json({ error: createError?.message ?? "Création impossible." }, 400);
  }

  if (activateNow) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error: subscriptionError } = await admin
      .from("subscriptions")
      .update({
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("user_id", created.user.id);

    if (subscriptionError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "Le compte n’a pas pu être activé." }, 500);
    }
  }

  return json({ user_id: created.user.id, email, active: activateNow, business_type: businessType }, 201);
});
