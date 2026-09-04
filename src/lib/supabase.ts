import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create a placeholder client if env vars are missing (allows landing page to render)
const defaultUrl = 'https://placeholder.supabase.co';
const defaultKey = 'placeholder_key_for_development';

export const supabase = createClient(
  supabaseUrl || defaultUrl,
  supabasePublishableKey || defaultKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Export flag to check if env vars are properly configured
export const hasSupabaseEnv = !!(supabaseUrl && supabasePublishableKey);
