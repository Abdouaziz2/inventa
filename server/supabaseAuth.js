import { ConflictError } from './errors.js';

function isConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabasePublicAuthKey() {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function requireConfig() {
  if (!isConfigured()) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour créer des utilisateurs Supabase.');
  }
}

function requirePasswordAuthConfig() {
  if (!process.env.SUPABASE_URL || !getSupabasePublicAuthKey()) {
    throw new Error('SUPABASE_URL et SUPABASE_ANON_KEY sont requis pour connecter les utilisateurs Supabase.');
  }
}

async function requestSupabaseAuth(path, options = {}) {
  requireConfig();
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || 'Erreur Supabase Auth';
    if (response.status === 422 || response.status === 409 || /already|registered|exists/i.test(message)) {
      throw new ConflictError("Ce nom d'utilisateur existe déjà dans Supabase.");
    }
    throw new Error(message);
  }

  return payload;
}

export async function signInWithSupabasePassword({ email, password }) {
  requirePasswordAuthConfig();
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const publicAuthKey = getSupabasePublicAuthKey();

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: publicAuthKey,
      Authorization: `Bearer ${publicAuthKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || 'Identifiant ou mot de passe incorrect';
    throw new Error(message);
  }

  const user = payload?.user;
  if (!user?.id || !user?.email) {
    throw new Error("Supabase n'a pas retourné d'utilisateur valide.");
  }

  return user;
}

export async function createSupabaseAuthUser({ email, password, username, fullName, role }) {
  const user = await requestSupabaseAuth('/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: fullName,
      },
      app_metadata: {
        role,
      },
    }),
  });

  const authUserId = user?.id ?? user?.user?.id;
  if (!authUserId) {
    throw new Error("Supabase n'a pas retourné l'identifiant du nouvel utilisateur.");
  }

  return authUserId;
}

export async function updateSupabaseAuthPassword(authUserId, password) {
  if (!authUserId || !isConfigured()) return;

  await requestSupabaseAuth(`/admin/users/${authUserId}`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });
}

export async function deleteSupabaseAuthUser(authUserId) {
  if (!authUserId || !isConfigured()) return;

  await requestSupabaseAuth(`/admin/users/${authUserId}`, {
    method: 'DELETE',
  });
}
