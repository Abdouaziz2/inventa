import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Tables whose FK to profiles (created_by) is ON DELETE RESTRICT: deleting the
// Auth user cascades to the profile, and PostgreSQL refuses when business
// records still reference it. These are checked before attempting deletion so
// the admin gets a clear 409 instead of a raw database error.
const BLOCKING_TABLES: { table: string; label: string }[] = [
  { table: 'sales', label: 'ventes' },
  { table: 'payments', label: 'paiements' },
  { table: 'reservations', label: 'réservations' },
  { table: 'deposits', label: 'acomptes' },
  { table: 'stock_movements', label: 'mouvements de stock' },
  { table: 'customer_orders', label: 'commandes clients' },
  { table: 'buybacks', label: 'rachats' },
  { table: 'sale_returns', label: 'retours de vente' },
  { table: 'document_verifications', label: 'vérifications de documents' },
];

async function findBlockingData(adminClient: SupabaseClient, userId: string) {
  const blocked: { table: string; label: string; count: number }[] = [];
  for (const { table, label } of BLOCKING_TABLES) {
    const { count, error } = await adminClient
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId);
    if (!error && count) blocked.push({ table, label, count });
  }
  return blocked;
}

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

  const blocked = await findBlockingData(adminClient, targetUserId);
  if (blocked.length > 0) {
    const details = blocked.map((b) => `${b.label} (${b.count})`).join(', ');
    return json(
      {
        error:
          `Suppression impossible : ce compte possède encore des données métier protégées en base (${details}). ` +
          "Supprimez ou réassociez ces enregistrements avant de supprimer le compte, ou désactivez l'accès de l'utilisateur à la place.",
        code: 'USER_HAS_BUSINESS_DATA',
        blocked,
      },
      409,
    );
  }

  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (deleteAuthError) {
    if (deleteAuthError.status === 404) {
      return json({ error: 'Utilisateur introuvable dans Auth.', code: 'AUTH_USER_NOT_FOUND' }, 404);
    }
    return json(
      { error: `Échec de la suppression du compte Auth : ${deleteAuthError.message}`, code: 'AUTH_DELETE_FAILED' },
      502,
    );
  }

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
