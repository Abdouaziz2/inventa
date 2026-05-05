import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/types/api';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: AppUser['role'];
  company_id: string | null;
};

export type RegisterInput = {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
};

function mapProfileToUser(profile: ProfileRow): AppUser {
  return {
    id: profile.id,
    email: profile.email,
    username: null,
    fullName: profile.full_name,
    role: profile.role,
    mustChangePassword: false,
    companyId: profile.company_id,
  };
}

export async function getCurrentProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, company_id')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  return mapProfileToUser(data as ProfileRow);
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return getCurrentProfile();
}

export async function signUpWithPassword(input: RegisterInput) {
  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo,
      data: {
        full_name: input.fullName,
        company_name: input.companyName,
      },
    },
  });

  if (error) throw error;

  if (!data.session) {
    return {
      user: null,
      needsEmailConfirmation: true,
    };
  }

  return {
    user: await getCurrentProfile(),
    needsEmailConfirmation: false,
  };
}

export async function signOutCurrentUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updateCurrentPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;

  return getCurrentProfile();
}
