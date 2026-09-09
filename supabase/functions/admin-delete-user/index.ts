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
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Méthode non autorisée.' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  const accessToken = authorization?.replace(/^Bearer\s+/i, '');
  if (!accessToken) return json({ error: 'Authentification requise.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Configuration Supabase serveur incomplète.' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser(accessToken);
  if (callerError || !callerData.user) return json({ error: 'Session invalide.' }, 401);

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single();
  if (callerProfileError || callerProfile?.role !== 'super_admin') {
    return json({ error: 'Accès réservé au super administrateur.' }, 403);
  }

  let targetUserId: string;
  try {
    const payload = await request.json();
    targetUserId = String(payload.userId ?? '').trim();
  } catch {
    return json({ error: 'Requête invalide.' }, 400);
  }

  if (!targetUserId) return json({ error: 'Utilisateur requis.' }, 400);
  if (targetUserId === callerData.user.id) {
    return json({ error: 'Le super administrateur ne peut pas supprimer son propre compte.' }, 400);
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from('profiles')
    .select('id, role, company_id')
    .eq('id', targetUserId)
    .single();
  if (targetProfileError || !targetProfile) return json({ error: 'Utilisateur introuvable.' }, 404);
  if (targetProfile.role === 'super_admin') {
    return json({ error: 'Un compte super administrateur ne peut pas être supprimé ici.' }, 400);
  }

  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (deleteAuthError) return json({ error: deleteAuthError.message }, 400);

  if (targetProfile.company_id) {
    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', targetProfile.company_id);

    if (!count) {
      await adminClient.from('companies').delete().eq('id', targetProfile.company_id);
    }
  }

  return json({ success: true });
});
