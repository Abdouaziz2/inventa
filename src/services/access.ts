import { supabase } from '@/lib/supabase';

const DESKTOP_DOWNLOAD_URL =
  'https://github.com/Abdouaziz2/inventa/releases/download/v1.0.2/Inventa-Setup-1.0.2.exe';

export type AccessRequestInput = {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
  website?: string;
};

export async function requestAccess(input: AccessRequestInput) {
  if (input.website?.trim()) {
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    return null;
  }

  const lastRequestAt = Number(window.localStorage.getItem('inventa-access-request-at') ?? 0);
  if (Date.now() - lastRequestAt < 60_000) {
    throw new Error('Veuillez patienter une minute avant de renvoyer une demande.');
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
        company_name: input.companyName.trim(),
        business_type: 'jewelry',
      },
    },
  });

  if (error) {
    const errorMsg = (error.message || '').toLowerCase();
    if (
      errorMsg.includes('already registered') ||
      errorMsg.includes('already exists') ||
      errorMsg.includes('user already exists') ||
      (error as { code?: string }).code === 'user_already_exists'
    ) {
      throw new Error('Un compte existe déjà avec cette adresse email. Veuillez vous connecter.');
    }
    throw error;
  }

  // Détection anti-doublon Supabase
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Un compte existe déjà avec cette adresse email. Veuillez vous connecter.');
  }

  window.localStorage.setItem('inventa-access-request-at', String(Date.now()));

  const { error: notificationError } = await supabase.functions.invoke('access-requests', {
    body: {
      action: 'notify',
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      companyName: input.companyName.trim(),
    },
  });

  if (notificationError) {
    console.warn('Access request email notification failed:', notificationError);
  }

  return data;
}

export async function getDesktopDownloadUrl() {
  const configuredUrl = import.meta.env.VITE_DESKTOP_DOWNLOAD_URL;
  if (configuredUrl) return configuredUrl as string;

  return DESKTOP_DOWNLOAD_URL;
}
