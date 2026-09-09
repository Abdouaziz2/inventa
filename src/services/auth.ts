import { supabase } from '@/lib/supabase';
import type { AppUser, SubscriptionStatus } from '@/types/api';
import { clearDemoSession, getDemoSession, signInDemo } from '@/lib/demo';
import { normalizeBusinessType, type BusinessType } from '@/lib/business';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: AppUser['role'];
  company_id: string | null;
};

type SubscriptionRow = {
  plan_code: string;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string | null;
};

function normalizeRole(role: ProfileRow['role']): AppUser['role'] {
  return role;
}

function subscriptionIsActive(subscription: SubscriptionRow | null) {
  if (!subscription || !['trialing', 'active'].includes(subscription.status)) {
    return false;
  }

  return !subscription.expires_at || new Date(subscription.expires_at).getTime() > Date.now();
}

function mapProfileToUser(profile: ProfileRow, subscription: SubscriptionRow | null): AppUser {
  return {
    id: profile.id,
    email: profile.email,
    username: null,
    fullName: profile.full_name,
    role: normalizeRole(profile.role),
    companyId: profile.company_id,
    businessType: 'jewelry',
    subscription: subscription
      ? {
          planCode: subscription.plan_code,
          status: subscription.status,
          startsAt: subscription.starts_at,
          expiresAt: subscription.expires_at,
        }
      : null,
    hasActiveSubscription:
      profile.role === 'super_admin' || subscriptionIsActive(subscription),
  };
}

async function addCompanyContext(user: AppUser): Promise<AppUser> {
  if (!user.companyId) return user;
  const { data, error } = await supabase
    .from('companies')
    .select('name, business_type')
    .eq('id', user.companyId)
    .maybeSingle();

  // The fallback keeps existing installations usable until the local migration is applied.
  if (error || !data) return user;
  return {
    ...user,
    businessName: String(data.name ?? ''),
    businessType: normalizeBusinessType((data as { business_type?: BusinessType }).business_type),
  };
}

async function ensureCurrentProfileRow(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as ProfileRow;

  const fullName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? '',
      full_name: fullName,
    })
    .select('id, email, full_name, role, company_id')
    .single();

  if (insertError) throw insertError;

  return inserted as ProfileRow;
}

export async function getCurrentProfile() {
  const demo = getDemoSession();
  if (demo) return demo;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return null;

  const profile = await ensureCurrentProfileRow(user);
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('plan_code, status, starts_at, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;

  return addCompanyContext(mapProfileToUser(profile, subscription as SubscriptionRow | null));
}

export async function signInWithPassword(email: string, password: string) {
  const demo = signInDemo(email, password);
  if (demo) return demo;
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return getCurrentProfile();
}

export async function signOutCurrentUser() {
  const wasDemo = !!getDemoSession();
  clearDemoSession();
  if (wasDemo) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const redirectTo =
    typeof window !== 'undefined' && /^https?:$/u.test(window.location.protocol)
      ? `${window.location.origin}/reset-password`
      : 'https://inventa.bayecode.com/reset-password';

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });

  if (error) throw error;
}

export async function updateCurrentPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
