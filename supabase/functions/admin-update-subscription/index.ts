import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!accessToken) return json({ error: 'Authentification requise.' }, 401);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Configuration Supabase serveur incomplète.' }, 500);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sessionClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerError } = await sessionClient.auth.getUser(accessToken);
  if (callerError || !callerData.user) return json({ error: 'Session invalide.' }, 401);

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', callerData.user.id)
    .single();
  if (callerProfile?.role !== 'super_admin' || !callerProfile.is_active) {
    return json({ error: 'Accès réservé au super administrateur.' }, 403);
  }

    let payload: {
      userId?: string;
      status?: string;
      expiresAt?: string | null;
      renewFromCurrent?: boolean;
    };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Requête invalide.' }, 400);
  }

  const userId = String(payload.userId ?? '').trim();
  const allowedStatuses = ['trialing', 'active', 'past_due', 'suspended', 'canceled'];
  if (!userId || !allowedStatuses.includes(String(payload.status))) {
    return json({ error: 'Paramètres d’abonnement invalides.' }, 400);
  }
  if (userId === callerData.user.id) return json({ error: 'Vous ne pouvez pas modifier votre propre abonnement.' }, 400);

  const { data: targetProfile, error: targetError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (targetError || !targetProfile) return json({ error: 'Utilisateur introuvable.' }, 404);
  if (targetProfile.role === 'super_admin') return json({ error: 'Un super administrateur ne peut pas être modifié ici.' }, 400);

  const status = String(payload.status);
  let expiresAt = payload.expiresAt ?? null;
  let startsAt: string | undefined;
  if (status === 'active' && !payload.renewFromCurrent) {
    startsAt = new Date().toISOString();
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  const update = startsAt ? { status, starts_at: startsAt, expires_at: expiresAt } : { status, expires_at: expiresAt };
  const { error: updateError } = await adminClient
    .from('subscriptions')
    .update(update)
    .eq('user_id', userId);
  if (updateError) return json({ error: updateError.message }, 400);

  return json({ success: true, startsAt, expiresAt });
});
